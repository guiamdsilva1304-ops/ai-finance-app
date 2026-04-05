import streamlit as st
from openai import OpenAI
from supabase import create_client

# =========================
# CONFIG
# =========================
st.set_page_config(page_title="AI Finance", layout="wide")

client = OpenAI(api_key=st.secrets["OPENAI_API_KEY"])

supabase = create_client(
    st.secrets["SUPABASE_URL"],
    st.secrets["SUPABASE_KEY"]
)

# =========================
# SESSION
# =========================
if "user" not in st.session_state:
    st.session_state.user = None

if "messages" not in st.session_state:
    st.session_state.messages = []

# =========================
# LOGIN
# =========================
def login():
    st.title("🔐 Login")

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
                st.success("Conta criada! Verifique seu email.")
            except:
                st.error("Erro ao criar conta")

if not st.session_state.user:
    login()
    st.stop()

# =========================
# USER INFO (FIXED)
# =========================
user_email = "User"
try:
    user_email = st.session_state.user.user_metadata.get("email", "User")
except:
    pass

# =========================
# SIDEBAR
# =========================
with st.sidebar:
    st.markdown(f"👤 **{user_email}**")

    if st.button("Logout"):
        supabase.auth.sign_out()
        st.session_state.user = None
        st.session_state.messages = []
        st.rerun()

# =========================
# TITLE
# =========================
st.title("🧠 Melhor decisão para o seu dinheiro")

# =========================
# INPUTS
# =========================
renda = st.number_input("Renda mensal (R$)", value=2000)
gastos = st.number_input("Gastos mensais (R$)", value=1500)
meta = st.text_input("Meta", "Guardar dinheiro")

saldo = renda - gastos
taxa = (gastos / renda * 100) if renda > 0 else 0

# =========================
# EMOTIONAL FEEDBACK
# =========================
if saldo < 0:
    st.error("⚠️ Você está perdendo dinheiro todo mês")
elif taxa > 70:
    st.warning("⚠️ Seu nível de gasto está alto")
else:
    st.success("✅ Você está no caminho certo")

# =========================
# SUMMARY
# =========================
st.write(f"📊 Renda: R${renda}")
st.write(f"💸 Gastos: R${gastos}")
st.write(f"📈 Saldo: R${saldo}")
st.write(f"📉 Taxa: {taxa:.1f}%")

# =========================
# SCORE
# =========================
def calculate_score(renda, gastos):
    if renda == 0:
        return 0

    savings_rate = (renda - gastos) / renda
    score = 50

    if savings_rate > 0.3:
        score += 30
    elif savings_rate > 0.2:
        score += 20
    elif savings_rate > 0.1:
        score += 10
    else:
        score -= 20

    if gastos / renda > 0.8:
        score -= 20

    return max(0, min(100, score))

score = calculate_score(renda, gastos)

st.subheader("📊 Seu nível financeiro")
st.write(f"Score: {score}/100")

# =========================
# BEST DECISION BUTTON (CORE FEATURE)
# =========================
if st.button("📌 Melhor decisão agora"):

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"""
Você é um consultor financeiro que toma decisões pelo usuário.

Dados:
Renda: {renda}
Gastos: {gastos}
Saldo: {saldo}
Taxa: {taxa:.1f}%
Score: {score}
Meta: {meta}

Regras:
- Seja direto
- Dê UMA decisão clara
- Nada de teoria

Formato:

Diagnóstico:
Decisão:
Justificativa:
Próximo passo:
"""
                }
            ]
        )

        decision = response.choices[0].message.content

        st.success("💡 Melhor decisão para você:")
        st.write(decision)

    except:
        st.error("Erro ao gerar decisão")

# =========================
# CHAT
# =========================
st.subheader("💬 Tire dúvidas")

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

prompt = st.chat_input("Pergunte algo...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.write(prompt)

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"""
Você é um consultor financeiro brasileiro.

Dados:
Renda: {renda}
Gastos: {gastos}
Saldo: {saldo}
Taxa: {taxa:.1f}%

Responda de forma clara, prática e direta.
"""
                },
                *st.session_state.messages
            ]
        )

        answer = response.choices[0].message.content

    except:
        st.error("Erro na IA")
        st.stop()

    st.session_state.messages.append({"role": "assistant", "content": answer})

    with st.chat_message("assistant"):
        st.write(answer)
