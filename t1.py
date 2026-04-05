import streamlit as st
from supabase import create_client, Client
from openai import OpenAI

# ========================
# 🔐 CONFIG
# ========================
SUPABASE_URL = st.secrets["SUPABASE_URL"]
SUPABASE_KEY = st.secrets["SUPABASE_KEY"]
OPENAI_API_KEY = st.secrets["OPENAI_API_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

# ========================
# 🔐 LOGIN
# ========================
if "user" not in st.session_state:

    st.title("🔐 Login")

    email = st.text_input("Email")
    password = st.text_input("Senha", type="password")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Login"):
            try:
                user = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })
                st.session_state.user = user
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
                st.success("Conta criada! Faça login.")
            except Exception as e:
                st.error(f"Erro signup: {e}")

    st.stop()

# ========================
# 👤 SIDEBAR
# ========================
with st.sidebar:
    st.write(f"👤 {st.session_state.user.user.email}")

    if st.button("🚪 Logout"):
        supabase.auth.sign_out()
        st.session_state.clear()
        st.rerun()

# ========================
# 🚀 FIRST SCREEN (HOOK)
# ========================
if "started" not in st.session_state:
    st.session_state.started = False

if not st.session_state.started:

    st.title("💰 Descubra seu Score Financeiro")
    st.subheader("Em menos de 10 segundos")

    st.write("👉 Veja como está sua vida financeira")
    st.write("👉 Receba recomendações inteligentes")
    st.write("👉 Melhore seu dinheiro com IA")

    if st.button("🚀 Começar agora"):
        st.session_state.started = True
        st.rerun()

    st.stop()

# ========================
# 💰 INPUT SCREEN
# ========================
st.title("💰 Seu Dinheiro Hoje")

renda = st.number_input("Renda mensal (R$)", value=2000)
gastos = st.number_input("Gastos mensais (R$)", value=1500)
meta = st.text_input("Meta", "Guardar dinheiro")

saldo = renda - gastos
taxa = (gastos / renda) * 100 if renda > 0 else 0

st.write(f"📊 Renda: R${renda}")
st.write(f"💸 Gastos: R${gastos}")
st.write(f"📈 Sobra: R${saldo}")
st.write(f"📉 Taxa: {taxa:.1f}%")

# ========================
# 🧠 AI SCORE + EVALUATION
# ========================
st.subheader("🧠 Avaliação da IA")

if taxa >= 100:
    score = 20
    nivel = "Crítico"
elif taxa >= 80:
    score = 40
    nivel = "Alto risco"
elif taxa >= 60:
    score = 60
    nivel = "Atenção"
else:
    score = 85
    nivel = "Saudável"

st.write(f"📊 Score financeiro: {score}/100")
st.write(f"🚦 Nível: {nivel}")

# AUTO AI ANALYSIS (NO CHAT NEEDED)
try:
    evaluation = client.chat.completions.create(
        model="gpt-4.1",
        temperature=0.5,
        messages=[
            {
                "role": "system",
                "content": "You are a financial analyst. Be direct."
            },
            {
                "role": "user",
                "content": f"""
Income: {renda}
Expenses: {gastos}
Balance: {saldo}
Rate: {taxa}%

Give:
- Diagnosis
- Problem
- 3 actions
"""
            }
        ]
    )

    feedback = evaluation.choices[0].message.content
    st.info(feedback)

except Exception as e:
    st.error(f"Erro IA: {e}")

# ========================
# 🤖 CHAT (PERSISTENT)
# ========================
st.subheader("💬 Assistente Financeiro")

user_id = st.session_state.user.user.id

if "messages_loaded" not in st.session_state:

    try:
        data = supabase.table("messages") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at") \
            .execute()

        st.session_state.messages = [
            {"role": m["role"], "content": m["content"]}
            for m in data.data
        ]

        st.session_state.messages_loaded = True

    except:
        st.session_state.messages = []

for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

prompt = st.chat_input("Pergunte algo...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)

    supabase.table("messages").insert({
        "user_id": user_id,
        "role": "user",
        "content": prompt
    }).execute()

    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": "You are a financial advisor."},
            *st.session_state.messages[-10:]
        ]
    )

    answer = response.choices[0].message.content

    st.session_state.messages.append({"role": "assistant", "content": answer})
    st.chat_message("assistant").write(answer)

    supabase.table("messages").insert({
        "user_id": user_id,
        "role": "assistant",
        "content": answer
    }).execute()
