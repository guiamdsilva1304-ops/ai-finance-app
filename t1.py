import streamlit as st
from supabase import create_client, Client
from openai import OpenAI

# =========================
# 🔐 CONFIG
# =========================
st.set_page_config(page_title="iMoney", layout="wide")

SUPABASE_URL = st.secrets["SUPABASE_URL"]
SUPABASE_KEY = st.secrets["SUPABASE_KEY"]
OPENAI_API_KEY = st.secrets["OPENAI_API_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

# =========================
# 🧠 SESSION
# =========================
if "user" not in st.session_state:
    st.session_state.user = None

if "messages" not in st.session_state:
    st.session_state.messages = []

# =========================
# 🔐 LOGIN
# =========================
def login_screen():
    st.title("💰 iMoney")
    st.subheader("Pare de pensar. Comece a decidir.")

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
            except Exception as e:
                st.error(f"Erro no login: {e}")

    with col2:
        if st.button("Criar conta"):
            try:
                supabase.auth.sign_up({
                    "email": email,
                    "password": password
                })

                res = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })

                st.session_state.user = res.user
                st.rerun()

            except Exception as e:
                st.error(f"Erro no signup: {e}")

# =========================
# 🧠 AGENT 1 — ANALYST
# =========================
def analyst_agent(renda, gastos):
    if renda == 0:
        return "sem dados"

    taxa = gastos / renda

    if taxa > 1:
        return "endividado"
    elif taxa > 0.8:
        return "critico"
    elif taxa > 0.6:
        return "instavel"
    else:
        return "estavel"

# =========================
# 🧠 AGENT 2 — BEHAVIOR
# =========================
def behavior_agent():
    return """
    Usuário típico:
    - Medo de errar
    - Não sabe onde investir
    - Pesquisa muito e não age
    - Quer clareza rápida
    """

# =========================
# 🧠 AGENT 3 — STRATEGY
# =========================
def strategy_agent(analysis):
    if analysis == "endividado":
        return "Cortar gastos imediatamente. Não investir."
    elif analysis == "critico":
        return "Organizar finanças antes de investir."
    elif analysis == "instavel":
        return "Começar com investimentos seguros."
    else:
        return "Focar em crescimento e diversificação."

# =========================
# 🧠 AGENT 4 — DECISION (AI)
# =========================
def decision_agent(prompt, renda, gastos, analysis, strategy):
    sobra = renda - gastos

    context = f"""
    Você é o iMoney — um sistema de decisão financeira.

    RESULTADO DOS AGENTES:

    📊 ANALISTA:
    {analysis}

    🧠 COMPORTAMENTO:
    Usuário inseguro, indeciso, com medo de errar

    ⚡ ESTRATÉGIA:
    {strategy}

    SUA FUNÇÃO:
    - NÃO explicar demais
    - NÃO dar opções
    - Dar UMA decisão clara

    FORMATO:
    Diagnóstico:
    Ação:
    Próximo passo:

    DADOS:
    Renda: {renda}
    Gastos: {gastos}
    Sobra: {sobra}

    Seja direto e confiante.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": context},
                {"role": "user", "content": prompt}
            ]
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"Erro IA: {e}"

# =========================
# 🏠 MAIN APP
# =========================
def main_app():
    user = st.session_state.user

    with st.sidebar:
        st.write(f"👤 {user.email}")

        if st.button("Logout"):
            st.session_state.user = None
            st.session_state.messages = []
            st.rerun()

    st.title("💰 iMoney")
    st.caption("Decisões financeiras claras. Sem overthinking.")

    renda = st.number_input("Renda mensal (R$)", value=2000)
    gastos = st.number_input("Gastos mensais (R$)", value=1500)

    sobra = renda - gastos
    taxa = (gastos / renda * 100) if renda > 0 else 0

    st.write(f"📊 Renda: R${renda}")
    st.write(f"💸 Gastos: R${gastos}")
    st.write(f"📈 Sobra: R${sobra}")
    st.write(f"📉 Taxa: {taxa:.1f}%")

    # =========================
    # 🧠 MULTI-AGENT SYSTEM
    # =========================
    analysis = analyst_agent(renda, gastos)
    behavior = behavior_agent()
    strategy = strategy_agent(analysis)

    st.subheader("🧠 Diagnóstico do sistema")
    st.write(f"📊 Financeiro: {analysis}")
    st.write(f"⚡ Estratégia: {strategy}")

    # =========================
    # 💬 CHAT
    # =========================
    st.subheader("💬 Assistente iMoney")

    for msg in st.session_state.messages:
        st.chat_message(msg["role"]).write(msg["content"])

    prompt = st.chat_input("Pergunte algo...")

    if prompt:
        st.session_state.messages.append({"role": "user", "content": prompt})
        st.chat_message("user").write(prompt)

        answer = decision_agent(prompt, renda, gastos, analysis, strategy)

        st.session_state.messages.append({"role": "assistant", "content": answer})
        st.chat_message("assistant").write(answer)

# =========================
# 🚀 ROUTER
# =========================
if st.session_state.user is None:
    login_screen()
else:
    main_app()
