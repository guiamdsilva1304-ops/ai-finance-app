import streamlit as st
from supabase import create_client, Client
from openai import OpenAI

# =========================
# 🔐 CONFIG (SECRETS)
# =========================
SUPABASE_URL = st.secrets["SUPABASE_URL"]
SUPABASE_KEY = st.secrets["SUPABASE_KEY"]
OPENAI_API_KEY = st.secrets["OPENAI_API_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

# =========================
# 🧠 SESSION INIT
# =========================
if "user" not in st.session_state:
    st.session_state.user = None

if "messages" not in st.session_state:
    st.session_state.messages = []

# =========================
# 🔐 LOGIN / SIGNUP
# =========================
def login_screen():
    st.title("🔐 Login")

    email = st.text_input("Email")
    password = st.text_input("Senha", type="password")

    col1, col2 = st.columns(2)

    # LOGIN
    with col1:
        if st.button("Login"):
            try:
                res = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })
                st.session_state.user = res.user
                st.success("Login realizado!")
                st.rerun()

            except Exception as e:
                st.error(f"Erro real no login: {e}")

    # SIGNUP + AUTO LOGIN
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
                st.success("Conta criada e logado!")
                st.rerun()

            except Exception as e:
                st.error(f"Erro real no signup: {e}")

# =========================
# 🧠 AI (DECISIVE MODE)
# =========================
def get_ai_response(prompt, renda, gastos):
    try:
        sobra = renda - gastos

        context = f"""
        Você é um assistente financeiro EXTREMAMENTE direto, prático e decisivo.

        PERFIL DO USUÁRIO:
        - Inseguro financeiramente
        - Não sabe onde investir
        - Pensa demais e executa pouco
        - Quer melhorar de vida rápido

        SEU PAPEL:
        - Dar decisão clara
        - Cortar dúvida
        - NÃO educar demais
        - NÃO dar muitas opções

        FORMATO:
        Diagnóstico:
        Ação:
        Próximo passo:

        DADOS:
        Renda: {renda}
        Gastos: {gastos}
        Sobra: {sobra}

        REGRAS:
        - Curto
        - Direto
        - Confiante
        """

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
# 💰 SCORE
# =========================
def financial_analysis(renda, gastos):
    if renda == 0:
        return 0, "Sem dados"

    taxa = gastos / renda

    if taxa <= 0.5:
        return 90, "Excelente"
    elif taxa <= 0.7:
        return 70, "Bom"
    elif taxa <= 0.9:
        return 50, "Atenção"
    else:
        return 30, "Crítico"

# =========================
# 🏠 MAIN APP
# =========================
def main_app():
    user = st.session_state.user

    # SIDEBAR
    with st.sidebar:
        st.write(f"👤 {user.email}")

        if st.button("Logout"):
            st.session_state.user = None
            st.session_state.messages = []
            st.rerun()

    st.title("💰 Seu Dinheiro Hoje")

    renda = st.number_input("Renda mensal (R$)", value=2000)
    gastos = st.number_input("Gastos mensais (R$)", value=1500)
    meta = st.text_input("Meta", "Guardar dinheiro")

    sobra = renda - gastos
    taxa = (gastos / renda * 100) if renda > 0 else 0

    st.write(f"📊 Renda: R${renda}")
    st.write(f"💸 Gastos: R${gastos}")
    st.write(f"📈 Sobra: R${sobra}")
    st.write(f"📉 Taxa: {taxa:.1f}%")

    # =========================
    # 🧠 AI AVALIAÇÃO
    # =========================
    score, nivel = financial_analysis(renda, gastos)

    st.subheader("🧠 Avaliação da IA")
    st.write(f"Score financeiro: {score}/100")
    st.write(f"Nível: {nivel}")

    if taxa > 100:
        st.error("Você está gastando mais do que ganha.")
    elif taxa > 70:
        st.warning("Você está gastando demais.")

    # =========================
    # 💬 CHAT
    # =========================
    st.subheader("💬 Assistente Financeiro")

    for msg in st.session_state.messages:
        st.chat_message(msg["role"]).write(msg["content"])

    prompt = st.chat_input("Pergunte algo...")

    if prompt:
        st.session_state.messages.append({"role": "user", "content": prompt})
        st.chat_message("user").write(prompt)

        answer = get_ai_response(prompt, renda, gastos)

        st.session_state.messages.append({"role": "assistant", "content": answer})
        st.chat_message("assistant").write(answer)

# =========================
# 🚀 ROUTER
# =========================
if st.session_state.user is None:
    login_screen()
else:
    main_app()
