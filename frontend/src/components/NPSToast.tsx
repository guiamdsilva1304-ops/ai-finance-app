"use client";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";

const NPS_KEY = "imoney_nps";
const SHOW_DELAY_MS = 30_000;
const SNOOZE_DAYS = 7;

function snoozeKey() {
  const d = new Date();
  d.setDate(d.getDate() + SNOOZE_DAYS);
  return d.toISOString();
}

export function NPSToast() {
  const { isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NPS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.submitted) return;
        if (parsed.snoozeUntil && new Date(parsed.snoozeUntil) > new Date()) return;
      }
    } catch {}

    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  function handleSubmit() {
    if (score === null) return;
    localStorage.setItem(NPS_KEY, JSON.stringify({
      score,
      comment,
      submitted: true,
      date: new Date().toISOString(),
    }));
    setSubmitted(true);
    setTimeout(() => setVisible(false), 2000);
  }

  function handleDismiss() {
    localStorage.setItem(NPS_KEY, JSON.stringify({ snoozeUntil: snoozeKey() }));
    setVisible(false);
  }

  if (!visible) return null;

  const bg = isDark ? '#1a1f2e' : '#ffffff';
  const border = isDark ? '#2d3748' : '#e5e7eb';
  const text1 = isDark ? '#f1f5f9' : '#111827';
  const text2 = isDark ? '#94a3b8' : '#6b7280';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '16px',
        zIndex: 9999,
        width: '320px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '20px',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      {submitted ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🙏</div>
          <p style={{ color: '#1D9E75', fontWeight: 700, fontSize: '15px', margin: 0 }}>
            Obrigado pelo feedback!
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <p style={{ color: text1, fontWeight: 700, fontSize: '14px', margin: 0, lineHeight: 1.4 }}>
              De 0 a 10, você indicaria o iMoney para um amigo?
            </p>
            <button
              onClick={handleDismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: text2, fontSize: '18px', lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => setScore(i)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  border: score === i ? '2px solid #1D9E75' : `1px solid ${border}`,
                  background: score === i ? '#1D9E75' : 'transparent',
                  color: score === i ? '#fff' : text1,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                {i}
              </button>
            ))}
          </div>

          {score !== null && (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Comentário opcional..."
              rows={2}
              style={{
                width: '100%',
                borderRadius: '8px',
                border: `1px solid ${border}`,
                background: isDark ? '#0f1117' : '#f9fafb',
                color: text1,
                fontSize: '13px',
                padding: '8px',
                marginBottom: '10px',
                resize: 'none',
                fontFamily: 'Nunito, sans-serif',
                boxSizing: 'border-box',
              }}
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={score === null}
            style={{
              width: '100%',
              padding: '9px',
              borderRadius: '8px',
              border: 'none',
              background: score === null ? (isDark ? '#2d3748' : '#e5e7eb') : '#1D9E75',
              color: score === null ? text2 : '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: score === null ? 'not-allowed' : 'pointer',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            Enviar
          </button>
        </>
      )}
    </div>
  );
}
