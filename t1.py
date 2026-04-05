import streamlit as st
from openai import OpenAI
from supabase import create_client
import datetime

# =========================
# CONFIG
# =========================
client = OpenAI(api_key=st.secrets["OPENAI_API_KEY"])

SUPABASE_URL = st.secrets["SUPABASE_URL"]
SUPABASE_KEY = st.secrets["SUPABASE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

st.set_page_config(page_title="AI Finance", layout="wide")

# =========================
# LOGIN SYSTEM
# =========================
if "user" not in st.session_state:
    st.session_state.user = None

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
                st.error(f"Erro login: {e}")

    with col2:
        if st.button("Criar conta"):
            try:
                supabase.auth.sign_up({
                    "email": email,
                    "password": password
                })
                st.success("Conta criada! Confirme o email.")
            except Exception as e:
                st.error(f"Erro ao criar conta: {e}")

if not st.session_state.user:
    login()
    st.stop()

# =========================
# LOGOUT
# =========================
with st.sidebar:
    st.write(st.session_state.user.email)
    if st.button("Logout"):
        supabase.auth.sign_out()
        st.session_state.user = None
        st.rerun()

# =========================
# FINANCIAL INPUT
# =========================
st.title("💰 Seu Dinheiro Hoje")

renda = st.number_input("Renda mensal (R$)", value=2000)
gastos = st.number_input("Gastos mensais (R$)", value=1500)
meta = st.text_input("Meta", "Guardar dinheiro")

saldo = renda - gastos
taxa = (gastos / renda) * 100 if renda > 0 else 0

st.write(f"📊 Renda: R${renda}")
st.write(f"💸 Gastos: R${gastos}")
st.write(f"📈 Saldo: R${saldo}")
st.write(f"📉 Taxa: {taxa:.1f}%")

# =========================
# AI SCORE SYSTEM
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
def simulate_future(renda, gastos):
    savings = renda - gastos
    months = 6
    total = 0

    for i in range(months):
        total += savings

    return total

future = simulate_future(renda, gastos)

# =========================
# AI EVALUATION BLOCK
# =========================
st.subheader("🧠 Avaliação da IA")

st.write(f"📊 Score financeiro: {score}/100")
st.write(f"🚦 Nível: {nivel}")
st.write(f"🔮 Em 6 meses você terá: R${future}")

# =========================
# CHAT MEMORY
# =========================
if "messages" not in st.session_state:
    st.session_state.messages = []

# Load previous messages
def load_messages():
    res = supabase.table("messages").select("*").eq(
        "user_id", st.session_state.user.id
    ).execute()
    return res.data

def save_message(role, content):
    supabase.table("messages").insert({
        "user_id": st.session_state.user.id,
        "role": role,
        "content": content
    }).execute()

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
Você é um consultor financeiro brasileiro extremamente inteligente.

Dados do usuário:
Renda: {renda}
Gastos: {gastos}
Saldo: {saldo}
Taxa: {taxa:.1f}%

Score: {score}
Meta: {meta}

Seu papel:
- Ser direto
- Dar planos práticos
- Pensar como um planejador financeiro real

Sempre responda assim:

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
        st.error(f"Erro IA: {e}")
        st.stop()

    st.session_state.messages.append({"role": "assistant", "content": answer})
    save_message("assistant", answer)

    with st.chat_message("assistant"):
        st.write(answer)
