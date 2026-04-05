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
# BACEN API (SELIC)
# =========================
def get_selic_rate():
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json"
        data = requests.get(url).json()
        return float(data[0]["valor"])
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
        return "Corte imediato de gastos e organize suas contas."

    if selic and selic > 10:
        return "Priorize renda fixa (Tesouro Selic, CDB)."

    if profile == "crescimento":
        return "Diversifique (ações + renda fixa)."

    return "Comece com investimentos seguros."

# =========================
# AI DECISION
# =========================
def decision_agent(prompt, renda, gastos, trend, profile, score, action, selic):
    sobra = renda - gastos

    context = f"""
    Você é o iMoney, um sistema inteligente financeiro.

    CENÁRIO:
    SELIC: {selic}%

    USUÁRIO:
    Perfil: {profile}
    Score: {score}
    Tendência: {trend}

    DADOS:
    Renda: {renda}
    Gastos: {gastos}
    Sobra: {sobra}

    MELHOR AÇÃO:
    {action}

    REGRAS:
    - Seja direto
    - Use o cenário econômico
    - Dê decisão clara

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
# LOGIN
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
                st.session_state.user = res.user
                st.rerun()
            except:
                st.error("Erro no login")

    with col2:
        if st.button("Criar conta"):
            try:
                supabase.auth.sign_up({
                    "email": email,
                    "password": password
                })
                st.success("Conta criada! Verifique email.")
            except:
                st.error("Erro ao criar conta")

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

    st.write(f"Renda: R${renda}")
    st.write(f"Gastos: R${gastos}")
    st.write(f"Sobra: R${sobra}")
    st.write(f"Taxa: {taxa:.1f}%")

    selic = get_selic_rate()
    if selic:
        st.write(f"📉 SELIC atual: {selic}%")

    trend, avg = save_memory(user.id, renda, gastos)

    profile = classify_user(renda, gastos)
    score = financial_score(renda, gastos, trend)
    action = next_best_action(profile, selic)

    st.subheader("🧠 Avaliação Inteligente")
    st.write(f"Score: {score}")
    st.write(f"Perfil: {profile}")
    st.write(f"Tendência: {trend}")
    st.write(f"Ação: {action}")

    for msg in st.session_state.messages:
        st.chat_message(msg["role"]).write(msg["content"])

    prompt = st.chat_input("Pergunte algo...")

    if prompt:
        st.session_state.messages.append({"role": "user", "content": prompt})
        st.chat_message("user").write(prompt)

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

# =========================
# ROUTER
# =========================
if st.session_state.user is None:
    login()
else:
    app()
