import streamlit as st
from supabase import create_client
import anthropic
import requests
import json
import re
import hashlib
import time
from datetime import datetime, date
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

# =========================
# CONFIG
# =========================
st.set_page_config(
    page_title="iMoney",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="collapsed"  # collapsed by default — better on mobile
)

# =========================
# SECRETS
# =========================
SUPABASE_URL = st.secrets["SUPABASE_URL"]
SUPABASE_KEY = st.secrets["SUPABASE_KEY"]
ANTHROPIC_KEY = st.secrets["ANTHROPIC_API_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
claude = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

# =========================
# SEGURANÇA — CONSTANTES
# =========================
MAX_RENDA = 10_000_000          # Limite máximo de renda (R$ 10M)
MAX_GASTO = 10_000_000          # Limite máximo de gasto
MAX_MSG_LEN = 2000              # Limite de caracteres por mensagem
MAX_MESSAGES = 50               # Máximo de mensagens por sessão
MAX_TRANSACTIONS = 500          # Máximo de transações por usuário
MAX_METAS = 20                  # Máximo de metas por usuário
MAX_LOGIN_ATTEMPTS = 5          # Tentativas de login antes de bloquear
LOGIN_BLOCK_SECONDS = 300       # 5 minutos de bloqueio
RATE_LIMIT_CHAT = 30            # Máximo de mensagens de chat por hora
ALLOWED_CATEGORIAS = ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Vestuário", "Outros"]
ALLOWED_TIPOS = ["gasto", "receita"]

# =========================
# SESSION INIT
# =========================
defaults = {
    "messages": [],
    "active_tab": "dashboard",
    "gastos_categorias": {},
    "metas": [],
    "user_id": None,
    "user_email": None,
}
for k, v in defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v

# =========================
# AUTH
# =========================
def get_user_id():
    # Verifica expiração de sessão (8 horas)
    login_time = st.session_state.get("login_time", 0)
    if login_time and time.time() - login_time > 28800:
        st.session_state["user_id"] = None
        st.session_state["user_email"] = None
        st.session_state["login_time"] = 0
        return None
    # Primeiro tenta session_state (mais confiável no Streamlit)
    if st.session_state.get("user_id"):
        return st.session_state["user_id"]
    # Fallback: tenta via supabase
    try:
        session = supabase.auth.get_session()
        if session and session.session:
            st.session_state["user_id"] = session.session.user.id
            st.session_state["user_email"] = session.session.user.email
            return session.session.user.id
    except:
        pass
    return None


def get_user_email():
    if st.session_state.get("user_email"):
        return st.session_state["user_email"]
    try:
        session = supabase.auth.get_session()
        if session and session.session:
            return session.session.user.email
    except:
        pass
    return None

# =========================
# SEGURANÇA — FUNÇÕES
# =========================

def sanitize_text(text: str, max_len: int = 500) -> str:
    """Remove caracteres perigosos e limita tamanho."""
    if not text:
        return ""
    text = str(text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text[:max_len].strip()

def is_valid_email(email: str) -> bool:
    """Validação robusta de email com regex."""
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, str(email).strip())) and len(email) <= 254


def is_valid_password(password: str) -> bool:
    """Senha: mínimo 6 chars (compatível com Supabase default)."""
    return len(password) >= 6


def is_valid_valor(valor) -> bool:
    """Valida se valor financeiro é seguro."""
    try:
        v = float(valor)
        return 0 <= v <= MAX_RENDA
    except:
        return False


def check_rate_limit_login(email: str) -> tuple[bool, int]:
    """Verifica se o email está bloqueado por tentativas excessivas."""
    key = f"login_attempts_{hashlib.md5(email.encode()).hexdigest()[:8]}"
    block_key = f"login_blocked_{hashlib.md5(email.encode()).hexdigest()[:8]}"

    if st.session_state.get(block_key, 0) > time.time():
        remaining = int(st.session_state[block_key] - time.time())
        return False, remaining

    attempts = st.session_state.get(key, 0)
    if attempts >= MAX_LOGIN_ATTEMPTS:
        st.session_state[block_key] = time.time() + LOGIN_BLOCK_SECONDS
        st.session_state[key] = 0
        return False, LOGIN_BLOCK_SECONDS

    return True, 0


def increment_login_attempts(email: str):
    """Incrementa contador de tentativas falhas."""
    key = f"login_attempts_{hashlib.md5(email.encode()).hexdigest()[:8]}"
    st.session_state[key] = st.session_state.get(key, 0) + 1


def reset_login_attempts(email: str):
    """Reseta contador após login bem-sucedido."""
    key = f"login_attempts_{hashlib.md5(email.encode()).hexdigest()[:8]}"
    st.session_state[key] = 0


def check_chat_rate_limit(user_id: str) -> bool:
    """Limita mensagens de chat por hora."""
    key = f"chat_count_{user_id}"
    key_time = f"chat_time_{user_id}"
    now = time.time()

    if now - st.session_state.get(key_time, 0) > 3600:
        st.session_state[key] = 0
        st.session_state[key_time] = now

    count = st.session_state.get(key, 0)
    if count >= RATE_LIMIT_CHAT:
        return False

    st.session_state[key] = count + 1
    return True


def verify_admin_session() -> bool:
    """Verifica se a sessão admin é válida e não expirou."""
    if not st.session_state.get("admin_auth"):
        return False
    # Sessão admin expira em 2 horas
    admin_time = st.session_state.get("admin_auth_time", 0)
    if time.time() - admin_time > 7200:
        st.session_state["admin_auth"] = False
        return False
    return True

# =========================
# DADOS ECONÔMICOS (AUTO-ATUALIZAÇÃO)
# =========================

# Cache com TTL de 4 horas — atualiza automaticamente
@st.cache_data(ttl=14400, show_spinner=False)
def get_dados_economicos():
    """
    Busca SELIC, IPCA e CDI do Banco Central do Brasil.
    Atualiza automaticamente a cada 4 horas.
    Retorna dict com todos os indicadores.
    """
    dados = {
        "selic_anual": 14.75,       # fallback (SELIC meta Copom, abril 2026)
        "selic_meta": 14.75,        # meta SELIC Copom (abril 2026)
        "ipca_mensal": 0.56,        # fallback (março 2026)
        "ipca_anual": 5.48,         # fallback (acumulado 12m março 2026)
        "cdi_anual": 14.75,         # fallback
        "ultima_atualizacao": "fallback",
        "fonte": "Banco Central do Brasil",
    }

    # 1. SELIC diária → anual
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json"
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        d = resp.json()
        daily = float(d[0]["valor"])
        dados["selic_anual"] = round(((1 + daily / 100) ** 252 - 1) * 100, 2)
        dados["cdi_anual"] = dados["selic_anual"]
        dados["ultima_atualizacao"] = d[0].get("data", "")
    except:
        pass

    # 2. Meta SELIC (série 432)
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json"
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        d = resp.json()
        dados["selic_meta"] = round(float(d[0]["valor"]), 2)
    except:
        pass

    # 3. IPCA mensal (série 433)
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json"
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        d = resp.json()
        dados["ipca_mensal"] = round(float(d[0]["valor"]), 2)
    except:
        pass

    # 4. IPCA acumulado 12 meses (série 13522)
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json"
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        d = resp.json()
        dados["ipca_anual"] = round(float(d[0]["valor"]), 2)
    except:
        pass

    return dados


def get_selic_annual():
    """Atalho para compatibilidade — retorna SELIC anual."""
    return get_dados_economicos()["selic_anual"]


def get_ipca():
    """Atalho para compatibilidade — retorna IPCA mensal."""
    return get_dados_economicos()["ipca_mensal"]


def get_juros_reais():
    """Calcula juro real: SELIC - IPCA anualizado."""
    d = get_dados_economicos()
    return round(d["selic_anual"] - d["ipca_anual"], 2)

# =========================
# DADOS DE ESTADOS E CIDADES BR
# =========================
ESTADOS_BR = {
    "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
    "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
    "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
    "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
    "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina",
    "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins"
}

CIDADES_BR = {
    "AC": ["Rio Branco","Cruzeiro do Sul","Sena Madureira","Tarauacá","Feijó"],
    "AL": ["Maceió","Arapiraca","Palmeira dos Índios","Rio Largo","Penedo"],
    "AP": ["Macapá","Santana","Laranjal do Jari","Oiapoque","Mazagão"],
    "AM": ["Manaus","Parintins","Itacoatiara","Manacapuru","Coari"],
    "BA": ["Salvador","Feira de Santana","Vitória da Conquista","Camaçari","Itabuna","Juazeiro","Ilhéus"],
    "CE": ["Fortaleza","Caucaia","Juazeiro do Norte","Maracanaú","Sobral","Crato","Itapipoca"],
    "DF": ["Brasília","Ceilândia","Taguatinga","Samambaia","Planaltina"],
    "ES": ["Vitória","Serra","Vila Velha","Cariacica","Cachoeiro de Itapemirim"],
    "GO": ["Goiânia","Aparecida de Goiânia","Anápolis","Rio Verde","Luziânia"],
    "MA": ["São Luís","Imperatriz","São José de Ribamar","Timon","Caxias"],
    "MT": ["Cuiabá","Várzea Grande","Rondonópolis","Sinop","Tangará da Serra"],
    "MS": ["Campo Grande","Dourados","Três Lagoas","Corumbá","Grande Dourados"],
    "MG": ["Belo Horizonte","Uberlândia","Contagem","Juiz de Fora","Betim","Montes Claros","Ribeirão das Neves","Uberaba"],
    "PA": ["Belém","Ananindeua","Santarém","Marabá","Castanhal","Parauapebas"],
    "PB": ["João Pessoa","Campina Grande","Santa Rita","Patos","Bayeux"],
    "PR": ["Curitiba","Londrina","Maringá","Ponta Grossa","Cascavel","São José dos Pinhais","Foz do Iguaçu"],
    "PE": ["Recife","Caruaru","Olinda","Petrolina","Paulista","Jaboatão dos Guararapes"],
    "PI": ["Teresina","Parnaíba","Picos","Piripiri","Floriano"],
    "RJ": ["Rio de Janeiro","São Gonçalo","Duque de Caxias","Nova Iguaçu","Niterói","Campos dos Goytacazes","Belford Roxo"],
    "RN": ["Natal","Mossoró","Parnamirim","São Gonçalo do Amarante","Macaíba"],
    "RS": ["Porto Alegre","Caxias do Sul","Pelotas","Canoas","Santa Maria","Gravataí","Viamão"],
    "RO": ["Porto Velho","Ji-Paraná","Ariquemes","Vilhena","Cacoal"],
    "RR": ["Boa Vista","Rorainópolis","Caracaraí","Alto Alegre","Mucajaí"],
    "SC": ["Florianópolis","Joinville","Blumenau","São José","Chapecó","Criciúma","Itajaí"],
    "SP": ["São Paulo","Guarulhos","Campinas","São Bernardo do Campo","Santo André","Osasco","Ribeirão Preto","Sorocaba","Mauá","Santos","São José dos Campos","Mogi das Cruzes","Bauru","Jundiaí"],
    "SE": ["Aracaju","Nossa Senhora do Socorro","Lagarto","Itabaiana","São Cristóvão"],
    "TO": ["Palmas","Araguaína","Gurupi","Porto Nacional","Paraíso do Tocantins"]
}

# =========================
# MEMÓRIA / BANCO
# =========================
def load_memory(user_id):
    try:
        res = supabase.table("user_memory").select("*").eq("user_id", user_id).execute()
        return res.data[0] if res.data else {}
    except:
        return {}


def save_memory(user_id, renda, gastos_total, gastos_cat: dict):
    if not user_id:
        return "inicial", 0
    try:
        sobra = renda - gastos_total
        memory = load_memory(user_id)
        prev_sobra = memory.get("avg_savings", 0) or 0
        avg = (prev_sobra + sobra) / 2
        trend = "melhorando" if sobra > prev_sobra else ("estável" if sobra == prev_sobra else "piorando")

        data = {
            "user_id": user_id,
            "last_renda": float(renda),
            "last_gastos": float(gastos_total),
            "avg_savings": float(avg),
            "trend": trend,
            "gastos_categorias": json.dumps(gastos_cat),
            "updated_at": datetime.utcnow().isoformat(),
        }
        supabase.table("user_memory").upsert(data).execute()
        return trend, avg
    except Exception as e:
        return "erro", 0


def load_perfil(user_id):
    """Carrega perfil do usuário (idade, filhos, localização)."""
    try:
        res = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        return res.data[0] if res.data else {}
    except:
        return {}


def save_perfil(user_id, idade, filhos, estado, cidade, ocupacao):
    """Salva/atualiza perfil do usuário."""
    if not user_id:
        return False
    try:
        data = {
            "user_id": str(user_id),
            "idade": int(idade) if idade and int(idade) > 0 else None,
            "filhos": int(filhos) if filhos is not None else 0,
            "estado": str(estado).strip()[:2] if estado else None,
            "cidade": str(cidade).strip()[:100] if cidade else None,
            "ocupacao": str(ocupacao).strip()[:100] if ocupacao else None,
            "updated_at": datetime.utcnow().isoformat(),
        }
        # Remove None values para não sobrescrever dados existentes
        data = {k: v for k, v in data.items() if v is not None or k in ["user_id", "filhos"]}
        result = supabase.table("user_profiles").upsert(data).execute()
        return True
    except Exception as e:
        return False


def load_transactions(user_id):
    try:
        res = supabase.table("transactions").select("*").eq("user_id", user_id).order("date", desc=True).limit(50).execute()
        return res.data or []
    except:
        return []


def save_transaction(user_id, descricao, valor, categoria, tipo):
    # Validações de segurança
    if not user_id:
        return False
    if not is_valid_valor(valor):
        st.error("Valor inválido.")
        return False
    if categoria not in ALLOWED_CATEGORIAS:
        st.error("Categoria inválida.")
        return False
    if tipo not in ALLOWED_TIPOS:
        st.error("Tipo inválido.")
        return False

    # Sanitiza inputs de texto
    descricao_clean = sanitize_text(descricao, max_len=200)
    if not descricao_clean:
        st.error("Descrição inválida.")
        return False

    # Verifica limite de transações
    try:
        count = supabase.table("transactions").select("id", count="exact").eq("user_id", user_id).execute()
        if count.count and count.count >= MAX_TRANSACTIONS:
            st.error("Limite máximo de transações atingido.")
            return False
    except:
        pass

    try:
        supabase.table("transactions").insert({
            "user_id": str(user_id),
            "descricao": descricao_clean,
            "valor": round(float(valor), 2),
            "categoria": categoria,
            "tipo": tipo,
            "date": date.today().isoformat(),
        }).execute()
        return True
    except Exception as e:
        st.error("Erro ao salvar transação.")
        return False


def load_metas(user_id):
    try:
        res = supabase.table("metas").select("*").eq("user_id", user_id).execute()
        return res.data or []
    except:
        return []


def save_meta(user_id, nome, valor_alvo, prazo_meses):
    if not user_id:
        return False

    # Validações
    nome_clean = sanitize_text(nome, max_len=100)
    if not nome_clean:
        st.error("Nome da meta inválido.")
        return False
    if not is_valid_valor(valor_alvo):
        st.error("Valor alvo inválido.")
        return False
    try:
        prazo = int(prazo_meses)
        if prazo < 1 or prazo > 600:
            raise ValueError
    except:
        st.error("Prazo inválido.")
        return False

    # Verifica limite de metas
    try:
        count = supabase.table("metas").select("id", count="exact").eq("user_id", user_id).execute()
        if count.count and count.count >= MAX_METAS:
            st.error("Limite máximo de metas atingido.")
            return False
    except:
        pass

    try:
        supabase.table("metas").insert({
            "user_id": str(user_id),
            "nome": nome_clean,
            "valor_alvo": round(float(valor_alvo), 2),
            "valor_atual": 0.0,
            "prazo_meses": prazo,
            "criada_em": date.today().isoformat(),
        }).execute()
        return True
    except Exception as e:
        st.error("Erro ao salvar meta.")
        return False

# =========================
# ENGINE FINANCEIRO
# =========================
def classify_user(renda, gastos):
    taxa = (gastos / renda) if renda > 0 else 1
    if taxa > 0.9:   return "🔴 Sobrevivência"
    elif taxa > 0.75: return "🟠 Instável"
    elif taxa > 0.6:  return "🟡 Equilibrado"
    else:             return "🟢 Crescimento"


def financial_score(renda, gastos, trend):
    taxa = (gastos / renda) if renda > 0 else 1
    sobra = renda - gastos
    score = 100 - (taxa * 70)
    if sobra > 0:
        score += min((sobra / renda) * 30, 20)
    score += {"melhorando": 10, "piorando": -15, "estável": 0, "inicial": 0, "erro": 0}.get(trend, 0)
    return max(0, min(100, int(score)))


def calcular_projecao(sobra_mensal, meses, selic_anual):
    selic_mensal = (1 + selic_anual / 100) ** (1/12) - 1
    total = 0
    for _ in range(meses):
        total = (total + sobra_mensal) * (1 + selic_mensal)
    return round(total, 2)

# =========================
# AGENTES CLAUDE
# =========================
CATEGORIAS = ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Vestuário", "Outros"]

def agente_diagnostico(renda, gastos_cat, selic, ipca, trend, score, metas):
    sobra = renda - sum(gastos_cat.values())
    metas_str = "\n".join([f"- {m['nome']}: R${m['valor_alvo']} em {m['prazo_meses']} meses" for m in metas]) or "Nenhuma meta cadastrada"

    prompt = f"""Você é um assessor financeiro sênior brasileiro. Faça um diagnóstico COMPLETO e ESTRATÉGICO.

DADOS ECONÔMICOS:
- SELIC: {selic}% a.a.
- IPCA: {ipca}% a.m.

SITUAÇÃO DO CLIENTE:
- Renda: R$ {renda:,.2f}
- Gastos por categoria: {json.dumps(gastos_cat, ensure_ascii=False)}
- Sobra mensal: R$ {sobra:,.2f}
- Score financeiro: {score}/100
- Tendência: {trend}

METAS:
{metas_str}

Forneça:
1. **Diagnóstico** (2-3 frases diretas sobre a situação real)
2. **Principais riscos** (top 3, com impacto estimado)
3. **Oportunidades imediatas** (top 3 ações nos próximos 30 dias)
4. **Estratégia de investimento** adequada ao perfil e momento da SELIC
5. **Projeção realista** em 12 meses se seguir as recomendações

Seja direto, prático e use números reais. Português do Brasil."""

    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text


def agente_chat(historico, renda, gastos_total, sobra, selic, ipca, score, trend, perfil, gastos_cat, metas, tipo_renda='Salário fixo', perfil_usuario=None):
    system = f"""Você é o iMoney, o assessor financeiro pessoal mais avançado do Brasil. 
Você combina análise quantitativa rigorosa com linguagem humana e empática.

CONTEXTO DO USUÁRIO (ATUALIZADO):
- Tipo de renda: {tipo_renda}
- Renda mensal (média): R$ {renda:,.2f}
- Gastos totais: R$ {gastos_total:,.2f}  
- Sobra mensal: R$ {sobra:,.2f}
- Score financeiro: {score}/100
- Perfil: {perfil}
- Tendência: {trend}
- Gastos por categoria: {json.dumps(gastos_cat, ensure_ascii=False)}
- Metas: {json.dumps(metas, ensure_ascii=False)}
- Perfil pessoal: {json.dumps(perfil_usuario or {}, ensure_ascii=False)}

CENÁRIO MACROECONÔMICO:
- SELIC: {selic}% a.a.
- IPCA: {ipca}% a.m.
- Juros reais: {round(selic - (ipca * 12), 2)}% a.a.

CAPACIDADES:
- Você pode calcular projeções, simular cenários, comparar investimentos
- Você conhece todos os produtos financeiros brasileiros (Tesouro, CDB, LCI, LCA, FIIs, ações, etc.)
- Você entende tributação (IR, IOF), PGBL/VGBL, previdência privada
- Você pode sugerir estratégias de corte de gastos por categoria

Responda sempre em português, seja direto e use dados concretos. Quando relevante, use emojis para facilitar a leitura.
Se o usuário tem renda variável ou mista, adapte seus conselhos:
- Priorize a construção de reserva de emergência (6 meses de gastos)
- Sugira o método do "cofre mensal": guardar % fixa de cada recebimento
- Evite sugerir investimentos de longo prazo sem reserva estabelecida
- Considere sazonalidade e meses fracos no planejamento"""

    msgs = [{"role": m["role"], "content": m["content"]} for m in historico]

    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=system,
        messages=msgs
    )
    return response.content[0].text


def agente_analise_gasto(descricao, valor, renda):
    prompt = f"""Categorize e analise este gasto financeiro de um brasileiro.

Gasto: {descricao} - R$ {valor:,.2f}
Renda mensal do usuário: R$ {renda:,.2f}

Responda SOMENTE com JSON válido:
{{
  "categoria": "<uma das: Moradia, Alimentação, Transporte, Saúde, Educação, Lazer, Vestuário, Outros>",
  "essencial": <true/false>,
  "percentual_renda": <número>,
  "avaliacao": "<OK, Alto, Muito Alto ou Baixo>",
  "dica": "<dica curta de até 15 palavras>"
}}"""

    response = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    try:
        text = response.content[0].text.strip()
        # Remove markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except:
        return {"categoria": "Outros", "essencial": False, "percentual_renda": 0, "avaliacao": "OK", "dica": ""}

# =========================
# CSS CUSTOM — RESPONSIVO
# =========================
def inject_css():
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');

    /* ── BASE ── */
    html, body, [class*="css"] {
        font-family: 'DM Sans', sans-serif;
        -webkit-text-size-adjust: 100%;
    }
    h1, h2, h3 { font-family: 'Syne', sans-serif; }

    /* ── LAYOUT PRINCIPAL ── */
    .main .block-container {
        padding: 1rem 1rem 3rem !important;
        max-width: 100% !important;
    }

    /* ── METRIC CARDS ── */
    .metric-card {
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        border: 1px solid #374151;
        border-radius: 14px;
        padding: 1rem 1.1rem 0.9rem;
        margin-bottom: 0.75rem;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
        width: 100%;
    }
    .metric-card h3 {
        color: #9ca3af;
        font-size: 0.68rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin: 0 0 0.4rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .metric-card .value {
        font-family: 'Syne', sans-serif;
        font-size: clamp(1.1rem, 2.5vw, 1.6rem);
        font-weight: 800;
        color: #f9fafb;
        line-height: 1.2;
        word-break: break-word;
    }
    .metric-card .sub {
        font-size: 0.7rem;
        color: #6b9e80;
        margin-top: 0.3rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* ── SCORE RING ── */
    .score-ring {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: #111827;
        border-radius: 14px;
        padding: 0.9rem 1.2rem;
        border: 1px solid #374151;
        flex-wrap: wrap;
    }
    .score-number {
        font-family: 'Syne', sans-serif;
        font-size: clamp(2rem, 6vw, 3rem);
        font-weight: 800;
    }

    /* ── BOTÕES ── */
    .stButton > button {
        background: linear-gradient(135deg, #1d4ed8, #7c3aed);
        color: white !important;
        border: none !important;
        border-radius: 10px;
        font-family: 'Syne', sans-serif;
        font-weight: 700;
        transition: all 0.2s;
        width: 100%;
        min-height: 44px;
        font-size: clamp(0.82rem, 2vw, 0.95rem) !important;
        padding: 0.6rem 1rem !important;
        white-space: normal !important;
        word-break: break-word !important;
    }
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(29,78,216,0.4);
    }

    /* ── TABS ── */
    div[data-testid="stTabs"] button {
        font-size: clamp(0.7rem, 2vw, 0.85rem) !important;
        padding: 0.5rem 0.6rem !important;
        white-space: nowrap;
    }
    div[data-testid="stTabs"] [role="tablist"] {
        flex-wrap: wrap;
        gap: 2px;
    }

    /* ── SIDEBAR ── */
    div[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #07130d 0%, #0a1f12 40%, #0f2d1a 100%) !important;
        border-right: 1px solid rgba(26,158,92,0.25) !important;
        min-width: 220px !important;
    }
    div[data-testid="stSidebar"] > div {
        padding-top: 1rem !important;
    }
    div[data-testid="stSidebar"] label,
    div[data-testid="stSidebar"] p,
    div[data-testid="stSidebar"] span {
        color: #e8f5ee !important;
        font-size: clamp(0.78rem, 2vw, 0.9rem) !important;
    }
    div[data-testid="stSidebar"] h1,
    div[data-testid="stSidebar"] h2,
    div[data-testid="stSidebar"] h3 {
        color: #f0b429 !important;
        font-size: clamp(0.85rem, 2.5vw, 1rem) !important;
    }
    div[data-testid="stSidebar"] input {
        background: rgba(15,45,26,0.8) !important;
        border: 1px solid rgba(26,158,92,0.3) !important;
        color: #e8f5ee !important;
        border-radius: 8px !important;
        font-size: 0.9rem !important;
        min-height: 40px !important;
    }
    div[data-testid="stSidebar"] .stButton > button {
        background: linear-gradient(135deg, #1a9e5c, #34c17a) !important;
        min-height: 40px !important;
    }
    div[data-testid="stSidebar"] hr {
        border-color: rgba(26,158,92,0.2) !important;
    }
    div[data-testid="stSidebar"] [data-testid="stNumberInput"] input {
        font-size: 0.9rem !important;
    }

    /* ── INPUTS GERAIS ── */
    input, textarea, select {
        font-size: 16px !important;
    }
    div[data-testid="stTextInput"] input,
    div[data-testid="stNumberInput"] input {
        min-height: 44px !important;
        font-size: 16px !important;
    }

    /* ── CHAT ── */
    div[data-testid="stChatMessage"] {
        width: 100% !important;
        max-width: 100% !important;
    }
    div[data-testid="stChatMessage"] p,
    div[data-testid="stChatMessage"] li,
    div[data-testid="stChatMessage"] td {
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        white-space: normal !important;
        font-size: clamp(0.82rem, 2vw, 0.95rem) !important;
    }
    div[data-testid="stChatMessage"] table {
        width: 100% !important;
        table-layout: auto !important;
        display: block !important;
        overflow-x: auto !important;
        font-size: 0.82rem !important;
    }
    div[data-testid="stChatInput"] textarea {
        font-size: 16px !important;
        min-height: 44px !important;
    }

    /* ── DATAFRAMES ── */
    div[data-testid="stDataFrame"] {
        overflow-x: auto !important;
        width: 100% !important;
    }
    div[data-testid="stDataFrame"] table {
        font-size: clamp(0.7rem, 1.8vw, 0.85rem) !important;
    }

    /* ── PLOTLY ── */
    div[data-testid="stPlotlyChart"] {
        overflow-x: auto !important;
        width: 100% !important;
    }

    /* ── COLUNAS — stack em mobile ── */
    @media (max-width: 640px) {
        .main .block-container {
            padding: 0.5rem 0.5rem 4rem !important;
        }
        .metric-card {
            min-height: 80px;
            padding: 0.8rem 1rem;
        }
        .metric-card .value {
            font-size: 1.2rem;
        }
        .score-ring {
            padding: 0.75rem 1rem;
        }
        div[data-testid="stTabs"] button {
            font-size: 0.65rem !important;
            padding: 0.4rem 0.4rem !important;
        }
        /* Força colunas a stackar em mobile */
        div[data-testid="column"] {
            width: 100% !important;
            flex: 1 1 100% !important;
            min-width: 0 !important;
        }
        /* Headers menores */
        h1 { font-size: 1.4rem !important; }
        h2 { font-size: 1.2rem !important; }
        h3 { font-size: 1rem !important; }
        /* Tabelas com scroll */
        table { display: block !important; overflow-x: auto !important; }
        /* Banner de indicadores — 2 por linha em mobile */
        .eco-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }

    /* ── TABLET (641px - 1024px) ── */
    @media (min-width: 641px) and (max-width: 1024px) {
        .main .block-container {
            padding: 1rem 1rem 3rem !important;
        }
        .metric-card .value {
            font-size: 1.3rem;
        }
        div[data-testid="stTabs"] button {
            font-size: 0.75rem !important;
        }
    }

    /* ── GERAL overflow ── */
    div[data-testid="stVerticalBlock"],
    div[data-testid="stHorizontalBlock"] {
        max-width: 100% !important;
        overflow-x: hidden !important;
    }
    * { box-sizing: border-box; }

    </style>
    """, unsafe_allow_html=True)

# =========================
# COMPONENTES UI
# =========================
def metric_card(label, value, sub=""):
    st.markdown(f"""
    <div class="metric-card">
        <h3>{label}</h3>
        <div class="value">{value}</div>
        {"<div class='sub'>" + sub + "</div>" if sub else ""}
    </div>""", unsafe_allow_html=True)


def score_card(score, perfil, trend):
    cor = "#10b981" if score >= 70 else ("#f59e0b" if score >= 45 else "#ef4444")
    st.markdown(f"""
    <div class="score-ring">
        <div class="score-number" style="color:{cor}">{score}</div>
        <div>
            <div style="color:#9ca3af;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em">Score iMoney</div>
            <div style="color:#f9fafb;font-weight:600">{perfil}</div>
            <div style="color:#6b7280;font-size:0.85rem">Tendência: {trend}</div>
        </div>
    </div>""", unsafe_allow_html=True)

# =========================
# GRÁFICOS
# =========================
def grafico_gastos(gastos_cat):
    if not gastos_cat:
        return
    df = pd.DataFrame(list(gastos_cat.items()), columns=["Categoria", "Valor"])
    df = df[df["Valor"] > 0]
    if df.empty:
        return

    fig = go.Figure(go.Pie(
        labels=df["Categoria"], values=df["Valor"],
        hole=0.55,
        marker=dict(colors=px.colors.qualitative.Plotly),
        textinfo="label+percent",
        textfont=dict(color="white", size=12),
    ))
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        showlegend=False, margin=dict(t=10, b=10, l=10, r=10),
        height=280,
    )
    st.plotly_chart(fig, use_container_width=True, key="chart_gastos")


def grafico_projecao(sobra, selic):
    meses = list(range(1, 37))
    valores = [calcular_projecao(sobra, m, selic) for m in meses]
    sem_juros = [sobra * m for m in meses]

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=meses, y=valores, name="Com juros (SELIC)", line=dict(color="#10b981", width=2.5), fill="tozeroy", fillcolor="rgba(16,185,129,0.08)"))
    fig.add_trace(go.Scatter(x=meses, y=sem_juros, name="Sem investir", line=dict(color="#6b7280", width=1.5, dash="dash")))
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#9ca3af"), height=260,
        margin=dict(t=10, b=30, l=10, r=10),
        legend=dict(orientation="h", y=-0.15),
        xaxis=dict(title="Meses", gridcolor="#1f2937"),
        yaxis=dict(title="R$", gridcolor="#1f2937", tickprefix="R$"),
    )
    st.plotly_chart(fig, use_container_width=True, key="chart_projecao")

# =========================
# PÁGINA: LOGIN
# =========================
def page_login():
    inject_css()

    st.markdown("""
    <div style="text-align:center; padding: 3rem 0 1.5rem;">
        <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="margin:0 auto 16px;display:block;">
            <defs>
                <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#34c17a"/>
                    <stop offset="100%" style="stop-color:#f0b429"/>
                </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#0a1f12" stroke="url(#lg)" stroke-width="3"/>
            <polygon points="50,14 45,50 50,46 55,50" fill="#f0b429"/>
            <polygon points="50,86 45,50 50,54 55,50" fill="#34c17a"/>
            <circle cx="50" cy="50" r="6" fill="#0a1f12" stroke="#f0b429" stroke-width="2"/>
            <circle cx="50" cy="50" r="2.5" fill="#f0b429"/>
        </svg>
        <div style="font-family:Georgia,serif;font-size:2.8rem;font-weight:900;
            background:linear-gradient(135deg,#34c17a,#f0b429);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;
            background-clip:text;letter-spacing:-1px;line-height:1;margin-bottom:8px;">
            iMoney
        </div>
        <p style="color:#6b9e80;margin-top:0.3rem;font-size:0.85rem;letter-spacing:2px;text-transform:uppercase;">
            Assessoria Financeira com IA
        </p>
    </div>
    """, unsafe_allow_html=True)

    # Responsive: full width on mobile, centered on desktop
    col_l, col_m, col_r = st.columns([0.05, 0.9, 0.05])
    with col_m:
        aba = st.tabs(["🔑 Entrar", "✨ Criar conta"])

        # ── ABA LOGIN ──
        with aba[0]:
            email = st.text_input("Email", key="login_email",
                placeholder="seu@email.com")
            senha = st.text_input("Senha", type="password", key="login_senha",
                placeholder="Sua senha")

            if st.button("Entrar", use_container_width=True, key="btn_login"):
                email = email.strip().lower()

                # Validações básicas
                if not email:
                    st.error("Digite seu email.")
                elif not is_valid_email(email):
                    st.error("Email inválido. Verifique o formato.")
                elif not senha:
                    st.error("Digite sua senha.")
                else:
                    # Rate limit
                    allowed, wait = check_rate_limit_login(email)
                    if not allowed:
                        mins, secs = wait // 60, wait % 60
                        st.error(f"🔒 Muitas tentativas falhas. Aguarde {mins}min {secs}s.")
                    else:
                        with st.spinner("Entrando..."):
                            try:
                                res = supabase.auth.sign_in_with_password({
                                    "email": email,
                                    "password": senha
                                })
                                if res and res.user:
                                    reset_login_attempts(email)
                                    st.session_state["user_id"] = res.user.id
                                    st.session_state["user_email"] = res.user.email
                                    st.session_state["login_time"] = time.time()
                                    st.success("✅ Login realizado!")
                                    time.sleep(0.5)
                                    st.rerun()
                                else:
                                    increment_login_attempts(email)
                                    st.error("Email ou senha incorretos.")
                            except Exception as e:
                                err = str(e).lower()
                                increment_login_attempts(email)
                                if "invalid" in err or "credentials" in err or "wrong" in err:
                                    st.error("❌ Email ou senha incorretos.")
                                elif "email not confirmed" in err:
                                    st.warning("⚠️ Confirme seu email antes de entrar. Verifique sua caixa de entrada.")
                                elif "rate" in err or "too many" in err:
                                    st.error("🔒 Muitas tentativas. Aguarde alguns minutos.")
                                else:
                                    st.error(f"Erro ao fazer login. Tente novamente.")

        # ── ABA CADASTRO ──
        with aba[1]:
            email2 = st.text_input("Email", key="reg_email",
                placeholder="seu@email.com")
            senha2 = st.text_input("Senha", type="password", key="reg_senha",
                placeholder="Mínimo 6 caracteres")
            senha2_conf = st.text_input("Confirme a senha", type="password",
                key="reg_senha_conf", placeholder="Repita a senha")

            # Indicador de força da senha em tempo real
            if senha2:
                tem_letra = bool(re.search(r"[a-zA-Z]", senha2))
                tem_num = bool(re.search(r"[0-9]", senha2))
                comprimento = len(senha2) >= 6
                forca = sum([tem_letra, tem_num, comprimento])
                cores = ["#ef4444", "#f59e0b", "#10b981"]
                labels = ["Fraca", "Média", "Forte"]
                st.markdown(
                    f"<div style='font-size:0.75rem;color:{cores[forca-1] if forca > 0 else '#6b7280'};margin-top:4px;'>"
                    f"Senha: {labels[forca-1] if forca > 0 else 'muito curta'} "
                    f"{'✓' if comprimento else '✗'} 8+ chars "
                    f"{'✓' if tem_letra else '✗'} letra "
                    f"{'✓' if tem_num else '✗'} número</div>",
                    unsafe_allow_html=True
                )

            if st.button("Criar conta", use_container_width=True, key="btn_register"):
                email2 = email2.strip().lower()

                # Validações
                if not email2:
                    st.error("Digite seu email.")
                elif not is_valid_email(email2):
                    st.error("Email inválido. Verifique o formato.")
                elif not senha2:
                    st.error("Digite uma senha.")
                elif not is_valid_password(senha2):
                    st.error("Senha muito curta. Use mínimo 6 caracteres.")
                elif senha2 != senha2_conf:
                    st.error("As senhas não coincidem.")
                else:
                    with st.spinner("Criando conta..."):
                        try:
                            res = supabase.auth.sign_up({
                                "email": email2,
                                "password": senha2
                            })
                            if res and res.user:
                                # Tenta login direto (caso confirmação de email esteja desativada)
                                try:
                                    login_res = supabase.auth.sign_in_with_password({
                                        "email": email2,
                                        "password": senha2
                                    })
                                    if login_res and login_res.user:
                                        st.session_state["user_id"] = login_res.user.id
                                        st.session_state["user_email"] = login_res.user.email
                                        st.session_state["login_time"] = time.time()
                                        st.success("✅ Conta criada e login realizado!")
                                        time.sleep(0.5)
                                        st.rerun()
                                    else:
                                        st.success("✅ Conta criada! Verifique seu email para confirmar e faça login.")
                                except:
                                    st.success("✅ Conta criada! Verifique seu email para confirmar e faça login na aba 'Entrar'.")
                            else:
                                st.error("Não foi possível criar a conta. Tente novamente.")
                        except Exception as e:
                            err = str(e).lower()
                            if "already registered" in err or "already exists" in err:
                                st.warning("⚠️ Este email já está cadastrado. Faça login na aba 'Entrar'.")
                            elif "password" in err and ("weak" in err or "short" in err):
                                st.error("Senha muito fraca. Use letras, números e mínimo 8 caracteres.")
                            elif "invalid email" in err:
                                st.error("Email inválido. Verifique o formato.")
                            elif "rate" in err or "too many" in err:
                                st.error("🔒 Muitas tentativas. Aguarde alguns minutos.")
                            else:
                                st.error("Erro ao criar conta. Tente novamente em instantes.")

        # Link de recuperação de senha
        st.markdown(
            "<div style='text-align:center;margin-top:16px;font-size:0.8rem;color:#6b9e80;'>"
            "Esqueceu a senha? Entre em contato com o suporte."
            "</div>",
            unsafe_allow_html=True
        )

# =========================
# PÁGINA: APP PRINCIPAL
# =========================
def page_app():
    user_id = get_user_id()
    email = get_user_email() or user_id

    inject_css()

    # --- SIDEBAR ---
    with st.sidebar:
        st.markdown(f"""
        <div style='padding:0.5rem 0 1rem;'>
            <!-- Logo bússola + iMoney -->
            <div style='display:flex;align-items:center;gap:12px;margin-bottom:6px;'>
                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#34c17a"/>
                            <stop offset="100%" style="stop-color:#f0b429"/>
                        </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="48" fill="#0a1f12" stroke="url(#sg)" stroke-width="3"/>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#f0b429" stroke-width="0.6" stroke-dasharray="3,5" opacity="0.4"/>
                    <polygon points="50,14 45,50 50,46 55,50" fill="#f0b429"/>
                    <polygon points="50,86 45,50 50,54 55,50" fill="#34c17a"/>
                    <circle cx="50" cy="50" r="6" fill="#0a1f12" stroke="#f0b429" stroke-width="2"/>
                    <circle cx="50" cy="50" r="2.5" fill="#f0b429"/>
                </svg>
                <div>
                    <div style='font-family:Georgia,serif;font-size:1.5rem;font-weight:900;
                    background:linear-gradient(135deg,#34c17a,#f0b429);
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                    background-clip:text;line-height:1;'>iMoney</div>
                    <div style='font-size:0.65rem;letter-spacing:2px;color:#6b9e80;
                    text-transform:uppercase;margin-top:2px;'>Assessoria com IA</div>
                </div>
            </div>
            <div style='color:#6b9e80;font-size:0.75rem;padding:6px 0 0;
            border-top:1px solid rgba(26,158,92,0.2);'>👤 {email}</div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("### 💼 Dados Financeiros")

        tipo_renda = st.selectbox(
            "Tipo de renda",
            ["💼 Salário fixo", "🔀 Freelancer / Autônomo", "🔄 Misto (fixo + variável)"],
            key="tipo_renda"
        )

        renda_variavel = 0.0
        renda_extra = 0.0

        if tipo_renda == "💼 Salário fixo":
            renda = st.number_input("Salário mensal líquido (R$)", min_value=0.0,
                max_value=float(MAX_RENDA), value=5000.0, step=100.0, format="%.2f")

        elif tipo_renda == "🔀 Freelancer / Autônomo":
            st.caption("💡 Use a média dos últimos 3 meses.")
            col_r1, col_r2 = st.columns(2)
            with col_r1:
                renda_min = st.number_input("Renda mínima (R$)", min_value=0.0,
                    max_value=float(MAX_RENDA), value=2000.0, step=100.0, format="%.2f")
            with col_r2:
                renda_max = st.number_input("Renda máxima (R$)", min_value=0.0,
                    max_value=float(MAX_RENDA), value=8000.0, step=100.0, format="%.2f")
            renda = st.number_input("Renda média mensal (R$)", min_value=0.0,
                max_value=float(MAX_RENDA),
                value=round((renda_min + renda_max) / 2, 2),
                step=100.0, format="%.2f")
            renda_variavel = renda_max - renda_min
            volatilidade = round((renda_variavel / max(renda, 1)) * 100, 0)
            cor_vol = "#10b981" if volatilidade < 30 else ("#f59e0b" if volatilidade < 70 else "#ef4444")
            label_vol = "baixa ✅" if volatilidade < 30 else ("média ⚠️" if volatilidade < 70 else "alta 🔴")
            st.markdown(f"<div style='background:rgba(15,45,26,0.4);border-radius:8px;padding:8px 12px;"
                f"font-size:0.78rem;margin-top:4px;border-left:3px solid {cor_vol};'>"
                f"📊 Volatilidade: <strong style='color:{cor_vol}'>{volatilidade:.0f}%</strong> — {label_vol}</div>",
                unsafe_allow_html=True)

        else:
            renda_fixa = st.number_input("Renda fixa mensal (R$)", min_value=0.0,
                max_value=float(MAX_RENDA), value=3000.0, step=100.0, format="%.2f")
            renda_extra = st.number_input("Renda variável média (R$)", min_value=0.0,
                max_value=float(MAX_RENDA), value=2000.0, step=100.0, format="%.2f",
                help="Freelances, bicos, comissões — média mensal")
            renda = renda_fixa + renda_extra
            renda_variavel = renda_extra
            st.markdown(f"<div style='background:rgba(15,45,26,0.4);border-radius:8px;padding:8px 12px;"
                f"font-size:0.78rem;margin-top:4px;'>💰 Total estimado: "
                f"<strong style='color:#34c17a'>R$ {renda:,.2f}</strong></div>",
                unsafe_allow_html=True)

        st.markdown("**Gastos por categoria:**")
        gastos_cat = {}
        for cat in CATEGORIAS:
            val = st.number_input(cat, min_value=0.0, value=0.0, step=50.0,
                format="%.2f", key=f"gasto_{cat}", label_visibility="visible")
            if val > 0:
                gastos_cat[cat] = val

        gastos_total = sum(gastos_cat.values())
        sobra = renda - gastos_total

        if tipo_renda != "💼 Salário fixo" and gastos_total > 0:
            meses_reserva = 6 if "Freelancer" in tipo_renda else 3
            reserva_ideal = gastos_total * meses_reserva
            st.markdown(f"<div style='background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.25);"
                f"border-radius:8px;padding:8px 12px;font-size:0.78rem;margin-top:8px;'>"
                f"🛡️ Reserva de emergência ideal: <strong style='color:#f0b429'>"
                f"R$ {reserva_ideal:,.0f}</strong> ({meses_reserva} meses)</div>",
                unsafe_allow_html=True)


        st.divider()
        if st.button("🚪 Sair", use_container_width=True):
            try: supabase.auth.sign_out()
            except: pass
            st.session_state.messages = []
            st.rerun()

    # --- DADOS MACRO (auto-atualizados) ---
    eco = get_dados_economicos()
    selic = eco["selic_anual"]
    ipca = eco["ipca_mensal"]
    ipca_anual = eco["ipca_anual"]
    selic_meta = eco["selic_meta"]
    juros_reais = get_juros_reais()
    ultima_atualizacao = eco["ultima_atualizacao"]

    # --- MEMÓRIA ---
    tipo_renda_str = st.session_state.get("tipo_renda", "💼 Salário fixo")
    trend, avg_savings = save_memory(user_id, renda, gastos_total, gastos_cat)
    perfil_usuario = load_perfil(user_id)

    # --- ENGINE ---
    perfil = classify_user(renda, gastos_total)
    score = financial_score(renda, gastos_total, trend)
    metas = load_metas(user_id)

    # --- ABAS ---
    tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs(["📊 Dashboard", "💬 Assessor IA", "📝 Transações", "🎯 Metas", "🔀 Renda Variável", "👤 Perfil", "🏦 Open Finance"])

    # ========================
    # TAB 1: DASHBOARD
    # ========================
    with tab1:
        st.markdown("## Visão Geral")

        cor_sobra_txt = "🟢" if sobra > 0 else "🔴"
        sub_gastos = f"{(gastos_total/renda*100):.1f}% da renda" if renda else ""
        sub_sobra = "disponível para investir" if sobra > 0 else "DÉFICIT"
        st.markdown(f"""
        <div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:4px;'>
            <div class="metric-card"><h3>Renda Mensal</h3>
                <div class="value">R$ {renda:,.0f}</div></div>
            <div class="metric-card"><h3>Gastos Totais</h3>
                <div class="value">R$ {gastos_total:,.0f}</div>
                <div class="sub">{sub_gastos}</div></div>
            <div class="metric-card"><h3>Sobra Mensal</h3>
                <div class="value">{cor_sobra_txt} R$ {abs(sobra):,.0f}</div>
                <div class="sub">{sub_sobra}</div></div>
            <div class="metric-card"><h3>SELIC</h3>
                <div class="value">{selic}% a.a.</div>
                <div class="sub">Meta: {selic_meta}% | IPCA 12m: {ipca_anual}%</div></div>
        </div>
        """, unsafe_allow_html=True)

        # Banner de indicadores econômicos — cards individuais legíveis
        cor_jr = "#10b981" if juros_reais > 6 else ("#f59e0b" if juros_reais > 3 else "#ef4444")
        label_jr = "Excelente 🚀" if juros_reais > 6 else ("Moderado 📊" if juros_reais > 3 else "Baixo ⚠️")
        ref_txt = f"Ref: {ultima_atualizacao}" if ultima_atualizacao != "fallback" else "Fonte: BCB"
        st.markdown(f"""
        <div class='eco-grid' style='display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px;'>
            <div style='background:rgba(26,158,92,0.1);border:1px solid rgba(26,158,92,0.3);
            border-radius:12px;padding:12px 14px;'>
                <div style='color:#6b9e80;font-size:0.68rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;'>SELIC Efetiva</div>
                <div style='color:#34c17a;font-size:1.15rem;font-weight:700;'>{selic}% a.a.</div>
            </div>
            <div style='background:rgba(240,180,41,0.08);border:1px solid rgba(240,180,41,0.25);
            border-radius:12px;padding:12px 14px;'>
                <div style='color:#6b9e80;font-size:0.68rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;'>Meta SELIC</div>
                <div style='color:#f0b429;font-size:1.15rem;font-weight:700;'>{selic_meta}% a.a.</div>
            </div>
            <div style='background:rgba(232,245,238,0.05);border:1px solid rgba(232,245,238,0.1);
            border-radius:12px;padding:12px 14px;'>
                <div style='color:#6b9e80;font-size:0.68rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;'>IPCA Mensal</div>
                <div style='color:#e8f5ee;font-size:1.15rem;font-weight:700;'>{ipca}%</div>
            </div>
            <div style='background:rgba(232,245,238,0.05);border:1px solid rgba(232,245,238,0.1);
            border-radius:12px;padding:12px 14px;'>
                <div style='color:#6b9e80;font-size:0.68rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;'>IPCA 12 meses</div>
                <div style='color:#e8f5ee;font-size:1.15rem;font-weight:700;'>{ipca_anual}%</div>
            </div>
            <div style='background:rgba(0,0,0,0.2);border:1px solid {cor_jr}44;
            border-radius:12px;padding:12px 14px;'>
                <div style='color:#6b9e80;font-size:0.68rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;'>Juro Real</div>
                <div style='color:{cor_jr};font-size:1.15rem;font-weight:700;'>{juros_reais}% a.a.</div>
                <div style='color:#6b9e80;font-size:0.65rem;margin-top:2px;'>{label_jr}</div>
            </div>
        </div>
        <div style='color:#4b7a5e;font-size:0.7rem;text-align:right;margin-bottom:8px;'>📡 {ref_txt} — atualiza a cada 4h</div>
        """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # Score + projeções (coluna esquerda)
        score_card(score, perfil, trend)
        st.markdown("<br>", unsafe_allow_html=True)

        if sobra > 0:
            projecao_1a = calcular_projecao(sobra, 12, selic)
            projecao_3a = calcular_projecao(sobra, 36, selic)
            st.markdown(f"""
            <div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:12px;'>
                <div class="metric-card"><h3>Projeção 12 meses</h3>
                    <div class="value">R$ {projecao_1a:,.0f}</div>
                    <div class="sub">investindo a sobra mensal</div></div>
                <div class="metric-card"><h3>Projeção 3 anos</h3>
                    <div class="value">R$ {projecao_3a:,.0f}</div>
                    <div class="sub">com juros compostos</div></div>
            </div>
            """, unsafe_allow_html=True)

        # Gráfico de distribuição
        if gastos_cat:
            st.markdown("**Distribuição de Gastos**")
            grafico_gastos(gastos_cat)
        else:
            st.info("Preencha seus gastos por categoria na barra lateral.")

        if sobra > 0:
            st.markdown("**📈 Projeção de Patrimônio (36 meses)**")
            grafico_projecao(sobra, selic)

        # Diagnóstico IA
        st.markdown("---")
        st.markdown("### 🧠 Diagnóstico Inteligente")
        if st.button("⚡ Gerar diagnóstico completo", use_container_width=True):
            with st.spinner("Analisando sua situação financeira..."):
                diagnostico = agente_diagnostico(renda, gastos_cat if gastos_cat else {"Total": gastos_total}, selic, ipca, trend, score, metas)
            st.markdown(diagnostico)

    # ========================
    # TAB 2: CHAT IA
    # ========================
    with tab2:
        st.markdown("## 💬 Assessor Financeiro IA")
        st.caption("Pergunte sobre investimentos, orçamento, estratégias, metas — contexto completo da sua situação.")

        # Quick actions ANTES do histórico
        col_q1, col_q2, col_q3 = st.columns(3)
        quick_prompt = None
        with col_q1:
            if st.button("📊 Onde investir minha sobra?"):
                quick_prompt = f"Tenho R${sobra:,.2f} de sobra mensal. Onde devo investir considerando a SELIC atual de {selic}%?"
        with col_q2:
            if st.button("✂️ Como cortar gastos?"):
                quick_prompt = "Analise meus gastos por categoria e indique onde posso reduzir gastos de forma inteligente."
        with col_q3:
            if st.button("🎯 Como alcançar minhas metas?"):
                quick_prompt = "Com base nas minhas metas e situação atual, qual a melhor estratégia para alcançá-las?"

        # Input do chat
        prompt = st.chat_input("Digite sua pergunta financeira...")
        pergunta_final = prompt or quick_prompt

        # Processa pergunta com segurança
        if pergunta_final:
            # Verifica rate limit
            if not check_chat_rate_limit(user_id):
                st.warning(f"⚠️ Limite de {RATE_LIMIT_CHAT} mensagens por hora atingido. Tente mais tarde.")
            # Verifica tamanho da mensagem
            elif len(pergunta_final) > MAX_MSG_LEN:
                st.warning(f"⚠️ Mensagem muito longa. Máximo {MAX_MSG_LEN} caracteres.")
            # Verifica histórico máximo
            elif len(st.session_state.messages) >= MAX_MESSAGES * 2:
                st.warning("⚠️ Sessão longa. Limpe a conversa para continuar.")
            else:
                # Sanitiza o prompt
                prompt_clean = sanitize_text(pergunta_final, max_len=MAX_MSG_LEN)
                st.session_state.messages.append({"role": "user", "content": prompt_clean})
                with st.spinner("Analisando..."):
                    try:
                        resposta = agente_chat(
                            st.session_state.messages, renda, gastos_total,
                            sobra, selic, ipca, score, trend, perfil, gastos_cat, metas,
                            tipo_renda=tipo_renda_str,
                            perfil_usuario=perfil_usuario
                        )
                        st.session_state.messages.append({"role": "assistant", "content": resposta})
                    except Exception as e:
                        st.session_state.messages.append({"role": "assistant", "content": "Desculpe, ocorreu um erro. Tente novamente."})
                st.rerun()

        # Histórico
        for msg in st.session_state.messages:
            if msg["role"] == "user":
                with st.chat_message("user"):
                    st.markdown(msg["content"])
            else:
                with st.chat_message("assistant"):
                    st.markdown(msg["content"])

        if st.session_state.messages and st.button("🗑️ Limpar conversa"):
            st.session_state.messages = []
            st.rerun()

    # ========================
    # TAB 3: TRANSAÇÕES
    # ========================
    with tab3:
        st.markdown("## 📝 Transações")

        with st.expander("➕ Adicionar transação"):
            t_col1, t_col2 = st.columns(2)
            with t_col1:
                t_desc = st.text_input("Descrição")
                t_valor = st.number_input("Valor (R$)", min_value=0.01, max_value=float(MAX_GASTO), value=100.0)
            with t_col2:
                t_tipo = st.selectbox("Tipo", ["gasto", "receita"])
                t_cat = st.selectbox("Categoria", CATEGORIAS)

            if st.button("💾 Salvar transação"):
                if t_desc and t_valor > 0:
                    # Análise IA automática para gastos
                    if t_tipo == "gasto":
                        with st.spinner("Classificando com IA..."):
                            analise = agente_analise_gasto(t_desc, t_valor, renda)
                        t_cat = analise.get("categoria", t_cat)
                        avaliacao = analise.get("avaliacao", "OK")
                        dica = analise.get("dica", "")
                        if avaliacao in ["Alto", "Muito Alto"]:
                            st.warning(f"⚠️ Gasto {avaliacao.lower()} para sua renda. {dica}")

                    if save_transaction(user_id, t_desc, t_valor, t_cat, t_tipo):
                        st.success("Transação salva!")
                        st.rerun()
                else:
                    st.error("Preencha todos os campos.")

        # Lista de transações
        transacoes = load_transactions(user_id)
        if transacoes:
            df = pd.DataFrame(transacoes)
            df = df[["date", "descricao", "categoria", "tipo", "valor"]].rename(columns={
                "date": "Data", "descricao": "Descrição", "categoria": "Categoria",
                "tipo": "Tipo", "valor": "Valor (R$)"
            })
            st.dataframe(df, use_container_width=True, hide_index=True)
        else:
            st.info("Nenhuma transação registrada ainda.")

    # ========================
    # TAB 4: METAS
    # ========================
    with tab4:
        st.markdown("## 🎯 Metas Financeiras")

        with st.expander("➕ Nova meta"):
            m_col1, m_col2, m_col3 = st.columns(3)
            with m_col1: m_nome = st.text_input("Nome da meta")
            with m_col2: m_valor = st.number_input("Valor alvo (R$)", min_value=100.0, value=10000.0)
            with m_col3: m_prazo = st.number_input("Prazo (meses)", min_value=1, value=12)

            if st.button("🎯 Criar meta"):
                if m_nome:
                    if save_meta(user_id, m_nome, m_valor, m_prazo):
                        st.success("Meta criada!")
                        mensalidade = m_valor / m_prazo
                        st.info(f"Você precisa guardar R$ {mensalidade:,.2f}/mês para atingir essa meta.")
                        st.rerun()

        for meta in metas:
            progresso = meta.get("valor_atual", 0) / meta["valor_alvo"] if meta["valor_alvo"] > 0 else 0
            st.markdown(f"**{meta['nome']}** — R$ {meta['valor_alvo']:,.0f} em {meta['prazo_meses']} meses")
            st.progress(min(progresso, 1.0))
            mensalidade_necessaria = meta["valor_alvo"] / meta["prazo_meses"]
            st.caption(f"Mensalidade necessária: R$ {mensalidade_necessaria:,.2f} | Atual: R$ {meta.get('valor_atual', 0):,.2f}")
            st.markdown("---")

        if not metas:
            st.info("Nenhuma meta cadastrada. Crie sua primeira meta acima!")

    # ========================
    # TAB 5: RENDA VARIÁVEL
    # ========================
    with tab5:
        tipo_atual = st.session_state.get("tipo_renda", "💼 Salário fixo")
        if tipo_atual == "💼 Salário fixo":
            st.info("💡 Esta aba é para freelancers e autônomos. Mude seu tipo de renda na barra lateral.")
        else:
            st.markdown("## 🔀 Painel do Freelancer / Autônomo")
            st.caption("Ferramentas pensadas para quem tem renda que varia todo mês.")

            st.markdown("### 🧮 Simulador de Mês Fraco")
            col1, col2 = st.columns(2)
            with col1:
                pct_reducao = st.slider("Redução da renda (%)", 10, 80, 30)
            with col2:
                renda_fraca = renda * (1 - pct_reducao / 100)
                sobra_fraca = renda_fraca - gastos_total
                cor_sf = "#10b981" if sobra_fraca > 0 else "#ef4444"
                resultado_sf = ("✅ Sobra R$ " + f"{sobra_fraca:,.0f}") if sobra_fraca > 0 else ("⚠️ Déficit R$ " + f"{abs(sobra_fraca):,.0f}")
                st.markdown(f"<div style='background:rgba(15,45,26,0.5);border-radius:12px;padding:16px;text-align:center;'>"
                    f"<div style='color:#6b9e80;font-size:0.75rem;'>Renda no mês fraco</div>"
                    f"<div style='color:#f0b429;font-size:1.5rem;font-weight:700;'>R$ {renda_fraca:,.0f}</div>"
                    f"<div style='color:{cor_sf};'>{resultado_sf}</div></div>", unsafe_allow_html=True)

            st.markdown("### 🛡️ Reserva de Emergência")
            meses_meta = st.radio("Quantos meses de reserva?", [3, 6, 12], index=1, horizontal=True)
            reserva_necessaria = gastos_total * meses_meta
            reserva_atual = st.number_input("Quanto já tem guardado? (R$)", min_value=0.0, value=0.0, step=500.0, format="%.2f", key="reserva_input")
            progresso_res = min(reserva_atual / max(reserva_necessaria, 1), 1.0)
            falta_res = max(reserva_necessaria - reserva_atual, 0)
            meses_completar = round(falta_res / max(sobra, 1)) if sobra > 0 else 0
            st.progress(progresso_res)
            c1, c2, c3 = st.columns(3)
            with c1: st.metric("Meta", f"R$ {reserva_necessaria:,.0f}")
            with c2: st.metric("Atual", f"R$ {reserva_atual:,.0f}")
            with c3: st.metric("Falta", f"R$ {falta_res:,.0f}", delta=f"{meses_completar} meses" if meses_completar > 0 else "✅ Completa!")

            st.markdown("### 💰 Método Cofre Mensal")
            st.caption("Defina uma % para guardar de cada recebimento, independente do valor.")
            pct_cofre = st.slider("% de cada recebimento para guardar", 5, 50, 20)
            sim_receb = st.number_input("Simule um recebimento (R$)", min_value=0.0, value=3000.0, step=100.0, format="%.2f", key="sim_receb")
            guardar_val = sim_receb * (pct_cofre / 100)
            usar_val = sim_receb - guardar_val
            c1, c2 = st.columns(2)
            with c1: st.markdown(f"<div style='background:rgba(26,158,92,0.1);border:1px solid #1a9e5c;border-radius:12px;padding:16px;text-align:center;'>"
                f"<div style='color:#6b9e80;font-size:0.75rem;'>Guardar ({pct_cofre}%)</div>"
                f"<div style='color:#34c17a;font-size:1.6rem;font-weight:700;'>R$ {guardar_val:,.0f}</div>"
                f"<div style='color:#6b9e80;font-size:0.75rem;'>→ reserva/investimento</div></div>", unsafe_allow_html=True)
            with c2: st.markdown(f"<div style='background:rgba(240,180,41,0.08);border:1px solid #f0b429;border-radius:12px;padding:16px;text-align:center;'>"
                f"<div style='color:#6b9e80;font-size:0.75rem;'>Usar ({100-pct_cofre}%)</div>"
                f"<div style='color:#f0b429;font-size:1.6rem;font-weight:700;'>R$ {usar_val:,.0f}</div>"
                f"<div style='color:#6b9e80;font-size:0.75rem;'>→ gastos e vida</div></div>", unsafe_allow_html=True)

            st.markdown("### 📋 Estimativa de Impostos")
            regime = st.selectbox("Regime tributário", ["MEI", "Autônomo (carnê-leão)", "Simples Nacional", "Não sei"])
            if regime == "MEI":
                st.info("📄 Como MEI você paga o DAS fixo de **R$ 81,05/mês** em 2026 (5% do salário mínimo de R$ 1.621,00). Limite anual: R$ 81.000 (MEI) ou R$ 130.000 (MEI Individual). Fonte: Portaria Interministerial MPS/MF nº 13/2026.")
            elif regime == "Autônomo (carnê-leão)":
                base_anual = renda * 12
                # Tabela IR progressiva mensal 2026 (Receita Federal - mesma de 2025)
                # Fonte: gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
                # Faixas mensais → convertidas para anual
                renda_mensal_base = renda  # base de cálculo (sem dedução INSS aqui, simplificado)
                if renda_mensal_base <= 2428.80:
                    ir_mensal_bruto = 0
                elif renda_mensal_base <= 2826.65:
                    ir_mensal_bruto = renda_mensal_base * 0.075 - 182.16
                elif renda_mensal_base <= 3751.05:
                    ir_mensal_bruto = renda_mensal_base * 0.15 - 394.16
                elif renda_mensal_base <= 4664.68:
                    ir_mensal_bruto = renda_mensal_base * 0.225 - 675.49
                else:
                    ir_mensal_bruto = renda_mensal_base * 0.275 - 908.73
                # Aplica redutor 2026 (Lei 15.270/2025): isenção até R$5.000
                if renda_mensal_base <= 5000:
                    redutor = ir_mensal_bruto  # zera o imposto
                elif renda_mensal_base <= 7350:
                    redutor = 978.62 - (0.133145 * renda_mensal_base)
                else:
                    redutor = 0
                ir_mensal_liquido = max(ir_mensal_bruto - redutor, 0)
                ir_anual = ir_mensal_liquido * 12
                ir_mensal_liquido_calc = ir_mensal_liquido  # já calculado acima
                base_anual = renda * 12  # mantém compatibilidade
                ir_mensal = round(ir_mensal_liquido, 2)
                inss_mensal = round(min(renda * 0.11, 908.85), 2)  # desconto máximo INSS 2026 (teto R$8.475,55)
                total_imp = ir_mensal + inss_mensal
                st.markdown(f"💸 IR estimado: **R$ {ir_mensal:,.2f}/mês** | INSS (11%): **R$ {inss_mensal:,.2f}/mês** | Total: **R$ {total_imp:,.2f}/mês**")
                st.markdown(f"✅ Renda líquida estimada: **R$ {renda - total_imp:,.2f}/mês**")
                if renda <= 5000:
                    st.success("🎉 Com a Reforma da Renda (Lei 15.270/2025), você está isento de IR em 2026!")
                elif renda <= 7350:
                    st.info("📉 Você tem redução parcial do IR em 2026 (Lei 15.270/2025). Quanto mais perto de R$5.000, maior o desconto.")
            elif regime == "Simples Nacional":
                st.info("📄 A alíquota depende do seu anexo e faturamento. Consulte seu contador.")
            else:
                st.warning("💡 Como autônomo você pode pagar carnê-leão e INSS. Consulte um contador.")

    # ========================
    # TAB 6: PERFIL DO USUÁRIO
    # ========================
    with tab6:
        st.markdown("## 👤 Meu Perfil")
        st.caption("Suas informações ajudam o assessor IA a dar recomendações mais precisas.")

        # Carrega perfil salvo
        perfil_salvo = load_perfil(user_id)

        with st.form("form_perfil"):
            st.markdown("### 📋 Informações Pessoais")
            col1, col2 = st.columns(2)

            with col1:
                idade_val = perfil_salvo.get("idade") or 0
                idade = st.number_input("Idade", min_value=0, max_value=120,
                    value=int(idade_val), step=1)

                filhos_val = perfil_salvo.get("filhos") or 0
                filhos = st.number_input("Número de filhos", min_value=0, max_value=20,
                    value=int(filhos_val), step=1)

            with col2:
                ocupacoes = [
                    "Empregado CLT", "Servidor público", "Empresário/Sócio",
                    "Freelancer/Autônomo", "Profissional liberal", "Aposentado/Pensionista",
                    "Estudante", "Desempregado", "Outro"
                ]
                ocup_atual = perfil_salvo.get("ocupacao", "Empregado CLT")
                ocupacao = st.selectbox("Ocupação", ocupacoes,
                    index=ocupacoes.index(ocup_atual) if ocup_atual in ocupacoes else 0)

            st.markdown("### 📍 Localização")
            col3, col4 = st.columns(2)

            with col3:
                estados_lista = ["— Selecione seu estado —"] + [f"{uf} — {nome}" for uf, nome in sorted(ESTADOS_BR.items(), key=lambda x: x[1])]
                estado_salvo = perfil_salvo.get("estado", "") or ""
                estado_display = f"{estado_salvo} — {ESTADOS_BR.get(estado_salvo, '')}" if estado_salvo and estado_salvo in ESTADOS_BR else ""
                try:
                    estado_idx = estados_lista.index(estado_display) if estado_display in estados_lista else 0
                except ValueError:
                    estado_idx = 0
                estado_sel = st.selectbox("Estado", estados_lista, index=estado_idx, key="sel_estado")
                estado_uf = estado_sel.split(" — ")[0].strip() if estado_sel and "—" in estado_sel and estado_sel != "— Selecione seu estado —" else ""

            with col4:
                if estado_uf and estado_uf in CIDADES_BR:
                    cidades_disponiveis = ["— Selecione sua cidade —"] + CIDADES_BR[estado_uf]
                    cidade_salva = perfil_salvo.get("cidade", "") or ""
                    try:
                        cidade_idx = cidades_disponiveis.index(cidade_salva) if cidade_salva in cidades_disponiveis else 0
                    except ValueError:
                        cidade_idx = 0
                else:
                    cidades_disponiveis = ["— Selecione um estado primeiro —"]
                    cidade_idx = 0
                cidade_sel = st.selectbox("Cidade", cidades_disponiveis, index=cidade_idx, key="sel_cidade")

            submitted = st.form_submit_button("💾 Salvar perfil", use_container_width=True)

            if submitted:
                cidade_valida = cidade_sel and "Selecione" not in cidade_sel
                estado_valido = estado_uf and estado_uf in ESTADOS_BR
                if not estado_valido:
                    st.error("Selecione seu estado.")
                elif not cidade_valida:
                    st.error("Selecione sua cidade.")
                elif not idade or int(idade) < 1:
                    st.error("Informe sua idade.")
                else:
                    if save_perfil(user_id, int(idade), int(filhos), estado_uf, cidade_sel, ocupacao):
                        st.success("✅ Perfil salvo com sucesso!")
                        time.sleep(0.5)
                        st.rerun()
                    else:
                        st.error("Erro ao salvar. Verifique se a tabela user_profiles existe no Supabase.")

        # Exibe perfil atual
        if perfil_salvo:
            st.markdown("---")
            st.markdown("### 📊 Seu perfil atual")
            c1, c2, c3, c4 = st.columns(4)
            with c1:
                st.metric("Idade", f"{perfil_salvo.get('idade', '—')} anos")
            with c2:
                filhos_n = perfil_salvo.get('filhos', 0)
                st.metric("Filhos", filhos_n if filhos_n is not None else "—")
            with c3:
                uf = perfil_salvo.get('estado', '')
                st.metric("Estado", ESTADOS_BR.get(uf, uf) if uf else "—")
            with c4:
                st.metric("Cidade", perfil_salvo.get('cidade', '—'))

            st.markdown(f"**Ocupação:** {perfil_salvo.get('ocupacao', '—')}")

    # ========================
    # TAB 7: OPEN FINANCE
    # ========================
    with tab7:
        st.markdown("## 🏦 Open Finance")
        st.caption("Conecte suas contas bancárias e importe seus dados automaticamente.")

        # ── Banner explicativo ──
        st.markdown("""
        <div style='background:linear-gradient(135deg,rgba(26,158,92,0.15),rgba(240,180,41,0.1));
        border:1px solid rgba(26,158,92,0.3);border-radius:16px;padding:20px 24px;margin-bottom:24px;'>
            <div style='font-size:1.1rem;font-weight:700;color:#34c17a;margin-bottom:8px;'>
                🔐 O que é o Open Finance?
            </div>
            <p style='color:#e8f5ee;font-size:0.9rem;line-height:1.6;margin:0;'>
                O <strong>Open Finance</strong> é um sistema regulamentado pelo <strong>Banco Central do Brasil</strong>
                que permite que você compartilhe seus dados bancários com outros aplicativos de forma
                <strong>segura, criptografada e com seu consentimento</strong>. Você pode conectar contas de
                Nubank, Itaú, Bradesco, Santander, Banco do Brasil, Caixa e mais de 800 instituições.
            </p>
        </div>
        """, unsafe_allow_html=True)

        # ── Status da integração ──
        st.markdown("### 📋 Status da Integração")

        col_status1, col_status2, col_status3 = st.columns(3)
        with col_status1:
            st.markdown("""
            <div style='background:rgba(15,45,26,0.5);border:1px solid rgba(26,158,92,0.2);
            border-radius:12px;padding:16px;text-align:center;'>
                <div style='font-size:1.8rem;'>🔗</div>
                <div style='color:#f0b429;font-weight:700;margin:6px 0 4px;'>Fase 1</div>
                <div style='color:#34c17a;font-size:0.8rem;'>Dados Abertos</div>
                <div style='color:#6b9e80;font-size:0.75rem;'>Produtos e tarifas dos bancos</div>
                <div style='margin-top:8px;background:#10b981;color:white;border-radius:20px;
                padding:2px 10px;font-size:0.7rem;display:inline-block;'>✓ Disponível</div>
            </div>""", unsafe_allow_html=True)
        with col_status2:
            st.markdown("""
            <div style='background:rgba(15,45,26,0.5);border:1px solid rgba(240,180,41,0.2);
            border-radius:12px;padding:16px;text-align:center;'>
                <div style='font-size:1.8rem;'>👤</div>
                <div style='color:#f0b429;font-weight:700;margin:6px 0 4px;'>Fase 2</div>
                <div style='color:#f0b429;font-size:0.8rem;'>Dados do Cliente</div>
                <div style='color:#6b9e80;font-size:0.75rem;'>Saldos, extratos e transações</div>
                <div style='margin-top:8px;background:#f59e0b;color:white;border-radius:20px;
                padding:2px 10px;font-size:0.7rem;display:inline-block;'>⏳ Em homologação</div>
            </div>""", unsafe_allow_html=True)
        with col_status3:
            st.markdown("""
            <div style='background:rgba(15,45,26,0.5);border:1px solid rgba(107,158,128,0.2);
            border-radius:12px;padding:16px;text-align:center;'>
                <div style='font-size:1.8rem;'>💸</div>
                <div style='color:#f0b429;font-weight:700;margin:6px 0 4px;'>Fase 3+</div>
                <div style='color:#6b9e80;font-size:0.8rem;'>Pagamentos e Crédito</div>
                <div style='color:#6b9e80;font-size:0.75rem;'>Pix, TED e iniciação de pagamento</div>
                <div style='margin-top:8px;background:#374151;color:#9ca3af;border-radius:20px;
                padding:2px 10px;font-size:0.7rem;display:inline-block;'>🗓 Roadmap 2026</div>
            </div>""", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # ── Como vai funcionar ──
        st.markdown("### 🔄 Como a integração vai funcionar")

        steps = [
            ("1", "🔐", "Você autoriza", "Dentro do iMoney, você escolhe seu banco e autoriza o compartilhamento de dados pelo próprio app do banco — sem digitar senha em lugar nenhum."),
            ("2", "📡", "Conexão segura", "O iMoney usa o protocolo OAuth 2.0 + FAPI (Financial-grade API), exigido pelo Banco Central, para se conectar com segurança."),
            ("3", "📥", "Dados importados", "Saldos, extratos e transações chegam automaticamente. Nada de digitar gastos manualmente."),
            ("4", "🤖", "IA analisa", "O assessor IA analisa seus dados bancários reais e dá recomendações muito mais precisas."),
        ]
        cols = st.columns(4)
        for i, (num, emoji, titulo, desc) in enumerate(steps):
            with cols[i]:
                st.markdown(f"""
                <div style='background:rgba(15,45,26,0.5);border:1px solid rgba(26,158,92,0.2);
                border-radius:12px;padding:16px;height:180px;'>
                    <div style='font-size:1.5rem;'>{emoji}</div>
                    <div style='color:#f0b429;font-weight:700;font-size:0.8rem;
                    letter-spacing:1px;margin:6px 0 4px;'>PASSO {num}</div>
                    <div style='color:#e8f5ee;font-weight:600;margin-bottom:6px;'>{titulo}</div>
                    <div style='color:#6b9e80;font-size:0.78rem;line-height:1.4;'>{desc}</div>
                </div>""", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # ── Bancos suportados ──
        st.markdown("### 🏦 Bancos que serão suportados")
        bancos = [
            ("Nubank", "🟣"), ("Itaú", "🟠"), ("Bradesco", "🔴"), ("Santander", "🔴"),
            ("Banco do Brasil", "🟡"), ("Caixa", "🔵"), ("Inter", "🟠"), ("C6 Bank", "⚫"),
            ("BTG Pactual", "🔵"), ("XP", "⚫"), ("PagBank", "🟢"), ("Sicoob", "🟢"),
        ]
        banco_cols = st.columns(6)
        for i, (banco, emoji) in enumerate(bancos):
            with banco_cols[i % 6]:
                st.markdown(f"""
                <div style='background:rgba(15,45,26,0.4);border:1px solid rgba(26,158,92,0.15);
                border-radius:10px;padding:10px;text-align:center;margin-bottom:8px;'>
                    <div style='font-size:1.2rem;'>{emoji}</div>
                    <div style='color:#e8f5ee;font-size:0.75rem;margin-top:4px;'>{banco}</div>
                </div>""", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # ── Formulário de interesse ──
        st.markdown("### 📬 Quero ser notificado quando estiver disponível")
        st.caption("A integração com Open Finance está em desenvolvimento. Cadastre seu interesse e avisamos assim que for lançada.")

        with st.form("form_openfinance"):
            col_a, col_b = st.columns(2)
            with col_a:
                banco_interesse = st.multiselect(
                    "Quais bancos você usa?",
                    [b[0] for b in bancos] + ["Outro"],
                    default=[]
                )
            with col_b:
                funcionalidade = st.multiselect(
                    "O que mais te interessa?",
                    ["Importar extratos automaticamente",
                     "Categorização automática de gastos",
                     "Saldo em tempo real",
                     "Análise de investimentos",
                     "Iniciar pagamentos pelo iMoney"],
                    default=[]
                )

            notif_submit = st.form_submit_button("🔔 Quero ser notificado", use_container_width=True)
            if notif_submit:
                if banco_interesse or funcionalidade:
                    try:
                        supabase.table("openfinance_interest").upsert({
                            "user_id": str(user_id),
                            "bancos": json.dumps(banco_interesse),
                            "funcionalidades": json.dumps(funcionalidade),
                            "created_at": datetime.utcnow().isoformat(),
                        }).execute()
                        st.success("✅ Interesse registrado! Você será notificado por email assim que a integração estiver disponível.")
                    except:
                        st.success("✅ Interesse registrado! Você será notificado assim que disponível.")
                else:
                    st.warning("Selecione ao menos um banco ou funcionalidade.")

        st.markdown("<br>", unsafe_allow_html=True)

        # ── Nota de segurança e privacidade ──
        st.markdown("""
        <div style='background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);
        border-radius:12px;padding:16px 20px;'>
            <div style='color:#fca5a5;font-weight:700;margin-bottom:8px;'>🔒 Segurança e Privacidade</div>
            <ul style='color:#e8f5ee;font-size:0.82rem;line-height:1.8;margin:0;padding-left:16px;'>
                <li>O iMoney <strong>nunca</strong> armazena suas senhas bancárias</li>
                <li>A conexão usa <strong>OAuth 2.0 + FAPI</strong>, os mesmos padrões do Banco Central</li>
                <li>Você pode <strong>revogar o acesso a qualquer momento</strong> pelo app do banco</li>
                <li>Seus dados são protegidos pela <strong>LGPD (Lei Geral de Proteção de Dados)</strong></li>
                <li>O consentimento expira automaticamente em <strong>12 meses</strong> conforme regulação</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)





# =========================
# ADMIN DASHBOARD
# =========================
def load_admin_stats():
    """Carrega todas as estatísticas do banco para o admin, incluindo retenção."""
    from datetime import timedelta
    stats = {}
    try:
        now = datetime.utcnow()

        # ── Usuários ──
        res = supabase.table("user_memory").select("*").execute()
        users = res.data or []
        stats["total_users"] = len(users)
        stats["users_data"] = users

        # Cortes de tempo
        d1  = (now - timedelta(days=1)).isoformat()
        d7  = (now - timedelta(days=7)).isoformat()
        d14 = (now - timedelta(days=14)).isoformat()
        d30 = (now - timedelta(days=30)).isoformat()

        ativos_1d  = [u for u in users if u.get("updated_at","") >= d1]
        ativos_7d  = [u for u in users if u.get("updated_at","") >= d7]
        ativos_30d = [u for u in users if u.get("updated_at","") >= d30]
        stats["active_users_1d"]  = len(ativos_1d)
        stats["active_users_7d"]  = len(ativos_7d)
        stats["active_users_30d"] = len(ativos_30d)

        # ── Retenção ──
        total = stats["total_users"] or 1

        # DAU/MAU ratio (engajamento diário vs mensal)
        stats["dau_mau"] = round((len(ativos_1d) / max(len(ativos_30d), 1)) * 100, 1)

        # WAU/MAU ratio (semanal vs mensal)
        stats["wau_mau"] = round((len(ativos_7d) / max(len(ativos_30d), 1)) * 100, 1)

        # Retenção D7 simples: % usuários que voltaram na semana
        stats["retencao_7d"] = round((len(ativos_7d) / total) * 100, 1)

        # Retenção D30
        stats["retencao_30d"] = round((len(ativos_30d) / total) * 100, 1)

        # Churn (inativos há mais de 30 dias)
        stats["churned"] = total - len(ativos_30d)
        stats["churn_rate"] = round((stats["churned"] / total) * 100, 1)

        # Novos usuários por período
        novos_7d  = [u for u in users if u.get("updated_at","") >= d7]
        novos_14d = [u for u in users if u.get("updated_at","") >= d14]
        stats["novos_7d"]  = len(novos_7d)
        stats["novos_14d"] = len(novos_14d)
        stats["crescimento_semanal"] = round(
            ((len(novos_7d) - (len(novos_14d) - len(novos_7d))) /
             max(len(novos_14d) - len(novos_7d), 1)) * 100, 1
        )

        # ── Engajamento por dia (últimos 14 dias) ──
        engagement_daily = {}
        for i in range(14):
            day = (now - timedelta(days=i)).strftime("%d/%m")
            cutoff_start = (now - timedelta(days=i+1)).isoformat()
            cutoff_end   = (now - timedelta(days=i)).isoformat()
            count = len([u for u in users
                         if cutoff_start <= u.get("updated_at","") < cutoff_end])
            engagement_daily[day] = count
        stats["engagement_daily"] = dict(reversed(list(engagement_daily.items())))

        # ── Médias financeiras ──
        rendas    = [u["last_renda"]  for u in users if u.get("last_renda")]
        gastos    = [u["last_gastos"] for u in users if u.get("last_gastos")]
        poupancas = [u["avg_savings"] for u in users if u.get("avg_savings")]
        stats["avg_renda"]   = round(sum(rendas)    / len(rendas),    2) if rendas    else 0
        stats["avg_gastos"]  = round(sum(gastos)    / len(gastos),    2) if gastos    else 0
        stats["avg_savings"] = round(sum(poupancas) / len(poupancas), 2) if poupancas else 0

        # ── Tendências ──
        trends = [u.get("trend","inicial") for u in users]
        stats["trend_dist"] = {t: trends.count(t) for t in set(trends)}

        # ── Scores ──
        scores = []
        for u in users:
            r = u.get("last_renda", 0) or 0
            g = u.get("last_gastos", 0) or 0
            t = u.get("trend","inicial")
            if r > 0:
                scores.append(financial_score(r, g, t))
        stats["avg_score"] = round(sum(scores) / len(scores), 1) if scores else 0
        stats["scores"] = scores

        # ── Perfis ──
        perfis = []
        for u in users:
            r = u.get("last_renda", 0) or 0
            g = u.get("last_gastos", 0) or 0
            if r > 0:
                perfis.append(classify_user(r, g))
        stats["perfil_dist"] = {p: perfis.count(p) for p in set(perfis)}

        # ── Transações ──
        res_t = supabase.table("transactions").select("*").execute()
        transacoes = res_t.data or []
        stats["total_transactions"] = len(transacoes)
        stats["total_volume"] = sum(t["valor"] for t in transacoes if t.get("valor"))
        cats = [t["categoria"] for t in transacoes if t.get("categoria")]
        stats["cat_dist"] = {c: cats.count(c) for c in set(cats)}

        # Transações últimos 7 dias
        trans_7d = [t for t in transacoes if t.get("date","") >= d7[:10]]
        stats["trans_7d"] = len(trans_7d)

        # ── Metas ──
        res_m = supabase.table("metas").select("*").execute()
        metas_all = res_m.data or []
        stats["total_metas"] = len(metas_all)
        stats["metas_concluidas"] = len([m for m in metas_all if m.get("concluida")])

    except Exception as e:
        st.error(f"Erro ao carregar stats: {e}")

    return stats


def page_admin():
    inject_css()

    st.markdown("""
    <div style='font-family:Syne,sans-serif;font-size:2rem;font-weight:800;
    background:linear-gradient(135deg,#f59e0b,#ef4444);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    margin-bottom:0.5rem'>
    ⚙️ iMoney Admin
    </div>
    <p style='color:#6b7280;margin-bottom:1.5rem'>Dashboard de administração — visão consolidada</p>
    """, unsafe_allow_html=True)

    if st.button("🔄 Atualizar dados"):
        st.rerun()

    with st.spinner("Carregando dados..."):
        s = load_admin_stats()

    if not s:
        st.error("Não foi possível carregar os dados.")
        return

    # ── ABAS DO ADMIN ──
    tab_ret, tab_users, tab_engage, tab_financeiro = st.tabs([
        "📈 Retenção", "👥 Usuários", "💬 Engajamento", "💰 Financeiro"
    ])

    # ══════════════════════════════════
    # ABA 1: RETENÇÃO
    # ══════════════════════════════════
    with tab_ret:
        st.markdown("### 📈 Métricas de Retenção")
        st.caption("Indicadores usados por investidores para avaliar saúde do produto")

        # KPIs de retenção
        ret7 = s.get("retencao_7d", 0)
        ret30 = s.get("retencao_30d", 0)
        dau_mau = s.get("dau_mau", 0)
        churn = s.get("churn_rate", 0)
        cresc = s.get("crescimento_semanal", 0)
        st.markdown(f"""
        <div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:12px;'>
            <div class="metric-card"><h3>Retenção D7</h3>
                <div class="value">{ret7}%</div><div class="sub">benchmark: >40%</div></div>
            <div class="metric-card"><h3>Retenção D30</h3>
                <div class="value">{ret30}%</div><div class="sub">benchmark: >20%</div></div>
            <div class="metric-card"><h3>DAU/MAU</h3>
                <div class="value">{dau_mau}%</div><div class="sub">stickiness</div></div>
            <div class="metric-card"><h3>Churn Rate</h3>
                <div class="value">{churn}%</div><div class="sub">{s.get("churned",0)} inativos</div></div>
            <div class="metric-card"><h3>Crescimento</h3>
                <div class="value">{cresc:+.0f}%</div><div class="sub">sem. vs sem. anterior</div></div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # Gauge de saúde do produto
        ret7 = s.get("retencao_7d", 0)
        if ret7 >= 40:
            saude_cor, saude_label, saude_emoji = "#10b981", "EXCELENTE", "🚀"
        elif ret7 >= 20:
            saude_cor, saude_label, saude_emoji = "#f59e0b", "BOM", "📈"
        elif ret7 >= 10:
            saude_cor, saude_label, saude_emoji = "#f97316", "REGULAR", "⚠️"
        else:
            saude_cor, saude_label, saude_emoji = "#ef4444", "CRÍTICO", "🔴"

        st.markdown(f"""
        <div style='background:rgba(15,45,26,0.5);border:1px solid rgba(26,158,92,0.2);
        border-radius:16px;padding:20px 28px;margin-bottom:16px;
        display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;'>
            <div>
                <div style='font-size:0.75rem;color:#6b9e80;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;'>
                    Saúde Geral do Produto
                </div>
                <div style='font-family:Georgia,serif;font-size:2.2rem;font-weight:700;color:{saude_cor};'>
                    {saude_emoji} {saude_label}
                </div>
            </div>
            <div style='display:flex;gap:28px;flex-wrap:wrap;'>
                <div style='text-align:center;'>
                    <div style='font-size:1.6rem;font-weight:700;color:#34c17a;'>{s.get("active_users_1d",0)}</div>
                    <div style='font-size:0.75rem;color:#6b9e80;'>Ativos hoje</div>
                </div>
                <div style='text-align:center;'>
                    <div style='font-size:1.6rem;font-weight:700;color:#f0b429;'>{s.get("active_users_7d",0)}</div>
                    <div style='font-size:0.75rem;color:#6b9e80;'>Ativos 7d</div>
                </div>
                <div style='text-align:center;'>
                    <div style='font-size:1.6rem;font-weight:700;color:#e8f5ee;'>{s.get("active_users_30d",0)}</div>
                    <div style='font-size:0.75rem;color:#6b9e80;'>Ativos 30d</div>
                </div>
                <div style='text-align:center;'>
                    <div style='font-size:1.6rem;font-weight:700;color:#ef4444;'>{s.get("churned",0)}</div>
                    <div style='font-size:0.75rem;color:#6b9e80;'>Churned</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Gráfico de engajamento diário (14 dias)
        eng = s.get("engagement_daily", {})
        if eng:
            st.markdown("**📊 Usuários Ativos por Dia (últimos 14 dias)**")
            fig_eng = go.Figure(go.Bar(
                x=list(eng.keys()),
                y=list(eng.values()),
                marker=dict(
                    color=list(eng.values()),
                    colorscale=[[0,"#0f2d1a"],[0.5,"#1a9e5c"],[1,"#f0b429"]],
                    showscale=False,
                ),
                text=list(eng.values()),
                textposition="outside",
                textfont=dict(color="#9ca3af", size=10),
            ))
            fig_eng.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#9ca3af"), height=260,
                margin=dict(t=30,b=10,l=10,r=10),
                xaxis=dict(gridcolor="rgba(26,158,92,0.1)"),
                yaxis=dict(gridcolor="rgba(26,158,92,0.1)", title="usuários"),
            )
            st.plotly_chart(fig_eng, use_container_width=True, key="admin_engagement_daily")

        # Benchmarks de referência
        st.markdown("**📚 Benchmarks de Mercado**")
        bench_data = {
            "Métrica": ["Retenção D7", "Retenção D30", "DAU/MAU", "Churn mensal"],
            "iMoney": [f"{s.get('retencao_7d',0)}%", f"{s.get('retencao_30d',0)}%",
                       f"{s.get('dau_mau',0)}%", f"{s.get('churn_rate',0)}%"],
            "Bom (fintech)": [">40%", ">20%", ">20%", "<5%"],
            "Ótimo (top app)": [">60%", ">40%", ">50%", "<2%"],
        }
        st.dataframe(pd.DataFrame(bench_data), use_container_width=True, hide_index=True)

    # ══════════════════════════════════
    # ABA 2: USUÁRIOS
    # ══════════════════════════════════
    with tab_users:
        st.markdown("### 👥 Visão de Usuários")

        c1, c2, c3, c4, c5 = st.columns(5)
        with c1: metric_card("Total", str(s.get("total_users", 0)))
        with c2: metric_card("Ativos 7d", str(s.get("active_users_7d", 0)))
        with c3: metric_card("Score Médio", f"{s.get('avg_score', 0)}/100")
        with c4: metric_card("Renda Média", f"R$ {s.get('avg_renda', 0):,.0f}")
        with c5: metric_card("Sobra Média", f"R$ {s.get('avg_savings', 0):,.0f}")

        st.markdown("<br>", unsafe_allow_html=True)
        col_a, col_b = st.columns(2)

        with col_a:
            st.markdown("**Distribuição de Perfis**")
            perfil_dist = s.get("perfil_dist", {})
            if perfil_dist:
                fig = go.Figure(go.Pie(
                    labels=list(perfil_dist.keys()),
                    values=list(perfil_dist.values()),
                    hole=0.5,
                    marker=dict(colors=["#ef4444","#f59e0b","#3b82f6","#10b981"]),
                    textinfo="label+percent",
                    textfont=dict(color="white"),
                ))
                fig.update_layout(paper_bgcolor="rgba(0,0,0,0)",plot_bgcolor="rgba(0,0,0,0)",
                    showlegend=False,height=260,margin=dict(t=10,b=10,l=10,r=10))
                st.plotly_chart(fig, use_container_width=True, key="admin_perfis_pie")

        with col_b:
            st.markdown("**Tendências Financeiras**")
            trend_dist = s.get("trend_dist", {})
            if trend_dist:
                cores_trend = {"melhorando":"#10b981","piorando":"#ef4444","estável":"#f59e0b","inicial":"#6b7280"}
                fig2 = go.Figure(go.Bar(
                    x=list(trend_dist.keys()), y=list(trend_dist.values()),
                    marker_color=[cores_trend.get(k,"#6b7280") for k in trend_dist.keys()],
                    text=list(trend_dist.values()), textposition="outside",
                ))
                fig2.update_layout(paper_bgcolor="rgba(0,0,0,0)",plot_bgcolor="rgba(0,0,0,0)",
                    font=dict(color="#9ca3af"),height=260,margin=dict(t=10,b=30,l=10,r=10),
                    xaxis=dict(gridcolor="#1f2937"),yaxis=dict(gridcolor="#1f2937"))
                st.plotly_chart(fig2, use_container_width=True, key="admin_tendencias_bar")

        # Tabela de usuários
        st.markdown("**📋 Lista de Usuários**")
        users_data = s.get("users_data", [])
        if users_data:
            rows = []
            for u in users_data:
                r = u.get("last_renda", 0) or 0
                g = u.get("last_gastos", 0) or 0
                t = u.get("trend","inicial")
                updated = u.get("updated_at","")[:10]
                from datetime import timedelta
                ativo = "🟢 Ativo" if updated >= (datetime.utcnow()-timedelta(days=7)).strftime("%Y-%m-%d") else "🔴 Inativo"
                rows.append({
                    "ID": str(u.get("user_id",""))[:8]+"...",
                    "Status": ativo,
                    "Renda": f"R$ {r:,.0f}",
                    "Gastos": f"R$ {g:,.0f}",
                    "Sobra": f"R$ {r-g:,.0f}",
                    "Score": financial_score(r,g,t) if r>0 else 0,
                    "Perfil": classify_user(r,g) if r>0 else "-",
                    "Tendência": t,
                    "Última atividade": updated,
                })
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # ══════════════════════════════════
    # ABA 3: ENGAJAMENTO
    # ══════════════════════════════════
    with tab_engage:
        st.markdown("### 💬 Engajamento & Uso")

        st.markdown(f"""
        <div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:12px;'>
            <div class="metric-card"><h3>Transações 7d</h3><div class="value">{s.get("trans_7d", 0)}</div></div>
            <div class="metric-card"><h3>Total Transações</h3><div class="value">{s.get("total_transactions", 0)}</div></div>
            <div class="metric-card"><h3>Volume Total</h3><div class="value">R$ {s.get("total_volume", 0):,.0f}</div></div>
            <div class="metric-card"><h3>Metas Criadas</h3><div class="value">{s.get("total_metas", 0)}</div>
                <div class="sub">{s.get("metas_concluidas", 0)} concluídas</div></div>
        </div>
        """, unsafe_allow_html=True)

        # Scores histogram
        scores = s.get("scores", [])
        if scores:
            st.markdown("**Distribuição de Scores Financeiros**")
            fig3 = go.Figure(go.Histogram(
                x=scores, nbinsx=10,
                marker_color="#1a9e5c", opacity=0.85,
            ))
            fig3.update_layout(paper_bgcolor="rgba(0,0,0,0)",plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#9ca3af"),height=220,margin=dict(t=10,b=30,l=10,r=10),
                xaxis=dict(title="Score",gridcolor="#1f2937"),
                yaxis=dict(title="Usuários",gridcolor="#1f2937"))
            st.plotly_chart(fig3, use_container_width=True, key="admin_scores_hist")

        # Categorias
        cat_dist = s.get("cat_dist", {})
        if cat_dist:
            st.markdown("**Categorias de Gastos Mais Registradas**")
            df_cat = pd.DataFrame(list(cat_dist.items()), columns=["Categoria","Transações"]).sort_values("Transações",ascending=True)
            fig4 = go.Figure(go.Bar(
                x=df_cat["Transações"], y=df_cat["Categoria"],
                orientation="h", marker_color="#7c3aed",
                text=df_cat["Transações"], textposition="outside",
            ))
            fig4.update_layout(paper_bgcolor="rgba(0,0,0,0)",plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#9ca3af"),height=300,margin=dict(t=10,b=10,l=10,r=40),
                xaxis=dict(gridcolor="#1f2937"),yaxis=dict(gridcolor="#1f2937"))
            st.plotly_chart(fig4, use_container_width=True, key="admin_categorias_bar")

    # ══════════════════════════════════
    # ABA 4: FINANCEIRO
    # ══════════════════════════════════
    with tab_financeiro:
        st.markdown("### 💰 Indicadores Financeiros dos Usuários")

        st.markdown(f"""
        <div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px;'>
            <div class="metric-card"><h3>Renda Média</h3>
                <div class="value">R$ {s.get("avg_renda",0):,.0f}</div><div class="sub">por usuário/mês</div></div>
            <div class="metric-card"><h3>Gastos Médios</h3>
                <div class="value">R$ {s.get("avg_gastos",0):,.0f}</div><div class="sub">por usuário/mês</div></div>
            <div class="metric-card"><h3>Sobra Média</h3>
                <div class="value">R$ {s.get("avg_savings",0):,.0f}</div><div class="sub">potencial de investimento</div></div>
        </div>
        """, unsafe_allow_html=True)

        # Taxa comprometimento médio
        avg_r = s.get("avg_renda", 1) or 1
        avg_g = s.get("avg_gastos", 0)
        taxa_media = round((avg_g / avg_r) * 100, 1)
        st.markdown("<br>", unsafe_allow_html=True)
        st.markdown(f"""
        <div style='background:rgba(15,45,26,0.5);border:1px solid rgba(26,158,92,0.2);
        border-radius:12px;padding:16px 24px;'>
            <div style='font-size:0.75rem;color:#6b9e80;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;'>
                Taxa média de comprometimento da renda
            </div>
            <div style='font-size:2rem;font-weight:700;color:{"#ef4444" if taxa_media > 80 else "#f59e0b" if taxa_media > 60 else "#10b981"};'>
                {taxa_media}%
            </div>
            <div style='font-size:0.82rem;color:#6b9e80;margin-top:4px;'>
                {"⚠️ Base de usuários em situação crítica" if taxa_media > 80 else "📊 Base equilibrada" if taxa_media > 60 else "✅ Base com bom potencial de investimento"}
            </div>
        </div>
        """, unsafe_allow_html=True)

    # ── Scores histogram ──
    scores = s.get("scores", [])
    if scores:
        st.markdown("**Distribuição de Scores Financeiros**")
        fig3 = go.Figure(go.Histogram(
            x=scores, nbinsx=10,
            marker_color="#1d4ed8",
            opacity=0.85,
        ))
        fig3.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#9ca3af"), height=220,
            margin=dict(t=10,b=30,l=10,r=10),
            xaxis=dict(title="Score", gridcolor="#1f2937"),
            yaxis=dict(title="Usuários", gridcolor="#1f2937"),
        )
        st.plotly_chart(fig3, use_container_width=True, key="engage_scores_hist")

    # ── Categorias de gastos ──
    cat_dist = s.get("cat_dist", {})
    if cat_dist:
        st.markdown("**Categorias de Gastos Mais Registradas**")
        df_cat = pd.DataFrame(list(cat_dist.items()), columns=["Categoria", "Transações"]).sort_values("Transações", ascending=True)
        fig4 = go.Figure(go.Bar(
            x=df_cat["Transações"], y=df_cat["Categoria"],
            orientation="h",
            marker_color="#7c3aed",
            text=df_cat["Transações"], textposition="outside",
        ))
        fig4.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#9ca3af"), height=300,
            margin=dict(t=10,b=10,l=10,r=40),
            xaxis=dict(gridcolor="#1f2937"),
            yaxis=dict(gridcolor="#1f2937"),
        )
        st.plotly_chart(fig4, use_container_width=True, key="engage_cat_bar")

    # ── Tabela de usuários ──
    st.markdown("### 📋 Lista de Usuários")
    users_data = s.get("users_data", [])
    if users_data:
        rows = []
        for u in users_data:
            r = u.get("last_renda", 0) or 0
            g = u.get("last_gastos", 0) or 0
            t = u.get("trend", "inicial")
            rows.append({
                "user_id": str(u.get("user_id", ""))[:8] + "...",
                "Renda": f"R$ {r:,.0f}",
                "Gastos": f"R$ {g:,.0f}",
                "Sobra": f"R$ {r-g:,.0f}",
                "Score": financial_score(r, g, t) if r > 0 else 0,
                "Perfil": classify_user(r, g) if r > 0 else "-",
                "Tendência": t,
                "Atualizado": u.get("updated_at", "")[:10],
            })
        df_users = pd.DataFrame(rows)
        st.dataframe(df_users, use_container_width=True, hide_index=True)
    else:
        st.info("Nenhum usuário com dados ainda.")

    st.markdown("---")
    if st.button("🚪 Sair do Admin"):
        st.session_state["admin_auth"] = False
        st.rerun()


def page_admin_login():
    st.markdown("""
    <div style='text-align:center;padding:3rem 0 1rem'>
        <div style='font-family:Syne,sans-serif;font-size:2.5rem;font-weight:800;
        background:linear-gradient(135deg,#f59e0b,#ef4444);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;'>
        ⚙️ Admin iMoney
        </div>
        <p style='color:#6b7280'>Acesso restrito</p>
    </div>
    """, unsafe_allow_html=True)

    col = st.columns([1, 1, 1])[1]
    with col:
        senha = st.text_input("Senha de administrador", type="password")
        if st.button("Entrar", use_container_width=True):
            admin_pass = st.secrets.get("ADMIN_PASSWORD", "imoney@admin2024")
            if senha == admin_pass:
                st.session_state["admin_auth"] = True
                st.session_state["admin_auth_time"] = time.time()
                st.rerun()
            else:
                st.error("Senha incorreta.")

# =========================
# ROUTER
# =========================
query_params = st.query_params
is_admin_route = query_params.get("page") == "admin"

if is_admin_route:
    if "admin_auth" not in st.session_state:
        st.session_state["admin_auth"] = False
    if verify_admin_session():
        page_admin()
    else:
        page_admin_login()
elif get_user_id() is None:
    page_login()
else:
    page_app()
