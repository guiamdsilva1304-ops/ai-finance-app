import streamlit as st
from supabase import create_client
import anthropic
import requests
import json
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
    initial_sidebar_state="expanded"
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
# VALIDAÇÕES
# =========================
def is_valid_email(email):
    return "@" in email and "." in email

def is_valid_password(password):
    return len(password) >= 6

# =========================
# DADOS ECONÔMICOS
# =========================
@st.cache_data(ttl=3600)
def get_selic_annual():
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json"
        data = requests.get(url, timeout=5).json()
        daily_rate = float(data[0]["valor"])
        annual_rate = ((1 + daily_rate / 100) ** 252 - 1) * 100
        return round(annual_rate, 2)
    except:
        return 10.5  # fallback


@st.cache_data(ttl=3600)
def get_ipca():
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json"
        data = requests.get(url, timeout=5).json()
        return float(data[0]["valor"])
    except:
        return 4.5  # fallback

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


def load_transactions(user_id):
    try:
        res = supabase.table("transactions").select("*").eq("user_id", user_id).order("date", desc=True).limit(50).execute()
        return res.data or []
    except:
        return []


def save_transaction(user_id, descricao, valor, categoria, tipo):
    try:
        supabase.table("transactions").insert({
            "user_id": user_id,
            "descricao": descricao,
            "valor": float(valor),
            "categoria": categoria,
            "tipo": tipo,
            "date": date.today().isoformat(),
        }).execute()
        return True
    except Exception as e:
        st.error(f"Erro ao salvar: {e}")
        return False


def load_metas(user_id):
    try:
        res = supabase.table("metas").select("*").eq("user_id", user_id).execute()
        return res.data or []
    except:
        return []


def save_meta(user_id, nome, valor_alvo, prazo_meses):
    try:
        supabase.table("metas").insert({
            "user_id": user_id,
            "nome": nome,
            "valor_alvo": float(valor_alvo),
            "valor_atual": 0.0,
            "prazo_meses": int(prazo_meses),
            "criada_em": date.today().isoformat(),
        }).execute()
        return True
    except Exception as e:
        st.error(f"Erro ao salvar meta: {e}")
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


def agente_chat(historico, renda, gastos_total, sobra, selic, ipca, score, trend, perfil, gastos_cat, metas):
    system = f"""Você é o iMoney, o assessor financeiro pessoal mais avançado do Brasil. 
Você combina análise quantitativa rigorosa com linguagem humana e empática.

CONTEXTO DO USUÁRIO (ATUALIZADO):
- Renda mensal: R$ {renda:,.2f}
- Gastos totais: R$ {gastos_total:,.2f}  
- Sobra mensal: R$ {sobra:,.2f}
- Score financeiro: {score}/100
- Perfil: {perfil}
- Tendência: {trend}
- Gastos por categoria: {json.dumps(gastos_cat, ensure_ascii=False)}
- Metas: {json.dumps(metas, ensure_ascii=False)}

CENÁRIO MACROECONÔMICO:
- SELIC: {selic}% a.a.
- IPCA: {ipca}% a.m.
- Juros reais: {round(selic - (ipca * 12), 2)}% a.a.

CAPACIDADES:
- Você pode calcular projeções, simular cenários, comparar investimentos
- Você conhece todos os produtos financeiros brasileiros (Tesouro, CDB, LCI, LCA, FIIs, ações, etc.)
- Você entende tributação (IR, IOF), PGBL/VGBL, previdência privada
- Você pode sugerir estratégias de corte de gastos por categoria

Responda sempre em português, seja direto e use dados concretos. Quando relevante, use emojis para facilitar a leitura."""

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
# CSS CUSTOM
# =========================
def inject_css():
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');

    html, body, [class*="css"] {
        font-family: 'DM Sans', sans-serif;
    }
    h1, h2, h3 { font-family: 'Syne', sans-serif; }

    .main { background: #0a0e1a; }

    .metric-card {
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        border: 1px solid #374151;
        border-radius: 16px;
        padding: 1.2rem 1.5rem;
        margin-bottom: 1rem;
    }
    .metric-card h3 { color: #9ca3af; font-size: 0.8rem; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 0.3rem; }
    .metric-card .value { font-family: 'Syne', sans-serif; font-size: 1.8rem; font-weight: 800; color: #f9fafb; }
    .metric-card .sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.2rem; }

    .score-ring {
        display: flex; align-items: center; gap: 1rem;
        background: #111827; border-radius: 16px; padding: 1rem 1.5rem;
        border: 1px solid #374151;
    }
    .score-number { font-family: 'Syne', sans-serif; font-size: 3rem; font-weight: 800; }

    .chat-msg-user {
        background: #1d4ed8; color: white;
        border-radius: 18px 18px 4px 18px;
        padding: 0.8rem 1.2rem; margin: 0.5rem 0;
        max-width: 80%; margin-left: auto;
        overflow: visible; white-space: pre-wrap;
        word-wrap: break-word;
    }
    .chat-msg-ai {
        background: #1f2937; color: #f3f4f6;
        border-radius: 18px 18px 18px 4px;
        padding: 0.8rem 1.2rem; margin: 0.5rem 0;
        max-width: 100%; border: 1px solid #374151;
        overflow: visible; white-space: pre-wrap;
        word-wrap: break-word;
    }

    .stButton > button {
        background: linear-gradient(135deg, #1d4ed8, #7c3aed);
        color: white; border: none; border-radius: 10px;
        font-family: 'Syne', sans-serif; font-weight: 700;
        transition: all 0.2s;
    }
    .stButton > button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(29,78,216,0.4); }

    div[data-testid="stSidebar"] { background: #111827; border-right: 1px solid #374151; }
    /* Fix chat overflow */
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
    }
    div[data-testid="stChatMessage"] table {
        width: 100% !important;
        table-layout: auto !important;
        display: block !important;
        overflow-x: auto !important;
    }
    div[data-testid="stVerticalBlock"] {
        max-width: 100% !important;
    }
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
    st.plotly_chart(fig, use_container_width=True)


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
    st.plotly_chart(fig, use_container_width=True)

# =========================
# PÁGINA: LOGIN
# =========================
def page_login():
    st.markdown("""
    <div style="text-align:center; padding: 3rem 0 1rem;">
        <div style="font-family:'Syne',sans-serif;font-size:3.5rem;font-weight:800;background:linear-gradient(135deg,#1d4ed8,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            iMoney
        </div>
        <p style="color:#6b7280;margin-top:0.5rem">Assessoria financeira inteligente com IA</p>
    </div>
    """, unsafe_allow_html=True)

    col = st.columns([1, 1.2, 1])[1]
    with col:
        aba = st.tabs(["🔑 Entrar", "✨ Criar conta"])

        with aba[0]:
            email = st.text_input("Email", key="login_email")
            senha = st.text_input("Senha", type="password", key="login_senha")
            if st.button("Entrar", use_container_width=True):
                if not is_valid_email(email):
                    st.error("Email inválido")
                elif not is_valid_password(senha):
                    st.error("Senha muito curta")
                else:
                    try:
                        res = supabase.auth.sign_in_with_password({"email": email, "password": senha})
                        if res and res.user:
                            st.session_state["user_id"] = res.user.id
                            st.session_state["user_email"] = res.user.email
                            st.rerun()
                        else:
                            st.error("Credenciais inválidas.")
                    except Exception as e:
                        st.error(f"Erro: {e}")

        with aba[1]:
            email2 = st.text_input("Email", key="reg_email")
            senha2 = st.text_input("Senha (mín. 6 caracteres)", type="password", key="reg_senha")
            if st.button("Criar conta", use_container_width=True):
                if not is_valid_email(email2):
                    st.error("Email inválido")
                elif not is_valid_password(senha2):
                    st.error("Senha deve ter mínimo 6 caracteres")
                else:
                    try:
                        supabase.auth.sign_up({"email": email2, "password": senha2})
                        st.success("Conta criada! Verifique seu email.")
                    except Exception as e:
                        st.error(f"Erro: {e}")

# =========================
# PÁGINA: APP PRINCIPAL
# =========================
def page_app():
    user_id = get_user_id()
    email = get_user_email() or user_id

    inject_css()

    # --- SIDEBAR ---
    with st.sidebar:
        st.markdown(f"<div style='font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800;color:#f9fafb;'>💰 iMoney</div>", unsafe_allow_html=True)
        st.markdown(f"<div style='color:#6b7280;font-size:0.8rem;margin-bottom:1.5rem'>{email}</div>", unsafe_allow_html=True)

        st.markdown("### 💼 Dados Financeiros")
        renda = st.number_input("Renda mensal (R$)", min_value=0.0, value=5000.0, step=100.0, format="%.2f")

        st.markdown("**Gastos por categoria:**")
        gastos_cat = {}
        for cat in CATEGORIAS:
            val = st.number_input(cat, min_value=0.0, value=0.0, step=50.0, format="%.2f", key=f"gasto_{cat}", label_visibility="visible")
            if val > 0:
                gastos_cat[cat] = val

        gastos_total = sum(gastos_cat.values())
        sobra = renda - gastos_total

        st.divider()
        if st.button("🚪 Sair", use_container_width=True):
            try: supabase.auth.sign_out()
            except: pass
            st.session_state.messages = []
            st.rerun()

    # --- DADOS MACRO ---
    selic = get_selic_annual()
    ipca = get_ipca()

    # --- MEMÓRIA ---
    trend, avg_savings = save_memory(user_id, renda, gastos_total, gastos_cat)

    # --- ENGINE ---
    perfil = classify_user(renda, gastos_total)
    score = financial_score(renda, gastos_total, trend)
    metas = load_metas(user_id)

    # --- ABAS ---
    tab1, tab2, tab3, tab4 = st.tabs(["📊 Dashboard", "💬 Assessor IA", "📝 Transações", "🎯 Metas"])

    # ========================
    # TAB 1: DASHBOARD
    # ========================
    with tab1:
        st.markdown("## Visão Geral")

        c1, c2, c3, c4 = st.columns(4)
        with c1: metric_card("Renda Mensal", f"R$ {renda:,.0f}")
        with c2: metric_card("Gastos Totais", f"R$ {gastos_total:,.0f}", f"{(gastos_total/renda*100):.1f}% da renda" if renda else "")
        with c3:
            cor_sobra = "🟢" if sobra > 0 else "🔴"
            metric_card("Sobra Mensal", f"{cor_sobra} R$ {abs(sobra):,.0f}", "disponível para investir" if sobra > 0 else "DÉFICIT")
        with c4: metric_card("SELIC", f"{selic}% a.a.", f"IPCA: {ipca}% a.m.")

        st.markdown("<br>", unsafe_allow_html=True)
        col_score, col_pie = st.columns([1, 1.5])

        with col_score:
            score_card(score, perfil, trend)
            st.markdown("<br>", unsafe_allow_html=True)

            if sobra > 0:
                projecao_1a = calcular_projecao(sobra, 12, selic)
                projecao_3a = calcular_projecao(sobra, 36, selic)
                metric_card("Projeção 12 meses", f"R$ {projecao_1a:,.0f}", "investindo a sobra mensal")
                metric_card("Projeção 3 anos", f"R$ {projecao_3a:,.0f}", "com juros compostos")

        with col_pie:
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

        # Processa pergunta
        if pergunta_final:
            st.session_state.messages.append({"role": "user", "content": pergunta_final})
            with st.spinner("Analisando..."):
                try:
                    resposta = agente_chat(
                        st.session_state.messages, renda, gastos_total,
                        sobra, selic, ipca, score, trend, perfil, gastos_cat, metas
                    )
                    st.session_state.messages.append({"role": "assistant", "content": resposta})
                except Exception as e:
                    st.session_state.messages.append({"role": "assistant", "content": f"Erro ao processar: {e}"})
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
                t_valor = st.number_input("Valor (R$)", min_value=0.01, value=100.0)
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

# =========================
# ROUTER
# =========================
query_params = st.query_params
is_admin_route = query_params.get("page") == "admin"

if is_admin_route:
    if "admin_auth" not in st.session_state:
        st.session_state["admin_auth"] = False
    if st.session_state["admin_auth"]:
        page_admin()
    else:
        page_admin_login()
elif get_user_id() is None:
    page_login()
else:
    page_app()


# =========================
# ADMIN DASHBOARD
# =========================
def load_admin_stats():
    """Carrega todas as estatísticas do banco para o admin."""
    stats = {}
    try:
        # Total de usuários (via user_memory)
        res = supabase.table("user_memory").select("*").execute()
        users = res.data or []
        stats["total_users"] = len(users)

        # Usuários ativos (atualizados nos últimos 7 dias)
        from datetime import timedelta
        cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
        ativos = [u for u in users if u.get("updated_at", "") >= cutoff]
        stats["active_users_7d"] = len(ativos)

        # Médias financeiras
        rendas = [u["last_renda"] for u in users if u.get("last_renda")]
        gastos = [u["last_gastos"] for u in users if u.get("last_gastos")]
        poupancas = [u["avg_savings"] for u in users if u.get("avg_savings")]
        stats["avg_renda"] = round(sum(rendas) / len(rendas), 2) if rendas else 0
        stats["avg_gastos"] = round(sum(gastos) / len(gastos), 2) if gastos else 0
        stats["avg_savings"] = round(sum(poupancas) / len(poupancas), 2) if poupancas else 0

        # Distribuição de tendências
        trends = [u.get("trend", "inicial") for u in users]
        stats["trend_dist"] = {t: trends.count(t) for t in set(trends)}

        # Scores financeiros
        scores = []
        for u in users:
            r = u.get("last_renda", 0) or 0
            g = u.get("last_gastos", 0) or 0
            t = u.get("trend", "inicial")
            if r > 0:
                scores.append(financial_score(r, g, t))
        stats["avg_score"] = round(sum(scores) / len(scores), 1) if scores else 0
        stats["scores"] = scores

        # Perfis de usuário
        perfis = []
        for u in users:
            r = u.get("last_renda", 0) or 0
            g = u.get("last_gastos", 0) or 0
            if r > 0:
                perfis.append(classify_user(r, g))
        stats["perfil_dist"] = {p: perfis.count(p) for p in set(perfis)}

        # Transações
        res_t = supabase.table("transactions").select("*").execute()
        transacoes = res_t.data or []
        stats["total_transactions"] = len(transacoes)
        stats["total_volume"] = sum(t["valor"] for t in transacoes if t.get("valor"))

        # Categorias mais usadas
        cats = [t["categoria"] for t in transacoes if t.get("categoria")]
        stats["cat_dist"] = {c: cats.count(c) for c in set(cats)}

        # Metas
        res_m = supabase.table("metas").select("*").execute()
        metas_all = res_m.data or []
        stats["total_metas"] = len(metas_all)
        stats["metas_concluidas"] = len([m for m in metas_all if m.get("concluida")])

        # Lista de usuários com dados
        stats["users_data"] = users

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
    <p style='color:#6b7280;margin-bottom:2rem'>Dashboard de administração — visão consolidada</p>
    """, unsafe_allow_html=True)

    if st.button("🔄 Atualizar dados"):
        st.rerun()

    with st.spinner("Carregando dados..."):
        s = load_admin_stats()

    if not s:
        st.error("Não foi possível carregar os dados.")
        return

    # ── LINHA 1: KPIs principais ──
    st.markdown("### 👥 Usuários")
    c1, c2, c3, c4, c5 = st.columns(5)
    with c1: metric_card("Total Usuários", str(s.get("total_users", 0)))
    with c2: metric_card("Ativos (7d)", str(s.get("active_users_7d", 0)))
    with c3: metric_card("Score Médio", f"{s.get('avg_score', 0)}/100")
    with c4: metric_card("Renda Média", f"R$ {s.get('avg_renda', 0):,.0f}")
    with c5: metric_card("Sobra Média", f"R$ {s.get('avg_savings', 0):,.0f}")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── LINHA 2: Transações e Metas ──
    st.markdown("### 💳 Transações & Metas")
    c1, c2, c3 = st.columns(3)
    with c1: metric_card("Total Transações", str(s.get("total_transactions", 0)))
    with c2: metric_card("Volume Total", f"R$ {s.get('total_volume', 0):,.0f}")
    with c3: metric_card("Metas Criadas", str(s.get("total_metas", 0)), f"{s.get('metas_concluidas', 0)} concluídas")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── LINHA 3: Gráficos ──
    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown("**Distribuição de Perfis**")
        perfil_dist = s.get("perfil_dist", {})
        if perfil_dist:
            fig = go.Figure(go.Pie(
                labels=list(perfil_dist.keys()),
                values=list(perfil_dist.values()),
                hole=0.5,
                marker=dict(colors=["#ef4444", "#f59e0b", "#3b82f6", "#10b981"]),
                textinfo="label+percent",
                textfont=dict(color="white"),
            ))
            fig.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                showlegend=False, height=260, margin=dict(t=10,b=10,l=10,r=10)
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Sem dados de perfil ainda.")

    with col_b:
        st.markdown("**Distribuição de Tendências**")
        trend_dist = s.get("trend_dist", {})
        if trend_dist:
            cores_trend = {"melhorando": "#10b981", "piorando": "#ef4444", "estável": "#f59e0b", "inicial": "#6b7280", "erro": "#374151"}
            fig2 = go.Figure(go.Bar(
                x=list(trend_dist.keys()),
                y=list(trend_dist.values()),
                marker_color=[cores_trend.get(k, "#6b7280") for k in trend_dist.keys()],
                text=list(trend_dist.values()),
                textposition="outside",
            ))
            fig2.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#9ca3af"), height=260,
                margin=dict(t=10,b=30,l=10,r=10),
                xaxis=dict(gridcolor="#1f2937"),
                yaxis=dict(gridcolor="#1f2937"),
            )
            st.plotly_chart(fig2, use_container_width=True)
        else:
            st.info("Sem dados de tendência ainda.")

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
        st.plotly_chart(fig3, use_container_width=True)

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
        st.plotly_chart(fig4, use_container_width=True)

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
                st.rerun()
            else:
                st.error("Senha incorreta.")
