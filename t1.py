import streamlit as st
from openai import OpenAI
from datetime import datetime
import time

# ========================
# 🔐 CONFIG (SECURE)
# ========================
client = OpenAI(api_key=st.secrets["OPENAI_API_KEY"])

st.set_page_config(page_title="Seu Dinheiro", layout="centered")

# ========================
# 🧠 SESSION STATE
# ========================
if "user_data" not in st.session_state:
    st.session_state.user_data = {"history": []}

if "messages" not in st.session_state:
    st.session_state.messages = []

if "streak" not in st.session_state:
    st.session_state.streak = 0

if "last_active" not in st.session_state:
    st.session_state.last_active = None

if "last_request" not in st.session_state:
    st.session_state.last_request = 0

if "requests_count" not in st.session_state:
    st.session_state.requests_count = 0

# ========================
# 🧠 FUNCTIONS
# ========================
def calculate_behavior(income, expenses, history):
    score = 0

    if expenses < income * 0.6:
        score += 2
    elif expenses < income * 0.8:
        score += 1
    else:
        score -= 1

    if income - expenses > 500:
        score += 2
    elif income - expenses > 0:
        score += 1
    else:
        score -= 2

    if len(history) > 3:
        score += 1

    if score >= 3:
        return score, "Disciplinado"
    elif score >= 1:
        return score, "Equilibrado"
    else:
        return score, "Impulsivo"


def get_level(score):
    if score <= 0:
        return "Nível 1 — Iniciante"
    elif score <= 2:
        return "Nível 2 — Em evolução"
    elif score <= 4:
        return "Nível 3 — Consistente"
    else:
        return "Nível 4 — Avançado"


def generate_auto_insight(income, expenses, savings, history):
    if savings < 0:
        return f"⚠️ Você está perdendo R$ {abs(savings)} por mês."
    if expenses > income * 0.7:
        return "⚠️ Você está gastando mais do que deveria."
    if savings < 300:
        return "⚠️ Sua margem é muito pequena."
    if len(history) > 3:
        return "🧠 Você demonstra indecisão."
    return "✅ Você tem potencial para evoluir."

# ========================
# 🎨 UI
# ========================
st.title("💸 Seu Dinheiro")

income = st.sidebar.number_input("Renda mensal (R$)", value=2000)
expenses = st.sidebar.number_input("Gastos mensais (R$)", value=1500)
goal = st.sidebar.text_input("Meta", "Guardar dinheiro")

savings = income - expenses
expense_ratio = expenses / income if income > 0 else 0

score, behavior = calculate_behavior(income, expenses, st.session_state.user_data["history"])
level = get_level(score)
auto_insight = generate_auto_insight(income, expenses, savings, st.session_state.user_data["history"])

# ========================
# 🔥 STREAK
# ========================
today = datetime.now().date()

if st.session_state.last_active is None:
    st.session_state.streak = 1
elif st.session_state.last_active != today:
    if (today - st.session_state.last_active).days == 1:
        st.session_state.streak += 1
    else:
        st.session_state.streak = 1

st.session_state.last_active = today

# ========================
# 📊 INFO
# ========================
st.write(f"""
📊 Renda: R${income}  
💸 Gastos: R${expenses}  
📈 Sobra: R${savings}  
📉 Taxa: {round(expense_ratio*100,1)}%
""")

st.write(auto_insight)
st.write(f"🔥 Streak: {st.session_state.streak}")
st.write(f"📊 {level} | {behavior}")

# ========================
# 💬 CHAT
# ========================
for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

user_input = st.chat_input("Pergunte algo...")

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

    # 🔐 FILTER
    if any(word in user_input.lower() for word in ["ignore", "system", "hack"]):
        st.warning("Entrada inválida.")
        st.stop()

    st.session_state.user_data["history"].append(user_input)

    st.session_state.messages.append({"role": "user", "content": user_input})
    st.chat_message("user").write(user_input)

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
3. Plano (com números)
4. Impacto em R$
"""

    with st.spinner("Analisando..."):
        try:
            response = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[{"role": "user", "content": prompt}]
            )
            answer = response.choices[0].message.content
        except:
            st.error("Erro na IA")
            st.stop()

    st.session_state.messages.append({"role": "assistant", "content": answer})
    st.chat_message("assistant").write(answer)
