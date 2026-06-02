// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Roteiro {
  hook: string;
  problema: string;
  virada: string;
  cta: string;
}

interface DiaContent {
  dia: string;
  data: string;
  pilar: string;
  formato: string;
  horario: string;
  titulo: string;
  objetivo: string;
  caption: string;
  slides?: string[];
  roteiro?: Roteiro;
  promptVisual: string;
  hashtags: string[];
}

interface CalendarData {
  semana: string;
  trends: string[];
  dias: DiaContent[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const PILAR_COLORS: Record<string, { bg: string; text: string }> = {
  'Sonho':     { bg: '#7C3AED', text: '#FFFFFF' },
  'Educação':  { bg: '#00C853', text: '#FFFFFF' },
  'Produto':   { bg: '#F59E0B', text: '#FFFFFF' },
  'Conquista': { bg: '#F9A825', text: '#1a3a1a' },
};

function renderHashtags(hashtags: string[]): string {
  return hashtags.map(tag => {
    const isImoney = tag.toLowerCase().includes('imoney');
    return `<span style="display:inline-block;background:${isImoney ? '#1a3a1a' : '#E8F5E9'};color:${isImoney ? '#00C853' : '#1a3a1a'};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin:0 4px 6px 0;font-family:Arial,sans-serif;">${tag}</span>`;
  }).join('');
}

function renderSlides(slides: string[]): string {
  return slides.map((slide, i) => {
    const isCapa = i === 0;
    const isCTA  = i === slides.length - 1;
    const isDark = isCapa || isCTA;
    return `
      <li style="margin:0 0 8px 0;list-style:decimal;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:${isDark ? '#FFFFFF' : '#374151'};background:${isDark ? '#1a3a1a' : '#FFFFFF'};padding:10px 14px;border-radius:8px;border-left:3px solid #00C853;">
        ${slide}
      </li>`;
  }).join('');
}

function renderRoteiro(roteiro: Roteiro): string {
  const cenas = [
    { label: 'gancho',   tempo: '0–2s',   texto: roteiro.hook },
    { label: 'contexto', tempo: '2–15s',  texto: roteiro.problema },
    { label: 'virada',   tempo: '15–35s', texto: roteiro.virada },
    { label: 'CTA',      tempo: '35–45s', texto: roteiro.cta },
  ];
  return cenas.map((c, i) => `
    <li style="margin:0 0 10px 0;list-style:decimal;font-family:Arial,sans-serif;font-size:13px;color:#374151;line-height:1.5;padding:10px 14px;background:#FFFFFF;border-radius:8px;border-left:3px solid #00C853;">
      <strong style="color:#1a3a1a;">Cena ${i + 1} — ${c.label}</strong>
      <span style="color:#9CA3AF;font-size:11px;margin-left:6px;">${c.tempo}</span><br/>
      ${c.texto}
    </li>`
  ).join('');
}

function renderDay(dia: DiaContent): string {
  const pilarColor = PILAR_COLORS[dia.pilar] ?? { bg: '#00C853', text: '#FFFFFF' };
  const isCarrossel = dia.formato?.toLowerCase().includes('carrossel');

  const contentHTML = isCarrossel
    ? `<ol style="margin:0;padding-left:22px;">${renderSlides(dia.slides ?? [])}</ol>`
    : `<ol style="margin:0;padding-left:22px;">${renderRoteiro(dia.roteiro ?? { hook:'', problema:'', virada:'', cta:'' })}</ol>`;

  const contentIcon  = isCarrossel ? '📌' : '🎬';
  const contentLabel = isCarrossel ? 'Slides:' : 'Script:';

  const captionClean = (dia.caption ?? '').split('\n\n')[0].trim();

  return `
  <div style="background:#FFFFFF;border-radius:12px;padding:22px 24px;margin-bottom:20px;border:1px solid #E5E7EB;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
      <span style="background:${pilarColor.bg};color:${pilarColor.text};font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;font-family:Arial,sans-serif;">${dia.pilar}</span>
      <span style="background:#F3F4F6;color:#6B7280;font-size:12px;font-weight:600;padding:4px 14px;border-radius:20px;border:1px solid #E5E7EB;font-family:Arial,sans-serif;">${dia.formato}</span>
      <span style="margin-left:auto;color:#9CA3AF;font-size:12px;font-family:Arial,sans-serif;">🕐 ${dia.horario}</span>
    </div>

    <p style="margin:0 0 6px 0;font-size:17px;font-weight:700;color:#1a3a1a;font-family:Arial,sans-serif;line-height:1.3;">
      ${dia.dia} ${dia.data} — ${dia.titulo}
    </p>

    <p style="margin:0 0 18px 0;font-size:13px;color:#6B7280;font-style:italic;font-family:Arial,sans-serif;line-height:1.5;">
      ${dia.objetivo}
    </p>

    <div style="background:#F0FDF4;border-left:4px solid #00C853;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:18px;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#1a3a1a;font-family:Arial,sans-serif;">✏️ Caption:</p>
      <p style="margin:0;font-size:13px;color:#374151;font-family:Arial,sans-serif;line-height:1.7;white-space:pre-line;">${captionClean}</p>
    </div>

    <div style="margin-bottom:18px;">
      <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#1a3a1a;font-family:Arial,sans-serif;">${contentIcon} ${contentLabel}</p>
      ${contentHTML}
    </div>

    <div style="background:#FFFBEB;border-radius:8px;padding:12px 16px;margin-bottom:16px;border:1px solid #FDE68A;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#92400E;font-family:Arial,sans-serif;">🎨 Prompt Visual:</p>
      <p style="margin:0;font-size:12px;color:#78350F;font-style:italic;font-family:Arial,sans-serif;line-height:1.7;">${dia.promptVisual}</p>
    </div>

    <div>${renderHashtags(dia.hashtags ?? [])}</div>

  </div>`;
}

// ─── BUILD EMAIL HTML ──────────────────────────────────────────────────────────

function buildEmailHTML(data: CalendarData): string {
  const trendsHTML = data.trends.map(t =>
    `<li style="margin:0 0 5px 0;font-size:13px;color:#374151;font-family:Arial,sans-serif;list-style:none;">📈 ${t}</li>`
  ).join('');

  const daysHTML = (data.dias ?? []).map(renderDay).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
<div style="max-width:680px;margin:0 auto;padding:24px 16px;">

  <div style="background:#1a3a1a;border-radius:12px;padding:24px;margin-bottom:20px;text-align:center;">
    <p style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#FFFFFF;font-family:Arial,sans-serif;">🗓️ Calendário Editorial</p>
    <p style="margin:0;font-size:14px;color:#00C853;font-family:Arial,sans-serif;font-weight:600;">Semana de ${data.semana}</p>
  </div>

  <div style="background:#FFFFFF;border-radius:10px;padding:14px 18px;margin-bottom:20px;border-left:4px solid #00C853;">
    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-family:Arial,sans-serif;">📈 Em alta esta semana — integrado ao calendário</p>
    <ul style="margin:0;padding:0;">${trendsHTML}</ul>
  </div>

  <div style="background:#FFFFFF;border-radius:10px;padding:12px 18px;margin-bottom:20px;border-left:4px solid #00C853;">
    <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-family:Arial,sans-serif;">Pilares SEPC</p>
    <p style="margin:0;font-size:12px;color:#555;font-family:Arial,sans-serif;line-height:1.9;">
      🌟 <strong>S = Sonho</strong> (30%) &nbsp;·&nbsp;
      📚 <strong>E = Educação</strong> (35%) &nbsp;·&nbsp;
      📱 <strong>P = Produto</strong> (20%) &nbsp;·&nbsp;
      🏆 <strong>C = Conquista</strong> (15%)
    </p>
  </div>

  ${daysHTML}

  <div style="text-align:center;padding:20px 0 8px 0;">
    <p style="color:#00C853;font-size:14px;font-weight:700;margin:0 0 4px 0;font-family:Arial,sans-serif;">iMoney · imoney.ia.br</p>
    <p style="color:#9CA3AF;font-size:12px;margin:0;font-style:italic;font-family:Arial,sans-serif;">"Seus sonhos têm um plano. A iMoney cuida dele."</p>
  </div>

</div>
</body>
</html>`;
}
