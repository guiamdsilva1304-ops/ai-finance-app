import streamlit as st
from openai import OpenAI
from supabase import create_client
from datetime import datetime
import time

# ========================
# 🔐 CONFIG
# ========================
client = OpenAI(api_key=st.secrets["OPENAI_API_KEY"])

supabase = create_client(
    st.secrets["SUPABASE_URL"],
    st.secrets["SUPABASE_KEY"]
)

st.set_page_config(page_title="Seu Dinheiro", layout="centered")

# ========================
# ========================
# 🔐 LOGIN
# ========================
if "user" not in st.session_state:

    st.title("🔐 Login")

    email = st.text_input("Email")
    password = st.text_input("Senha", type="password")

    col1, col2 = st.columns(2)

    # LOGIN
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
                st.error(f"Erro real (login): {e}")

    # SIGN UP
    with col2:
        if st.button("Criar conta"):
            try:
                supabase.auth.sign_up({
                    "email": email,
                    "password": password
                })
                st.success("Conta criada com sucesso! Agora faça login.")

            except Exception as e:
                st.error(f"Erro real (signup): {e}")

    st.stop()
# ========================
# 👤 USER ID
# ========================
user_id = st.session_state.user.user.id

# ========================
# 🧠 SESSION STATE
# ========================
if "messages" not in st.session_state:

    data = supabase.table("messages") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at") \
        .execute()

    st.session_state.messages = data.data if data.data else []

if "last_request" not in st.session_state:
    st.session_state.last_request = 0

if "requests_count" not in st.session_state:
    st.session_state.requests_count = 0

if "last_insight" not in st.session_state:
    st.session_state.last_insight = None

if "streak" not in st.session_state:
    st.session_state.streak = 1

if "last_active" not in st.session_state:
    st.session_state.last_active = datetime.now().date()

# ========================
# 🎨 UI
# ========================
st.title("💸 Seu Dinheiro")

income = st.sidebar.number_input("Renda mensal (R$)", value=2000)
expenses = st.sidebar.number_input("Gastos mensais (R$)", value=1500)
goal = st.sidebar.text_input("Meta", "Guardar dinheiro")

savings = income - expenses
expense_ratio = expenses / income if income > 0 else 0

# ========================
# 📊 INFO
# ========================
st.write(f"""
📊 Renda: R${income}  
💸 Gastos: R${expenses}  
📈 Sobra: R${savings}  
📉 Taxa: {round(expense_ratio*100,1)}%
""")

# ========================
# 🚨 PROGRESS
# ========================
if savings > 0:
    st.success(f"Você está acumulando R$ {savings}/mês")
else:
    st.error(f"Você está no negativo em R$ {abs(savings)}")

# ========================
# 🔮 PROJECTION
# ========================
st.info(f"📅 Em 12 meses: R$ {savings * 12}")

# ========================
# 🧠 DAILY INSIGHT
# ========================
today = datetime.now().date()

if st.session_state.last_insight != today:

    if savings < 0:
        insight = f"🚨 Você está perdendo R$ {abs(savings)}"
    elif expense_ratio > 0.7:
        insight = "⚠️ Você está gastando acima do ideal"
    else:
        insight = "✅ Situação saudável"

    st.warning(insight)
    st.session_state.last_insight = today

# ========================
# 💬 CHAT DISPLAY
# ========================
for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

# ========================
# ⚡ QUICK ACTIONS
# ========================
st.subheader("⚡ Ações rápidas")

quick_input = None

col1, col2, col3 = st.columns(3)

with col1:
    if st.button("Economizar"):
        quick_input = "Como economizar dinheiro?"

with col2:
    if st.button("Investir"):
        quick_input = "Como investir meu dinheiro?"

with col3:
    if st.button("Sair das dívidas"):
        quick_input = "Como sair das dívidas?"

# ========================
# 💬 INPUT
# ========================
user_input = st.chat_input("Pergunte algo...")

if quick_input:
    user_input = quick_input

if user_input:

    # 🔐 RATE LIMIT
    now = time.time()
    if now - st.session_state.last_request < 5:
        st.warning("Espere alguns segundos.")
        st.stop()
    st.session_state.last_request = now

    # 🔐 LIMIT
    st.session_state.requests_count += 1
    if st.session_state.requests_count > 10:
        st.error("Limite atingido.")
        st.stop()

    # SAVE USER MESSAGE
    supabase.table("messages").insert({
        "user_id": user_id,
        "role": "user",
        "content": user_input
    }).execute()

    st.session_state.messages.append({
        "role": "user",
        "content": user_input
    })

    st.chat_message("user").write(user_input)

    # ========================
    # 🧠 AI
    # ========================
    prompt = f"""
Você é um consultor financeiro direto.

Renda: R${income}
Gastos: R${expenses}
Sobra: R${savings}
Taxa: {round(expense_ratio*100,1)}%
Objetivo: {goal}

Pergunta: {user_input}

Responda com:
1. Diagnóstico
2. Problema
3. Plano com números
4. Impacto em R$
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}]
        )

        answer = response.choices[0].message.content

    except Exception as e:
        st.error(f"Erro real: {e}")
        st.stop()

    # SAVE AI MESSAGE
    supabase.table("messages").insert({
        "user_id": user_id,
        "role": "assistant",
        "content": answer
    }).execute()

    st.session_state.messages.append({
        "role": "assistant",
        "content": answer
    })

    st.chat_message("assistant").write(answer)
