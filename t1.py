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
        try:
            supabase.auth.sign_out()
        except:
            pass
        st.session_state.clear()
        st.rerun()

# ========================
# 💰 DASHBOARD
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
# 🤖 PROACTIVE AI INSIGHTS
# ========================
if "insight_shown" not in st.session_state:

    if gastos > renda:
        st.error("🚨 Você está no prejuízo. Corte gastos imediatamente.")
    elif taxa > 70:
        st.warning("⚠️ Você está gastando demais da sua renda.")
    else:
        st.success("✅ Você está com bom controle financeiro.")

    st.session_state.insight_shown = True

# ========================
# 🤖 PERSISTENT CHAT
# ========================
user_id = st.session_state.user.user.id

# Load messages once
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

    except Exception as e:
        st.error(f"Erro ao carregar chat: {e}")
        st.session_state.messages = []

# Show messages
for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

# ONLY ONE INPUT
prompt = st.chat_input("Pergunte algo...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)

    # Save user message
    try:
        supabase.table("messages").insert({
            "user_id": user_id,
            "role": "user",
            "content": prompt
        }).execute()
    except Exception as e:
        st.error(f"Erro salvar user: {e}")

    # AI RESPONSE
    try:
        response = client.chat.completions.create(
            model="gpt-5",
            temperature=0.7,
            messages=[
                {
                    "role": "system",
                    "content": f"""
You are an elite financial advisor.

Your mission:
- Improve the user's financial life
- Be direct and strategic
- Give actionable steps

User:
Income: {renda}
Expenses: {gastos}
Goal: {meta}

Be practical, not generic.
"""
                },
                *st.session_state.messages[-10:]
            ]
        )

        answer = response.choices[0].message.content

    except Exception as e:
        st.error(f"Erro IA: {e}")
        st.stop()

    st.session_state.messages.append({"role": "assistant", "content": answer})
    st.chat_message("assistant").write(answer)

    # Save AI response
    try:
        supabase.table("messages").insert({
            "user_id": user_id,
            "role": "assistant",
            "content": answer
        }).execute()
    except Exception as e:
        st.error(f"Erro salvar IA: {e}")
