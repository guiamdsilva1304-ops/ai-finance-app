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
  match_id: number; home_score_pred: number;
  away_score_pred: number; points_earned: number | null;
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
  'Áustria':'🇦🇹','Suécia':'🇸🇪','Noruega':'🇳🇴','Colômbia':'🇨🇴','Equador':'🇪🇨',
  'Paraguai':'🇵🇾','Haiti':'🇭🇹','Panamá':'🇵🇦','Nova Zelândia':'🇳🇿','Kosovo':'🇽🇰',
  'Bósnia-Herzegovina':'🇧🇦','Curaçao':'🇨🇼','Uzbequistão':'🇺🇿','TBD':'🏳️',
};
function flag(t: string) { return FLAGS[t] ?? '🏳️'; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
function isUpcoming(iso: string) { return new Date(iso) > new Date(); }

function getRound(n: number): string {
  if (n <= 24) return '1ª Rodada';
  if (n <= 48) return '2ª Rodada';
  if (n <= 72) return '3ª Rodada';
  return '';
}

const STAGE_ORDER = [
  'Grupo A','Grupo B','Grupo C','Grupo D','Grupo E','Grupo F',
  'Grupo G','Grupo H','Grupo I','Grupo J','Grupo K','Grupo L',
  'Oitavas','Quartas','Semifinal','3º Lugar','Final',
];
const KNOCKOUT = ['Oitavas','Quartas','Semifinal','3º Lugar','Final'];

function pointsLabel(pts: number | null) {
  if (pts === null) return null;
  if (pts === 3) return { text: '🎯 +3 exato!', color: C.green500 };
  if (pts === 1) return { text: '✅ +1 resultado', color: '#4CAF50' };
  return { text: '❌ 0 pts', color: C.ink3 };
}

// ── Stepper ────────────────────────────────────────────────────
function Stepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const btn = (label: string, fn: () => void) => (
    <button onClick={fn} disabled={disabled} style={{
      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
      background: disabled ? 'var(--bg-page)' : 'var(--bg-card)',
      color: disabled ? 'var(--text-3)' : 'var(--text-1)',
      fontSize: 18, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT,
    }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {btn('−', () => onChange(Math.max(0, value - 1)))}
      <span style={{ width: 36, textAlign: 'center', fontSize: 22, fontWeight: 900, color: disabled ? 'var(--text-3)' : C.green500, fontFamily: FONT }}>{value}</span>
      {btn('+', () => onChange(Math.min(20, value + 1)))}
    </div>
  );
}

// ── Match Card ─────────────────────────────────────────────────
function MatchCard({
  m, inp, hasPred, isSaving, wasSaved,
  onSave, onChangeHome, onChangeAway,
}: {
  m: Match;
  inp: { home: number; away: number };
  hasPred: boolean; isSaving: boolean; wasSaved: boolean;
  onSave: () => void;
  onChangeHome: (v: number) => void;
  onChangeAway: (v: number) => void;
}) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${hasPred ? C.green500 + '40' : 'var(--border)'}`,
      borderRadius: 14, padding: '16px 16px 14px', marginBottom: 10,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>
        {fmtDate(m.match_date)}{m.venue ? ` · ${m.venue}` : ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 72 }}>
          <div style={{ fontSize: 26, marginBottom: 2 }}>{flag(m.home_team)}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', lineHeight: 1.2 }}>{m.home_team}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Stepper value={inp.home} onChange={onChangeHome} />
          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-3)' }}>×</span>
          <Stepper value={inp.away} onChange={onChangeAway} />
        </div>
        <div style={{ flex: 1, minWidth: 72, textAlign: 'right' }}>
          <div style={{ fontSize: 26, marginBottom: 2 }}>{flag(m.away_team)}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', lineHeight: 1.2 }}>{m.away_team}</div>
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onSave} disabled={isSaving} style={{
          padding: '8px 18px', borderRadius: 10, border: 'none', cursor: isSaving ? 'wait' : 'pointer',
          fontFamily: FONT, fontWeight: 800, fontSize: 12,
          background: wasSaved ? C.green900 : C.green500,
          color: wasSaved ? C.green500 : '#000',
          transition: 'background 0.2s, color 0.2s', minWidth: 130,
        }}>
          {wasSaved ? '✓ Salvo!' : isSaving ? 'Salvando…' : hasPred ? '✎ Atualizar' : '✓ Salvar palpite'}
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────
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
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [myRefCode, setMyRefCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    setUserId(user.id);

    const [mRes, pRes, rRes, profRes] = await Promise.all([
      supabase.from('world_cup_matches').select('*').neq('home_team', 'TBD').order('match_number'),
      supabase.from('world_cup_predictions').select('*').eq('user_id', user.id),
      supabase.from('world_cup_ranking').select('*').order('ranking').limit(30),
      supabase.from('user_profiles').select('referral_code').eq('user_id', user.id).single(),
    ]);

    const mList: Match[] = mRes.data ?? [];
    const pList: Prediction[] = pRes.data ?? [];
    const rList: RankRow[] = rRes.data ?? [];
    if (profRes.data?.referral_code) setMyRefCode(profRes.data.referral_code);

    setMatches(mList);

    const predMap = new Map<number, Prediction>();
    const inpMap = new Map<number, { home: number; away: number }>();
    pList.forEach(p => {
      predMap.set(p.match_id, p);
      inpMap.set(p.match_id, { home: p.home_score_pred, away: p.away_score_pred });
    });
    mList.filter(m => isUpcoming(m.match_date) && !predMap.has(m.id))
      .forEach(m => inpMap.set(m.id, { home: 0, away: 0 }));

    setPreds(predMap);
    setInputs(inpMap);
    setRanking(rList);
    setMyRank(rList.find(r => r.user_id === user.id) ?? null);

    // Abrir por padrão: grupos com jogo ainda aberto
    const upcoming = mList.filter(m => isUpcoming(m.match_date));
    const openSet = new Set<string>(upcoming.map(m => m.stage));
    setOpenGroups(openSet);

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

  function copyLink() {
    if (!myRefCode) return;
    navigator.clipboard.writeText(`https://imoney.ia.br/bolao?ref=${myRefCode}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function setInp(matchId: number, side: 'home' | 'away', v: number) {
    setInputs(prev => {
      const cur = prev.get(matchId) ?? { home: 0, away: 0 };
      return new Map(prev).set(matchId, { ...cur, [side]: v });
    });
  }

  function toggleGroup(stage: string) {
    setOpenGroups(prev => {
      const n = new Set(prev);
      n.has(stage) ? n.delete(stage) : n.add(stage);
      return n;
    });
  }

  // ── Group matches: stage → round → matches
  function buildGroups(list: Match[]) {
    const stageMap = new Map<string, Map<string, Match[]>>();
    list.forEach(m => {
      if (!stageMap.has(m.stage)) stageMap.set(m.stage, new Map());
      const roundKey = KNOCKOUT.includes(m.stage) ? m.stage : getRound(m.match_number);
      const roundMap = stageMap.get(m.stage)!;
      if (!roundMap.has(roundKey)) roundMap.set(roundKey, []);
      roundMap.get(roundKey)!.push(m);
    });
    // Sort stages
    const sorted = new Map<string, Map<string, Match[]>>();
    STAGE_ORDER.forEach(s => { if (stageMap.has(s)) sorted.set(s, stageMap.get(s)!); });
    return sorted;
  }

  const upcoming = matches.filter(m => isUpcoming(m.match_date));
  const past = matches.filter(m => !isUpcoming(m.match_date)).reverse();
  const upcomingGroups = buildGroups(upcoming);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.green500}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const totalPts = myRank?.total_points ?? 0;
  const rankPos = myRank?.ranking;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(16px,4vw,32px)', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>⚽ Bolão Copa 2026</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, marginBottom: 0 }}>Palpite nos jogos · Top 3 ganham prêmios reais</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.green500 }}>{totalPts}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>pontos</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'var(--bg-card)', border: `1px solid ${rankPos && rankPos <= 3 ? C.gold : 'var(--border)'}`, borderRadius: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>{rankPos ? `#${rankPos}` : '—'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>ranking</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{preds.size} {preds.size === 1 ? 'palpite enviado' : 'palpites enviados'}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: upcoming.length > 0 ? C.green500 : 'var(--text-3)' }}>{upcoming.length} jogos abertos</span>
        </div>
      </div>

      {/* Indique e ganhe */}
      {myRefCode && (
        <div style={{ marginBottom: 24, background: 'var(--bg-card)', border: `1px solid ${C.green500}30`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: C.green500, marginBottom: 14 }}>
            Indique e ganhe
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Seu código de indicação</div>
              <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 900, color: C.green500, letterSpacing: 6, lineHeight: 1, marginBottom: 10 }}>
                {myRefCode}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>
                Cada amigo que entrar pelo seu link vale pontos extras.<br />
                O 3º lugar do ranking leva desconto na assinatura por 1 ano.
              </p>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
              <div style={{
                background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 12px', fontSize: 11, color: 'var(--text-3)',
                fontFamily: 'monospace', wordBreak: 'break-all', letterSpacing: 0.5,
              }}>
                imoney.ia.br/bolao?ref={myRefCode}
              </div>
              <button
                onClick={copyLink}
                style={{
                  padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: FONT, fontWeight: 800, fontSize: 13,
                  background: copied ? `${C.green500}20` : C.green500,
                  color: copied ? C.green500 : '#000',
                  outline: copied ? `1px solid ${C.green500}` : 'none',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {copied ? '✓ Link copiado!' : '🔗 Copiar link de indicação'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          {upcomingGroups.size === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
              <p style={{ fontWeight: 700 }}>Todos os jogos já começaram!</p>
            </div>
          )}

          {Array.from(upcomingGroups).map(([stage, roundMap]) => {
            const isOpen = openGroups.has(stage);
            const isKnockout = KNOCKOUT.includes(stage);
            const totalInStage = Array.from(roundMap.values()).flat().length;
            const predictedInStage = Array.from(roundMap.values()).flat().filter(m => preds.has(m.id)).length;

            return (
              <div key={stage} style={{ marginBottom: 12 }}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(stage)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: isOpen ? '12px 12px 0 0' : 12,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderBottom: isOpen ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer', fontFamily: FONT,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-1)' }}>{stage}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                      background: predictedInStage === totalInStage ? `${C.green500}20` : 'var(--bg-page)',
                      color: predictedInStage === totalInStage ? C.green500 : 'var(--text-3)',
                      border: `1px solid ${predictedInStage === totalInStage ? C.green500 + '40' : 'var(--border)'}`,
                    }}>
                      {predictedInStage}/{totalInStage} palpites
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </button>

                {/* Rounds inside group */}
                {isOpen && (
                  <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px 16px 8px' }}>
                    {Array.from(roundMap).map(([round, roundMatches]) => (
                      <div key={round}>
                        {!isKnockout && (
                          <div style={{
                            fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2,
                            color: C.green500, marginBottom: 10, marginTop: 4,
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}>
                            <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'inline-block' }} />
                            {round}
                            <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'inline-block' }} />
                          </div>
                        )}
                        {roundMatches.map(m => {
                          const inp = inputs.get(m.id) ?? { home: 0, away: 0 };
                          return (
                            <MatchCard
                              key={m.id}
                              m={m}
                              inp={inp}
                              hasPred={preds.has(m.id)}
                              isSaving={saving === m.id}
                              wasSaved={saved.has(m.id)}
                              onSave={() => save(m.id)}
                              onChangeHome={v => setInp(m.id, 'home', v)}
                              onChangeAway={v => setInp(m.id, 'away', v)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
          {Array.from(buildGroups(past)).map(([stage, roundMap]) => (
            <div key={stage} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-3)', marginBottom: 12 }}>{stage}</div>
              {Array.from(roundMap).map(([round, roundMatches]) => (
                <div key={round}>
                  {!KNOCKOUT.includes(stage) && (
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: C.green500, marginBottom: 8, opacity: 0.8 }}>{round}</div>
                  )}
                  {roundMatches.map(m => {
                    const pred = preds.get(m.id);
                    const pts = pointsLabel(pred?.points_earned ?? null);
                    return (
                      <div key={m.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>{fmtDate(m.match_date)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
                          <div style={{ textAlign: 'right', flex: 1 }}>
                            <div style={{ fontSize: 20 }}>{flag(m.home_team)}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>{m.home_team}</div>
                          </div>
                          <div style={{ textAlign: 'center', flexShrink: 0 }}>
                            {m.status === 'finished'
                              ? <div style={{ fontSize: 22, fontWeight: 900, color: C.green500, fontFamily: FONT, letterSpacing: 3 }}>{m.home_score} – {m.away_score}</div>
                              : <div style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 700 }}>– vs –</div>
                            }
                          </div>
                          <div style={{ textAlign: 'left', flex: 1 }}>
                            <div style={{ fontSize: 20 }}>{flag(m.away_team)}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>{m.away_team}</div>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          {pred
                            ? <><span style={{ fontSize: 13, color: 'var(--text-3)' }}>Seu palpite: <strong style={{ color: 'var(--text-1)' }}>{pred.home_score_pred} – {pred.away_score_pred}</strong></span>
                                {pts && <span style={{ fontSize: 13, fontWeight: 800, color: pts.color }}>{pts.text}</span>}</>
                            : <span style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>Você não palpitou neste jogo.</span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
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
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 60px 60px', padding: '10px 16px', background: 'var(--bg-page)', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-3)' }}>
              <span>#</span><span>Participante</span><span style={{ textAlign: 'center' }}>Exatos</span><span style={{ textAlign: 'right' }}>Pts</span>
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
                  <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 16, color: medal ? C.gold : 'var(--text-3)' }}>{medal ?? `${r.ranking}`}</span>
                  <span style={{ fontWeight: isMe ? 800 : 600, fontSize: 14, color: isMe ? C.green500 : 'var(--text-1)' }}>{r.display_name}{isMe ? ' (você)' : ''}</span>
                  <span style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>{r.exact_scores}</span>
                  <span style={{ textAlign: 'right', fontFamily: FONT, fontSize: 18, fontWeight: 900, color: C.green500 }}>{r.total_points}</span>
                </div>
              );
            })}
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', marginTop: 16 }}>
            🥇 Premium vitalício · 🥈 Pro vitalício · 🥉 30% off Pro ou 50% off Premium por 1 ano
          </p>
        </div>
      )}
    </div>
  );
}
