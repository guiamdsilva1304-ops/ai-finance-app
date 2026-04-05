import streamlit as st
from supabase import create_client
from openai import OpenAI

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
# MEMORY SYSTEM
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
# AI AGENTS
# =========================
def analyst_agent(renda, gastos):
    sobra = renda - gastos
    taxa = (gastos / renda) * 100 if renda > 0 else 0

    return f"""
    Você é um analista financeiro.

    Dados:
    Renda: {renda}
    Gastos: {gastos}
    Sobra: {sobra}
    Taxa de gastos: {taxa:.1f}%

    Explique a situação financeira do usuário de forma clara.
    """


def strategy_agent():
    return """
    Você é um estrategista financeiro.

    Baseado na análise, gere estratégias práticas:
    - reduzir gastos
    - aumentar renda
    - investir melhor
    """


def decision_agent(prompt, renda, gastos, trend):
    sobra = renda - gastos

    context = f"""
    Você é o iMoney, um sistema inteligente de decisões financeiras.

    Dados:
    Renda: {renda}
    Gastos: {gastos}
    Sobra: {sobra}
    Tendência: {trend}

    Regras:
    - Se piorando → seja firme
    - Se melhorando → incentive crescimento
    - Dê resposta prática

    Formato:
    Diagnóstico:
    Ação:
    Próximo passo:
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
                st.session_state.user = res.user
                st.success("Logado!")
                st.rerun()
            except Exception as e:
                st.error("Erro no login")

    with col2:
        if st.button("Criar conta"):
            try:
                supabase.auth.sign_up({
                    "email": email,
                    "password": password
                })
                st.success("Conta criada! Verifique seu email.")
            except:
                st.error("Erro ao criar conta")

# =========================
# MAIN APP
# =========================
def app():
    user = st.session_state.user

    st.sidebar.write(f"👤 {user.email}")

    if st.sidebar.button("Logout"):
        st.session_state.user = None
        st.session_state.messages = []
        st.rerun()

    st.title("💰 iMoney — Seu Dinheiro Hoje")

    renda = st.number_input("Renda mensal (R$)", value=2000)
    gastos = st.number_input("Gastos mensais (R$)", value=1500)

    sobra = renda - gastos
    taxa = (gastos / renda) * 100 if renda > 0 else 0

    st.write(f"💵 Renda: R${renda}")
    st.write(f"💸 Gastos: R${gastos}")
    st.write(f"📊 Sobra: R${sobra}")
    st.write(f"📉 Taxa: {taxa:.1f}%")

    # MEMORY
    trend, avg = save_memory(user.id, renda, gastos)

    st.subheader("📈 Evolução")
    st.write(f"Tendência: {trend}")
    st.write(f"Média de sobra: R${avg:.2f}")

    # CHAT HISTORY
    for msg in st.session_state.messages:
        st.chat_message(msg["role"]).write(msg["content"])

    # CHAT INPUT (ONLY ONCE!!!)
    prompt = st.chat_input("Pergunte algo...")

    if prompt:
        st.session_state.messages.append({"role": "user", "content": prompt})
        st.chat_message("user").write(prompt)

        try:
            answer = decision_agent(prompt, renda, gastos, trend)

            st.session_state.messages.append({
                "role": "assistant",
                "content": answer
            })

            st.chat_message("assistant").write(answer)

        except Exception as e:
            st.error("Erro na IA")

# =========================
# ROUTER
# =========================
if st.session_state.user is None:
    login()
else:
    app()
