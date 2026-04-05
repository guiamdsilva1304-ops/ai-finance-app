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
# SESSION INIT
# =========================
if "user" not in st.session_state:
    st.session_state.user = None

if "messages" not in st.session_state:
    st.session_state.messages = []

# =========================
# 🔐 GET REAL AUTH USER (FIX)
# =========================
def get_user_id():
    try:
        session = supabase.auth.get_session()
        if session and session.session:
            return session.session.user.id
    except:
        return None
    return None

# =========================
# VALIDATION
# =========================
def is_valid_email(email):
    return "@" in email and "." in email


def is_valid_password(password):
    return len(password) >= 6

# =========================
# SELIC (ANNUAL)
# =========================
def get_selic_annual():
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json"
        data = requests.get(url).json()

        daily_rate = float(data[0]["valor"])
        annual_rate = ((1 + daily_rate / 100) ** 252 - 1) * 100

        return round(annual_rate, 2)
    except:
        return None

# =========================
# MEMORY (FIXED)
# =========================
def load_memory(user_id):
    try:
        res = supabase.table("user_memory") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()

        return res.data[0] if res.data else None
    except:
        return None


def save_memory(user_id, renda, gastos):
    if not user_id:
        return "erro", 0

    try:
        sobra = renda - gastos
        memory = load_memory(user_id)

        if memory:
            prev = memory.get("avg_savings", 0) or 0
            avg = (prev + sobra) / 2
            trend = "melhorando" if sobra > prev else "piorando"
        else:
            avg = sobra
            trend = "inicial"

        data = {
            "user_id": user_id,
            "last_renda": float(renda),
            "last_gastos": float(gastos),
            "avg_savings": float(avg),
            "trend": trend
        }

        supabase.table("user_memory").upsert(data).execute()

        return trend, avg

    except Exception as e:
        st.error(f"Erro memória: {e}")
        return "erro", 0

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

    return "Comece com investimentos seguros."

# =========================
# AI
# =========================
def decision_agent(prompt, renda, gastos, trend, profile, score, action, selic):
    sobra = renda - gastos

    context = f"""
    Você é o iMoney, um sistema avançado de decisão financeira.

    CENÁRIO:
    SELIC anual: {selic}%

    PERFIL:
    {profile} | Score: {score} | Tendência: {trend}

    DADOS:
    Renda: {renda}
    Gastos: {gastos}
    Sobra: {sobra}

    AÇÃO:
    {action}

    Seja direto, estratégico e prático.
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
                supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })

                st.success("Login realizado!")
                st.rerun()

            except Exception as e:
                st.error(f"Erro no login: {e}")

    with col2:
        if st.button("Criar conta"):
            try:
                supabase.auth.sign_up({
                    "email": email,
                    "password": password
                })

                st.success("Conta criada!")
                st.rerun()

            except Exception as e:
                st.error(f"Erro no cadastro: {e}")

# =========================
# APP
# =========================
def app():
    user_id = get_user_id()

    if not user_id:
        st.error("Sessão inválida. Faça login novamente.")
        st.rerun()

    st.sidebar.write(f"👤 {user_id}")

    if st.sidebar.button("Logout"):
        try:
            supabase.auth.sign_out()
        except:
            pass

        st.session_state.messages = []
        st.rerun()

    st.title("💰 iMoney")

    renda = st.number_input("Renda mensal (R$)", value=2000)
    gastos = st.number_input("Gastos mensais (R$)", value=1500)

    sobra = renda - gastos
    taxa = (gastos / renda) * 100 if renda > 0 else 0

    st.write(f"💰 Sobra: R${sobra}")
    st.write(f"📉 Taxa: {taxa:.1f}%")

    selic = get_selic_annual()
    if selic:
        st.write(f"📉 SELIC anual: {selic}%")

    trend, avg = save_memory(user_id, renda, gastos)

    profile = classify_user(renda, gastos)
    score = financial_score(renda, gastos, trend)
    action = next_best_action(profile, selic)

    st.subheader("🧠 Avaliação Inteligente")
    st.write(f"Score: {score}/100")
    st.write(f"Perfil: {profile}")
    st.write(f"Tendência: {trend}")
    st.write(f"Ação recomendada: {action}")

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
if get_user_id() is None:
    login()
else:
    app()
