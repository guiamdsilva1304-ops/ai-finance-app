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
# SESSION STATE
# =========================
if "user" not in st.session_state:
    st.session_state.user = None

if "messages" not in st.session_state:
    st.session_state.messages = []

# =========================
# LOGIN FUNCTION
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
            except Exception as e:
                st.error("Erro ao criar conta")

# =========================
# SHOW LOGIN IF NOT AUTH
# =========================
if not st.session_state.user:
    login()
    st.stop()

# =========================
# USER EMAIL FIX (IMPORTANT)
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
# FINANCIAL DASHBOARD
# =========================
st.title("💰 Seu Dinheiro Hoje")

renda = st.number_input("Renda mensal (R$)", value=2000)
gastos = st.number_input("Gastos mensais (R$)", value=1500)
meta = st.text_input("Meta", "Guardar dinheiro")

saldo = renda - gastos
taxa = (gastos / renda * 100) if renda > 0 else 0

st.write(f"📊 Renda: R${renda}")
st.write(f"💸 Gastos: R${gastos}")
st.write(f"📈 Saldo: R${saldo}")
st.write(f"📉 Taxa: {taxa:.1f}%")

# =========================
# SCORE SYSTEM
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

nivel = "Crítico"
if score > 80:
    nivel = "Excelente"
elif score > 60:
    nivel = "Bom"
elif score > 40:
    nivel = "Atenção"

# =========================
# FUTURE SIMULATION
# =========================
future = (renda - gastos) * 6

# =========================
# AI EVALUATION
# =========================
st.subheader("🧠 Avaliação da IA")

st.write(f"📊 Score: {score}/100")
st.write(f"🚦 Nível: {nivel}")
st.write(f"🔮 Em 6 meses: R${future}")

# =========================
# DATABASE FUNCTIONS
# =========================
def save_message(role, content):
    try:
        supabase.table("messages").insert({
            "user_id": st.session_state.user.id,
            "role": role,
            "content": content
        }).execute()
    except:
        pass

# =========================
# SHOW CHAT
# =========================
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

# =========================
# CHAT INPUT (FIXED)
# =========================
prompt = st.chat_input("Pergunte algo...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    save_message("user", prompt)

    with st.chat_message("user"):
        st.write(prompt)

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"""
Você é um consultor financeiro brasileiro de alto nível.

Dados:
Renda: {renda}
Gastos: {gastos}
Saldo: {saldo}
Taxa: {taxa:.1f}%
Score: {score}
Meta: {meta}

Responda sempre em português.

Formato obrigatório:

Diagnóstico:
Problema:
Plano de ação:
Previsão futura:
"""
                },
                *st.session_state.messages
            ]
        )

        answer = response.choices[0].message.content

    except Exception as e:
        st.error("Erro na IA")
        st.stop()

    st.session_state.messages.append({"role": "assistant", "content": answer})
    save_message("assistant", answer)

    with st.chat_message("assistant"):
        st.write(answer)
