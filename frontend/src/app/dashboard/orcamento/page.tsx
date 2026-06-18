"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Trash2, X } from "lucide-react";

const FONT = "'Nunito', 'Segoe UI', sans-serif";
const GREEN = "#00C853";
const DARK = "#1a3a1a";
const GOLD = "#F9A825";
const RED = "#d32f2f";

const CATEGORIAS = [
  "Alimentação", "Transporte", "Moradia", "Saúde",
  "Educação", "Lazer", "Vestuário", "Assinaturas", "Pet", "Outros",
];

interface Budget {
  id: string;
  category: string;
  limit_amount: number;
  month: string;
}

interface SpendRow {
  categoria: string;
  valor: number;
}

function currentMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function statusOf(pct: number): { emoji: string; label: string; color: string } {
  if (pct >= 100) return { emoji: "🔴", label: "Teto atingido", color: RED };
  if (pct >= 80)  return { emoji: "🟡", label: "Atenção",       color: GOLD };
  return { emoji: "🟢", label: "No controle", color: GREEN };
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OrcamentoPage() {
  const supabase = createSupabaseBrowser();
  const [month, setMonth] = useState(currentMonth());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spend, setSpend] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalCat, setModalCat] = useState(CATEGORIAS[0]);
  const [modalAmt, setModalAmt] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !session) { setLoading(false); return; }

    const [budgetRes, txRes] = await Promise.allSettled([
      fetch(`/api/budgets?month=${month}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then(r => r.json()),
      (() => {
        const start = `${month}-01`;
        const [y, m] = month.split("-").map(Number);
        const end = new Date(y, m, 1).toISOString().split("T")[0];
        return supabase
          .from("transactions")
          .select("categoria, valor")
          .eq("user_id", user.id)
          .eq("tipo", "gasto")
          .gte("date", start)
          .lt("date", end);
      })(),
    ]);

    if (budgetRes.status === "fulfilled" && Array.isArray(budgetRes.value)) {
      setBudgets(budgetRes.value);
    }
    if (txRes.status === "fulfilled" && txRes.value.data) {
      const map: Record<string, number> = {};
      for (const tx of txRes.value.data as SpendRow[]) {
        map[tx.categoria] = (map[tx.categoria] ?? 0) + Math.abs(Number(tx.valor));
      }
      setSpend(map);
    }
    setLoading(false);
  }, [month, supabase]);

  useEffect(() => { load(); }, [load]);

  async function deleteBudget(id: string) {
    if (!confirm("Excluir este teto de orçamento?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/budgets?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    load();
  }

  async function saveBudget(cat: string, amt: string) {
    setModalErr("");
    const value = parseFloat(amt.replace(",", "."));
    if (isNaN(value) || value <= 0) { setModalErr("Valor inválido"); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ category: cat, limit_amount: value, month }),
    });
    setSaving(false);
    if (!res.ok) { setModalErr("Erro ao salvar. Tente novamente."); return; }
    setShowModal(false);
    setModalAmt("");
    setModalCat(CATEGORIAS[0]);
    load();
  }

  function openModal(cat?: string) {
    setModalCat(cat ?? CATEGORIAS[0]);
    setModalAmt("");
    setModalErr("");
    setShowModal(true);
  }

  const totalLimit = budgets.reduce((s, b) => s + b.limit_amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spend[b.category] ?? 0), 0);
  const totalPct = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;
  const totalStatus = statusOf(totalPct);

  const budgetCategories = new Set(budgets.map(b => b.category));
  const unbudgeted = Object.entries(spend)
    .filter(([cat]) => !budgetCategories.has(cat))
    .sort(([, a], [, b]) => b - a);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 100px", fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: DARK, margin: 0 }}>💰 Orçamento</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 0 }}>
            Tetos de gasto por categoria
          </p>
        </div>
        <button
          onClick={() => openModal()}
          style={{
            background: DARK, color: "#fff", border: "none", borderRadius: 12,
            padding: "10px 18px", fontWeight: 800, fontSize: 14, fontFamily: FONT,
            cursor: "pointer",
          }}
        >
          + Novo teto
        </button>
      </div>

      {/* Month selector */}
      <input
        type="month"
        value={month}
        onChange={e => setMonth(e.target.value)}
        style={{
          marginBottom: 24, border: "1.5px solid #e5e7eb", borderRadius: 10,
          padding: "8px 14px", fontSize: 14, fontFamily: FONT, color: DARK, outline: "none",
        }}
      />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${GREEN}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          {/* Summary card */}
          {budgets.length > 0 && (
            <div className="border border-gray-100 rounded-2xl shadow-sm" style={{ padding: "20px 24px", marginBottom: 20, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>Total do mês</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: totalStatus.color }}>
                  {totalStatus.emoji} {totalPct}%
                </span>
              </div>
              <div style={{ background: "#f3f4f6", height: 10, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
                <div style={{
                  height: "100%", borderRadius: 999,
                  width: `${totalPct}%`,
                  background: totalPct >= 100 ? RED : totalPct >= 80 ? GOLD : GREEN,
                  transition: "width 0.4s ease",
                }} />
              </div>
              <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#6b7280" }}>
                <span>Gasto: <strong style={{ color: DARK }}>R$ {fmtBRL(totalSpent)}</strong></span>
                <span>Teto: <strong style={{ color: DARK }}>R$ {fmtBRL(totalLimit)}</strong></span>
                <span>Restante: <strong style={{ color: GREEN }}>R$ {fmtBRL(Math.max(0, totalLimit - totalSpent))}</strong></span>
              </div>
            </div>
          )}

          {/* Budget cards */}
          {budgets.length === 0 ? (
            <div className="border border-gray-100 rounded-2xl" style={{ padding: "48px 24px", textAlign: "center", background: "#fafafa" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
              <p style={{ fontWeight: 800, color: DARK, margin: "0 0 6px" }}>Nenhum teto definido ainda</p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>Defina limites por categoria e acompanhe seus gastos.</p>
              <button
                onClick={() => openModal()}
                style={{ background: GREEN, color: "#0a200a", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 800, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}
              >
                + Criar primeiro teto
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 28 }}>
              {budgets.map(b => {
                const gastado = spend[b.category] ?? 0;
                const pct = b.limit_amount > 0 ? Math.min(100, Math.round((gastado / b.limit_amount) * 100)) : 0;
                const restante = Math.max(0, b.limit_amount - gastado);
                const st = statusOf(pct);
                return (
                  <div key={b.id} className="border border-gray-100 rounded-2xl shadow-sm" style={{ padding: "18px 20px", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 800, color: DARK, margin: "0 0 4px" }}>{b.category}</p>
                        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}18`, padding: "2px 8px", borderRadius: 999 }}>
                          {st.emoji} {st.label}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteBudget(b.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}
                        title="Excluir teto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div style={{ background: "#f3f4f6", height: 8, borderRadius: 999, overflow: "hidden", margin: "12px 0" }}>
                      <div style={{
                        height: "100%", borderRadius: 999,
                        width: `${pct}%`,
                        background: pct >= 100 ? RED : pct >= 80 ? GOLD : GREEN,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
                      <span>Gasto<br /><strong style={{ fontSize: 14, color: DARK }}>R$ {fmtBRL(gastado)}</strong></span>
                      <span style={{ textAlign: "center" }}>Teto<br /><strong style={{ fontSize: 14, color: DARK }}>R$ {fmtBRL(b.limit_amount)}</strong></span>
                      <span style={{ textAlign: "right" }}>Restante<br /><strong style={{ fontSize: 14, color: restante > 0 ? GREEN : RED }}>R$ {fmtBRL(restante)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Gastos sem teto */}
          {unbudgeted.length > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Gastos sem teto
              </p>
              <div className="border border-gray-100 rounded-2xl" style={{ background: "#fff", overflow: "hidden" }}>
                {unbudgeted.map(([cat, amt], i) => (
                  <div
                    key={cat}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 20px",
                      borderBottom: i < unbudgeted.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DARK }}>{cat}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>R$ {fmtBRL(amt)} gasto no mês</p>
                    </div>
                    <button
                      onClick={() => openModal(cat)}
                      style={{
                        background: "#f0fdf4", color: "#15803d", border: "1.5px solid #bbf7d0",
                        borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 800,
                        fontFamily: FONT, cursor: "pointer",
                      }}
                    >
                      + Teto
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-2xl border border-gray-100 shadow-sm"
            style={{ background: "#fff", width: "100%", maxWidth: 400, padding: 24, fontFamily: FONT }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: DARK }}>Novo teto de orçamento</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                <X size={20} />
              </button>
            </div>

            <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Categoria</label>
            <select
              value={modalCat}
              onChange={e => setModalCat(e.target.value)}
              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: FONT, color: DARK, marginBottom: 16, outline: "none", background: "#fff" }}
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>Teto mensal (R$)</label>
            <input
              type="number"
              value={modalAmt}
              onChange={e => setModalAmt(e.target.value)}
              placeholder="500"
              min="1"
              step="0.01"
              autoFocus
              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 16, fontFamily: FONT, color: DARK, marginBottom: 8, outline: "none", boxSizing: "border-box" }}
            />
            {modalErr && <p style={{ color: RED, fontSize: 12, margin: "0 0 12px" }}>⚠ {modalErr}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => saveBudget(modalCat, modalAmt)}
                disabled={saving || !modalAmt}
                style={{
                  flex: 1, background: DARK, color: "#fff", border: "none", borderRadius: 10,
                  padding: "12px 0", fontWeight: 800, fontSize: 15, fontFamily: FONT,
                  cursor: saving || !modalAmt ? "not-allowed" : "pointer",
                  opacity: saving || !modalAmt ? 0.6 : 1,
                }}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "#f9fafb", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 18px", fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
