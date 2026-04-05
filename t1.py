import streamlit as st
from supabase import create_client
from openai import OpenAI
import requests

# =========================
# CONFIG
# =========================
st.set_page_config(page_title="iMoney", page_icon="💰", layout="wide")

SUPABASE_URL = st.secrets["SUPABASE_URL"]
SUPABASE_KEY = st.secrets["SUPABASE_KEY"]
OPENAI_KEY = st.secrets["OPENAI_API_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
client = OpenAI(api_key=OPENAI_KEY)

# =========================
# SESSION
# =========================
if "user" not in st.session_state:
    st.session_state.user = None

if "messages" not in st.session_state:
    st.session_state.messages = []

# =========================
# SELIC (ANNUAL FIXED)
# =========================
def get_selic_annual():
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json"
        data = requests.get(url).json()

        daily_rate = float(data[0]["valor"])

        # Convert daily → annual
        annual_rate = ((1 + daily_rate / 100) ** 252 - 1) * 100

        return round(annual_rate, 2)

    except:
        return None

# =========================
# MEMORY
# =========================
def load_memory(user_id):
    res = supabase.table("user_memory").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None


def save_memory(user_id, renda, gastos):
    sobra = renda - gastos
    memory = load_memory(user_id)

    if memory:
        prev = memory.get("avg_savings", 0)
        avg = (prev + sobra) / 2
        trend = "melhorando" if sobra > prev else "piorando"
    else:
        avg = sobra
        trend = "inicial"

    supabase.table("user_memory").upsert({
        "user_id": user_id,
        "last_renda": renda,
        "last_gastos": gastos,
        "avg_savings": avg,
        "trend": trend
    }).execute()

    return trend, avg

# =========================
# SMART ENGINE
# =========================
def classify_user(renda, gastos):
    taxa = (gastos / renda) if renda > 0 else 1

    if taxa > 0.9:
        return "sobrevivencia"
    elif taxa > 0.75:
        return "instavel"
    elif taxa > 0.6:
        return "equilibrado"
    else:
        return "crescimento"


def financial_score(renda, gastos, trend):
    sobra = renda - gastos
    taxa = (gastos / renda) if renda > 0 else 1

    score = 100
    score -= taxa * 70

    if sobra > 0:
        score += min((sobra / renda) * 30, 20)

    if trend == "melhorando":
        score += 10
    elif trend == "piorando":
        score -= 15

    return max(0, min(100, int(score)))


def next_best_action(profile, selic):
    if profile == "sobrevivencia":
        return "Corte imediato de gastos e organização financeira urgente."

    if selic and selic > 10:
        return "Priorize renda fixa (Tesouro Selic, CDBs pós-fixados)."

    if profile == "crescimento":
        return "Diversifique entre renda fixa e variável."

    return "Comece com investimentos seguros e consistentes."

# =========================
# AI DECISION ENGINE
# =========================
def decision_agent(prompt, renda, gastos, trend, profile, score, action, selic):
    sobra = renda - gastos

    context = f"""
    Você é o iMoney, um sistema avançado de decisão financeira.

    CENÁRIO MACRO:
    SELIC anual: {selic}%

    PERFIL DO USUÁRIO:
    - Perfil: {profile}
    - Score: {score}/100
    - Tendência: {trend}

    DADOS FINANCEIROS:
    - Renda: {renda}
    - Gastos: {gastos}
    - Sobra: {sobra}

    MELHOR AÇÃO ATUAL:
    {action}

    INSTRUÇÕES:
    - Seja direto e estratégico
    - Evite explicações genéricas
    - Dê decisões claras
    - Pense como um gestor financeiro

    FORMATO:
    Diagnóstico:
    Decisão:
    Impacto:
    """

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": context},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content

# =========================
# AUTH
# =========================
def login():
    st.title("🔐 Login - iMoney")

    email = st.text_input("Email")
    password = st.text_input("Senha", type="password")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Login"):
            try:
                res = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })

                if res.user:
                    st.session_state.user = res.user
                    st.success("Login realizado!")
                    st.rerun()
                else:
                    st.error("Credenciais inválidas.")

            except Exception as e:
                st.error(f"Erro real: {e}")

    with col2:
        if st.button("Criar conta"):
            try:
                res = supabase.auth.sign_up({
                    "email": email,
                    "password": password
                })

                if res.user:
                    st.session_state.user = res.user
                    st.success("Conta criada e logado!")
                    st.rerun()
                else:
                    st.warning("Verifique seu email.")

            except Exception as e:
                st.error(f"Erro real: {e}")

# =========================
# APP
# =========================
def app():
    user = st.session_state.user

    st.sidebar.write(f"👤 {user.email}")

    if st.sidebar.button("Logout"):
        st.session_state.user = None
        st.session_state.messages = []
        st.rerun()

    st.title("💰 iMoney")

    renda = st.number_input("Renda mensal (R$)", value=2000)
    gastos = st.number_input("Gastos mensais (R$)", value=1500)

    sobra = renda - gastos
    taxa = (gastos / renda) * 100 if renda > 0 else 0

    st.write(f"📊 Renda: R${renda}")
    st.write(f"💸 Gastos: R${gastos}")
    st.write(f"💰 Sobra: R${sobra}")
    st.write(f"📉 Taxa de gastos: {taxa:.1f}%")

    selic = get_selic_annual()
    if selic:
        st.write(f"📉 SELIC anual: {selic}%")

    trend, avg = save_memory(user.id, renda, gastos)

    profile = classify_user(renda, gastos)
    score = financial_score(renda, gastos, trend)
    action = next_best_action(profile, selic)

    st.subheader("🧠 Avaliação Inteligente")
    st.write(f"Score: {score}/100")
    st.write(f"Perfil: {profile}")
    st.write(f"Tendência: {trend}")
    st.write(f"Melhor ação: {action}")

    for msg in st.session_state.messages:
        st.chat_message(msg["role"]).write(msg["content"])

    prompt = st.chat_input("Pergunte algo...")

    if prompt:
        st.session_state.messages.append({"role": "user", "content": prompt})
        st.chat_message("user").write(prompt)

        try:
            answer = decision_agent(
                prompt,
                renda,
                gastos,
                trend,
                profile,
                score,
                action,
                selic
            )

            st.session_state.messages.append({
                "role": "assistant",
                "content": answer
            })

            st.chat_message("assistant").write(answer)

        except Exception as e:
            st.error(f"Erro na IA: {e}")

# =========================
# ROUTER
# =========================
if st.session_state.user is None:
    login()
else:
    app()
