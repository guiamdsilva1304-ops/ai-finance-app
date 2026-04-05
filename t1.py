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
# 🧠 SMART FINANCIAL ENGINE
# =========================
def financial_analysis(renda, gastos):
    if renda == 0:
        return 0, "Sem dados", "Defina sua renda primeiro."

    sobra = renda - gastos
    taxa = gastos / renda

    if taxa > 1:
        return 20, "Crítico", "Você está gastando mais do que ganha. Corte custos imediatamente."

    elif taxa > 0.8:
        return 40, "Alerta", "Você está perto do limite. Não invista ainda — reduza gastos."

    elif taxa > 0.6:
        return 60, "Atenção", "Você consegue investir pouco, mas precisa otimizar gastos."

    else:
        return 85, "Controle", "Boa base. Agora foque em investir com consistência."

# =========================
# 🧠 AI — DECISION ENGINE (BASED ON YOUR DATA)
# =========================
def get_ai_response(prompt, renda, gastos):
    sobra = renda - gastos

    context = f"""
    Você é o iMoney — um decisor financeiro.

    VOCÊ NÃO ENSINA.
    VOCÊ DECIDE.

    PERFIL DO USUÁRIO (dados reais):
    - Confuso sobre onde investir
    - Medo de errar
    - Pesquisa muito e age pouco
    - Quer melhorar de vida
    - Fica travado na decisão

    PROBLEMAS COMUNS:
    - "Onde investir?"
    - "E se eu estiver errado?"
    - "Não sobra dinheiro"
    - "Não entendo investimentos"

    SUA MISSÃO:
    - Eliminar dúvida
    - Dar uma única direção
    - Forçar ação simples

    NUNCA:
    - Dar várias opções
    - Explicar demais
    - Usar termos técnicos complexos

    FORMATO:
    Diagnóstico:
    Ação:
    Próximo passo:

    DADOS DO USUÁRIO:
    Renda: {renda}
    Gastos: {gastos}
    Sobra: {sobra}

    TOM:
    Direto. Confiante. Sem enrolação.
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

    # SIDEBAR
    with st.sidebar:
        st.write(f"👤 {user.email}")

        if st.button("Logout"):
            st.session_state.user = None
            st.session_state.messages = []
            st.rerun()

    # HEADER
    st.title("💰 iMoney")
    st.caption("Decisões financeiras claras. Sem overthinking.")

    # INPUTS
    renda = st.number_input("Renda mensal (R$)", value=2000)
    gastos = st.number_input("Gastos mensais (R$)", value=1500)
    meta = st.text_input("Meta", "Guardar dinheiro")

    sobra = renda - gastos
    taxa = (gastos / renda * 100) if renda > 0 else 0

    # SUMMARY
    st.write(f"📊 Renda: R${renda}")
    st.write(f"💸 Gastos: R${gastos}")
    st.write(f"📈 Sobra: R${sobra}")
    st.write(f"📉 Taxa: {taxa:.1f}%")

    # =========================
    # 🧠 AI EVALUATION (SMART)
    # =========================
    score, nivel, recomendacao = financial_analysis(renda, gastos)

    st.subheader("🧠 Avaliação iMoney")
    st.write(f"Score: {score}/100")
    st.write(f"Nível: {nivel}")

    st.info(f"👉 {recomendacao}")

    # =========================
    # ⚡ NEXT ACTION (CORE PRODUCT)
    # =========================
    st.subheader("⚡ Próxima decisão")

    if sobra <= 0:
        st.error("Pare de pensar em investir. Corte gastos hoje.")
    elif sobra < 500:
        st.warning("Invista pouco, mas comece agora (Tesouro Selic).")
    else:
        st.success("Você já pode investir de forma consistente.")

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
