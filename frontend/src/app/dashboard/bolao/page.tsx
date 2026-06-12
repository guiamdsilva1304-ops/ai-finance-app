'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import { C, FONT } from '@/components/imoney/tokens';

// ── Types ──────────────────────────────────────────────────────
type Match = {
  id: number; match_number: number; stage: string;
  home_team: string; away_team: string;
  match_date: string; venue: string | null;
  home_score: number | null; away_score: number | null;
  status: 'scheduled' | 'live' | 'finished';
};

type Prediction = {
  match_id: number;
  home_score_pred: number;
  away_score_pred: number;
  points_earned: number | null;
};

type RankRow = {
  user_id: string; display_name: string;
  total_points: number; exact_scores: number;
  correct_results: number; ranking: number;
};

// ── Helpers ────────────────────────────────────────────────────
const FLAGS: Record<string, string> = {
  'Brasil':'🇧🇷','Argentina':'🇦🇷','França':'🇫🇷','Alemanha':'🇩🇪','Espanha':'🇪🇸',
  'Portugal':'🇵🇹','Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Holanda':'🇳🇱','Bélgica':'🇧🇪','Uruguai':'🇺🇾',
  'México':'🇲🇽','Estados Unidos':'🇺🇸','Canadá':'🇨🇦','Japão':'🇯🇵','Coreia do Sul':'🇰🇷',
  'Austrália':'🇦🇺','Marrocos':'🇲🇦','Senegal':'🇸🇳','Gana':'🇬🇭','Egito':'🇪🇬',
  'Costa do Marfim':'🇨🇮','RD Congo':'🇨🇩','Cabo Verde':'🇨🇻','Tunísia':'🇹🇳',
  'Argélia':'🇩🇿','Arábia Saudita':'🇸🇦','Irã':'🇮🇷','Iraque':'🇮🇶','Jordânia':'🇯🇴',
  'Catar':'🇶🇦','Suíça':'🇨🇭','Rep. Tcheca':'🇨🇿','Croácia':'🇭🇷','Escócia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Áustria':'🇦🇹','Ucrânia':'🇺🇦','Noruega':'🇳🇴','Colômbia':'🇨🇴','Equador':'🇪🇨',
  'Paraguai':'🇵🇾','Haiti':'🇭🇹','Panamá':'🇵🇦','Nova Zelândia':'🇳🇿','Kosovo':'🇽🇰',
  'Bósnia-Herzegovina':'🇧🇦','Curaçao':'🇨🇼','Uzbequistão':'🇺🇿','TBD':'🏳️',
};

function flag(team: string) { return FLAGS[team] ?? '🏳️'; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function isUpcoming(iso: string) { return new Date(iso) > new Date(); }

function pointsLabel(pts: number | null) {
  if (pts === null) return null;
  if (pts === 3) return { text: '🎯 +3 exato!', color: C.green500 };
  if (pts === 1) return { text: '✅ +1 resultado', color: '#4CAF50' };
  return { text: '❌ 0 pts', color: C.ink3 };
}

// Stepper component
function Stepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const btn = (label: string, fn: () => void) => (
    <button
      onClick={fn}
      disabled={disabled}
      style={{
        width: 32, height: 32, borderRadius: 8, border: `1px solid var(--border)`,
        background: disabled ? 'var(--bg-page)' : 'var(--bg-card)',
        color: disabled ? 'var(--text-3)' : 'var(--text-1)',
        fontSize: 18, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
        fontFamily: FONT,
      }}
    >{label}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {btn('−', () => onChange(Math.max(0, value - 1)))}
      <span style={{
        width: 36, textAlign: 'center', fontSize: 22, fontWeight: 900,
        color: disabled ? 'var(--text-3)' : C.green500, fontFamily: FONT,
      }}>{value}</span>
      {btn('+', () => onChange(Math.min(20, value + 1)))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function BolaoPage() {
  const supabase = createSupabaseBrowser();
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [preds, setPreds] = useState<Map<number, Prediction>>(new Map());
  const [inputs, setInputs] = useState<Map<number, { home: number; away: number }>>(new Map());
  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [myRank, setMyRank] = useState<RankRow | null>(null);
  const [tab, setTab] = useState<'palpitar' | 'resultados' | 'ranking'>('palpitar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    setUserId(user.id);

    const [mRes, pRes, rRes] = await Promise.all([
      supabase.from('world_cup_matches').select('*').neq('home_team', 'TBD').order('match_date'),
      supabase.from('world_cup_predictions').select('*').eq('user_id', user.id),
      supabase.from('world_cup_ranking').select('*').order('ranking').limit(30),
    ]);

    const mList: Match[] = mRes.data ?? [];
    const pList: Prediction[] = pRes.data ?? [];
    const rList: RankRow[] = rRes.data ?? [];

    setMatches(mList);

    const predMap = new Map<number, Prediction>();
    const inpMap = new Map<number, { home: number; away: number }>();
    pList.forEach(p => {
      predMap.set(p.match_id, p);
      inpMap.set(p.match_id, { home: p.home_score_pred, away: p.away_score_pred });
    });
    // Init inputs for unplayed matches
    mList.filter(m => isUpcoming(m.match_date) && !predMap.has(m.id))
      .forEach(m => inpMap.set(m.id, { home: 0, away: 0 }));

    setPreds(predMap);
    setInputs(inpMap);
    setRanking(rList);
    setMyRank(rList.find(r => r.user_id === user.id) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(matchId: number) {
    if (!userId) return;
    const inp = inputs.get(matchId);
    if (!inp) return;
    setSaving(matchId);
    await supabase.from('world_cup_predictions').upsert({
      user_id: userId, match_id: matchId,
      home_score_pred: inp.home, away_score_pred: inp.away,
    }, { onConflict: 'user_id,match_id' });
    setSaved(s => new Set([...s, matchId]));
    setTimeout(() => setSaved(s => { const n = new Set(s); n.delete(matchId); return n; }), 2200);
    setPreds(prev => new Map(prev).set(matchId, {
      match_id: matchId, home_score_pred: inp.home,
      away_score_pred: inp.away, points_earned: null,
    }));
    setSaving(null);
  }

  function setInp(matchId: number, side: 'home' | 'away', v: number) {
    setInputs(prev => {
      const cur = prev.get(matchId) ?? { home: 0, away: 0 };
      return new Map(prev).set(matchId, { ...cur, [side]: v });
    });
  }

  // ── Group matches by date ──
  function groupByDate(list: Match[]) {
    const map = new Map<string, Match[]>();
    list.forEach(m => {
      const day = new Date(m.match_date).toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long',
      });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(m);
    });
    return map;
  }

  const upcoming = matches.filter(m => isUpcoming(m.match_date));
  const past = matches.filter(m => !isUpcoming(m.match_date)).reverse();

  // ── Styles ──
  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '20px 20px',
    marginBottom: 12,
    fontFamily: FONT,
  };

  const stagePill: React.CSSProperties = {
    display: 'inline-block',
    fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
    textTransform: 'uppercase', padding: '2px 8px',
    borderRadius: 6, background: 'var(--bg-page)',
    color: 'var(--text-3)', border: '1px solid var(--border)',
    marginBottom: 12,
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.green500}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const totalPts = myRank?.total_points ?? 0;
  const rankPos = myRank?.ranking ?? '—';
  const totalPreds = preds.size;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(16px,4vw,32px)', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>
              ⚽ Bolão Copa 2026
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, marginBottom: 0 }}>
              Palpite nos jogos · Top 3 ganham vitalício Pro
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              textAlign: 'center', padding: '10px 16px',
              background: 'var(--bg-card)', border: `1px solid var(--border)`, borderRadius: 12,
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.green500 }}>{totalPts}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>pontos</div>
            </div>
            <div style={{
              textAlign: 'center', padding: '10px 16px',
              background: 'var(--bg-card)', border: `1px solid ${rankPos !== '—' && Number(rankPos) <= 3 ? C.gold : 'var(--border)'}`, borderRadius: 12,
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>
                {rankPos !== '—' ? `#${rankPos}` : '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>ranking</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {totalPreds} {totalPreds === 1 ? 'palpite enviado' : 'palpites enviados'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: upcoming.length > 0 ? C.green500 : 'var(--text-3)' }}>
            {upcoming.length} jogos abertos
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
        {(['palpitar', 'resultados', 'ranking'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: FONT, fontWeight: 700, fontSize: 13,
            background: tab === t ? C.green500 : 'transparent',
            color: tab === t ? '#000' : 'var(--text-3)',
            transition: 'background 0.15s, color 0.15s',
          }}>
            {t === 'palpitar' ? '⚽ Palpitar' : t === 'resultados' ? '📊 Resultados' : '🏆 Ranking'}
          </button>
        ))}
      </div>

      {/* ── TAB: PALPITAR ── */}
      {tab === 'palpitar' && (
        <div>
          {upcoming.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
              <p style={{ fontWeight: 700 }}>Todos os jogos já começaram!</p>
            </div>
          )}
          {Array.from(groupByDate(upcoming)).map(([day, dayMatches]) => (
            <div key={day}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-3)', marginBottom: 12, marginTop: 8 }}>
                {day}
              </div>
              {dayMatches.map(m => {
                const inp = inputs.get(m.id) ?? { home: 0, away: 0 };
                const hasPred = preds.has(m.id);
                const isSaving = saving === m.id;
                const wasSaved = saved.has(m.id);
                return (
                  <div key={m.id} style={{ ...card, border: hasPred ? `1px solid ${C.green500}40` : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                      <span style={stagePill}>{m.stage}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {fmtDate(m.match_date)} · {m.venue}
                      </span>
                    </div>

                    {/* Teams + inputs */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      {/* Home */}
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>{flag(m.home_team)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', lineHeight: 1.2 }}>{m.home_team}</div>
                      </div>

                      {/* Inputs */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <Stepper value={inp.home} onChange={v => setInp(m.id, 'home', v)} />
                        <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-3)', margin: '0 4px' }}>×</span>
                        <Stepper value={inp.away} onChange={v => setInp(m.id, 'away', v)} />
                      </div>

                      {/* Away */}
                      <div style={{ flex: 1, minWidth: 80, textAlign: 'right' }}>
                        <div style={{ fontSize: 28, marginBottom: 4 }}>{flag(m.away_team)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', lineHeight: 1.2 }}>{m.away_team}</div>
                      </div>
                    </div>

                    {/* Save button */}
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => save(m.id)}
                        disabled={isSaving}
                        style={{
                          padding: '9px 20px', borderRadius: 10, border: 'none', cursor: isSaving ? 'wait' : 'pointer',
                          fontFamily: FONT, fontWeight: 800, fontSize: 13,
                          background: wasSaved ? C.green900 : C.green500,
                          color: wasSaved ? C.green500 : '#000',
                          transition: 'background 0.2s, color 0.2s',
                          minWidth: 140,
                        }}
                      >
                        {wasSaved ? '✓ Salvo!' : isSaving ? 'Salvando…' : hasPred ? '✎ Atualizar palpite' : '✓ Salvar palpite'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: RESULTADOS ── */}
      {tab === 'resultados' && (
        <div>
          {past.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <p style={{ fontWeight: 700 }}>Nenhum jogo encerrado ainda.</p>
            </div>
          )}
          {past.map(m => {
            const pred = preds.get(m.id);
            const pts = pointsLabel(pred?.points_earned ?? null);
            const finished = m.status === 'finished';
            return (
              <div key={m.id} style={{ ...card, opacity: finished ? 1 : 0.75 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <span style={stagePill}>{m.stage}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(m.match_date)}</span>
                </div>

                {/* Result */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
                  <div style={{ textAlign: 'right', flex: 1 }}>
                    <div style={{ fontSize: 22 }}>{flag(m.home_team)}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{m.home_team}</div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    {finished ? (
                      <div style={{ fontSize: 28, fontWeight: 900, color: C.green500, fontFamily: FONT, letterSpacing: 4 }}>
                        {m.home_score} – {m.away_score}
                      </div>
                    ) : (
                      <div style={{ fontSize: 18, color: 'var(--text-3)', fontWeight: 700 }}>– vs –</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontSize: 22 }}>{flag(m.away_team)}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{m.away_team}</div>
                  </div>
                </div>

                {/* Prediction result */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  {pred ? (
                    <>
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        Seu palpite: <strong style={{ color: 'var(--text-1)' }}>{pred.home_score_pred} – {pred.away_score_pred}</strong>
                      </span>
                      {pts && <span style={{ fontSize: 13, fontWeight: 800, color: pts.color }}>{pts.text}</span>}
                      {!pts && finished && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Calculando…</span>}
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>Você não palpitou neste jogo.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: RANKING ── */}
      {tab === 'ranking' && (
        <div>
          {ranking.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <p style={{ fontWeight: 700 }}>Seja o primeiro a palpitar!</p>
            </div>
          )}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '44px 1fr 60px 60px',
              padding: '10px 16px', background: 'var(--bg-page)',
              fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--text-3)',
            }}>
              <span>#</span><span>Participante</span>
              <span style={{ textAlign: 'center' }}>Exatos</span>
              <span style={{ textAlign: 'right' }}>Pts</span>
            </div>
            {ranking.map((r, i) => {
              const isMe = r.user_id === userId;
              const medal = r.ranking === 1 ? '🥇' : r.ranking === 2 ? '🥈' : r.ranking === 3 ? '🥉' : null;
              return (
                <div key={r.user_id} style={{
                  display: 'grid', gridTemplateColumns: '44px 1fr 60px 60px',
                  padding: '14px 16px', alignItems: 'center',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  background: isMe ? `${C.green500}10` : 'transparent',
                }}>
                  <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 16, color: medal ? C.gold : 'var(--text-3)' }}>
                    {medal ?? `${r.ranking}`}
                  </span>
                  <span style={{ fontWeight: isMe ? 800 : 600, fontSize: 14, color: isMe ? C.green500 : 'var(--text-1)' }}>
                    {r.display_name}{isMe ? ' (você)' : ''}
                  </span>
                  <span style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
                    {r.exact_scores}
                  </span>
                  <span style={{ textAlign: 'right', fontFamily: FONT, fontSize: 18, fontWeight: 900, color: C.green500 }}>
                    {r.total_points}
                  </span>
                </div>
              );
            })}
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', marginTop: 16 }}>
            Top 3 ao final da Copa ganham vitalício iMoney Pro 🏆
          </p>
        </div>
      )}
    </div>
  );
}
