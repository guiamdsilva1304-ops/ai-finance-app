"""
iMoney — FastAPI Backend
Responsável por: dados econômicos (BCB), câmbio (AwesomeAPI), lógica de IA complexa.
O Next.js chama este backend via /api/fastapi/* ou diretamente.
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
import time
import anthropic
from functools import lru_cache
from datetime import datetime, date
from typing import Optional
import re

app = FastAPI(title="iMoney API", version="1.0.0")

# CORS — permite Next.js dev e prod
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

# ═══════════════════════════════════════════════════
# DADOS ECONÔMICOS — BCB
# ═══════════════════════════════════════════════════
_eco_cache: dict = {}
_eco_cache_at: float = 0

def get_eco_data() -> dict:
    global _eco_cache, _eco_cache_at
    # Cache 4 horas
    if _eco_cache and (time.time() - _eco_cache_at) < 14_400:
        return _eco_cache

    fallback = {
        "selic_anual": 14.75, "selic_meta": 14.75,
        "ipca_mensal": 0.56, "ipca_anual": 5.06,
        "ultima_atualizacao": "fallback",
    }

    try:
        # SELIC efetiva
        r = requests.get(
            "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json",
            timeout=5
        )
        selic_anual = round(float(r.json()[0]["valor"]) * 12, 2) if r.ok else fallback["selic_anual"]
    except:
        selic_anual = fallback["selic_anual"]

    try:
        # Meta SELIC
        r2 = requests.get(
            "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json",
            timeout=5
        )
        selic_meta = round(float(r2.json()[0]["valor"]), 2) if r2.ok else fallback["selic_meta"]
    except:
        selic_meta = fallback["selic_meta"]

    try:
        # IPCA mensal
        r3 = requests.get(
            "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json",
            timeout=5
        )
        ipca_mensal = round(float(r3.json()[0]["valor"]), 2) if r3.ok else fallback["ipca_mensal"]
    except:
        ipca_mensal = fallback["ipca_mensal"]

    try:
        # IPCA 12m
        r4 = requests.get(
            "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json",
            timeout=5
        )
        ipca_anual = round(sum(float(d["valor"]) for d in r4.json()), 2) if r4.ok else fallback["ipca_anual"]
    except:
        ipca_anual = fallback["ipca_anual"]

    result = {
        "selic_anual": selic_anual,
        "selic_meta": selic_meta,
        "ipca_mensal": ipca_mensal,
        "ipca_anual": ipca_anual,
        "ultima_atualizacao": datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
    }
    _eco_cache = result
    _eco_cache_at = time.time()
    return result


@app.get("/api/eco")
def eco_endpoint():
    return get_eco_data()


# ═══════════════════════════════════════════════════
# CÂMBIO — AwesomeAPI
# ═══════════════════════════════════════════════════
_fx_cache: dict = {}
_fx_cache_at: float = 0

@app.get("/api/fx")
def fx_endpoint():
    global _fx_cache, _fx_cache_at
    # Cache 1 hora
    if _fx_cache and (time.time() - _fx_cache_at) < 3600:
        return _fx_cache

    EMOJIS = {
        "USD": "🇺🇸", "EUR": "🇪🇺", "GBP": "🇬🇧", "ARS": "🇦🇷",
        "JPY": "🇯🇵", "CAD": "🇨🇦", "AUD": "🇦🇺", "CHF": "🇨🇭",
        "CNY": "🇨🇳", "BTC": "₿",
    }
    FALLBACK = {c: {"rate": r, "pct": 0, "emoji": EMOJIS.get(c,"🌐")} for c, r in {
        "USD":5.15,"EUR":5.70,"GBP":6.50,"ARS":0.0055,
        "JPY":0.034,"CAD":3.75,"AUD":3.20,"CHF":5.80,"CNY":0.71,"BTC":520000
    }.items()}

    try:
        pairs = "USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL,JPY-BRL,CAD-BRL,AUD-BRL,CHF-BRL,CNY-BRL,BTC-BRL"
        r = requests.get(f"https://economia.awesomeapi.com.br/last/{pairs}", timeout=8)
        r.raise_for_status()
        data = r.json()
        KEY_MAP = {
            "USD":"USDBRL","EUR":"EURBRL","GBP":"GBPBRL","ARS":"ARSBRL",
            "JPY":"JPYBRL","CAD":"CADBRL","AUD":"AUDBRL","CHF":"CHFBRL",
            "CNY":"CNYBRL","BTC":"BTCBRL",
        }
        result = {}
        for code, key in KEY_MAP.items():
            if key in data:
                result[code] = {
                    "rate": float(data[key]["bid"]),
                    "pct": float(data[key]["pctChange"]),
                    "high": float(data[key]["high"]),
                    "low": float(data[key]["low"]),
                    "emoji": EMOJIS.get(code,"🌐"),
                }
        _fx_cache = result
        _fx_cache_at = time.time()
        return result
    except:
        return FALLBACK


# ═══════════════════════════════════════════════════
# DIAGNÓSTICO FINANCEIRO (agente IA)
# ═══════════════════════════════════════════════════
class DiagnosticoRequest(BaseModel):
    renda: float
    gastos_total: float
    gastos_cat: dict
    metas: list
    score: int
    perfil: str
    trend: str
    perfil_usuario: Optional[dict] = None
    investimentos: Optional[list] = None

@app.post("/api/diagnostico")
def diagnostico(req: DiagnosticoRequest):
    eco = get_eco_data()
    sobra = req.renda - req.gastos_total
    taxa_poupanca = (sobra / req.renda * 100) if req.renda > 0 else 0
    juros_reais = round(eco["selic_anual"] - eco["ipca_anual"], 2)

    prompt = f"""Você é um consultor financeiro especializado. Gere um laudo financeiro COMPLETO e DETALHADO.

DADOS FINANCEIROS:
- Renda: R$ {req.renda:,.2f} | Gastos: R$ {req.gastos_total:,.2f} | Sobra: R$ {sobra:,.2f}
- Taxa de poupança: {taxa_poupanca:.1f}%
- Score iMoney: {req.score}/100 ({req.perfil}) | Tendência: {req.trend}
- SELIC: {eco["selic_anual"]}% | IPCA: {eco["ipca_anual"]}% | Juro real: {juros_reais}%
- Gastos por categoria: {req.gastos_cat}
- Metas: {req.metas}
- Perfil pessoal: {req.perfil_usuario}
- Investimentos: {req.investimentos}

Estruture o laudo com:
1. 📊 Diagnóstico Geral (2-3 parágrafos)
2. 💪 Pontos Fortes
3. ⚠️ Alertas e Riscos  
4. 🎯 Plano de Ação (5 passos priorizados)
5. 📈 Projeções (6, 12, 24 meses)

Seja específico com números. Use markdown."""

    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
    return {"laudo": response.content[0].text}


# ═══════════════════════════════════════════════════
# CATEGORIZAÇÃO DE TRANSAÇÃO
# ═══════════════════════════════════════════════════
class CategoriaRequest(BaseModel):
    descricao: str
    valor: float
    renda: float

@app.post("/api/categorizar")
def categorizar(req: CategoriaRequest):
    # Sanitize
    desc = re.sub(r'[<>\'";&]', '', req.descricao[:200])
    prompt = f"""Categorize este gasto financeiro brasileiro.
Gasto: {desc} - R$ {req.valor:.2f} | Renda: R$ {req.renda:.2f}

Responda SOMENTE com JSON:
{{"categoria":"<Moradia|Alimentação|Transporte|Saúde|Educação|Lazer|Vestuário|Outros>",
"essencial":<true/false>,"percentual_renda":<número>,"avaliacao":"<OK|Alto|Muito Alto|Baixo>",
"dica":"<até 15 palavras>"}}"""

    response = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        messages=[{"role":"user","content":prompt}]
    )
    import json
    try:
        return json.loads(response.content[0].text)
    except:
        return {"categoria":"Outros","essencial":False,"percentual_renda":0,"avaliacao":"OK","dica":""}


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
