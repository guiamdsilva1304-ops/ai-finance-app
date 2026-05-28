import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get('x-admin-key')
  const cookie = req.cookies.get('imoney_admin_session')?.value
  const SECRET = process.env.ADMIN_SESSION_SECRET || 'imoney-admin-secret-2025'
  return auth === SECRET || cookie === SECRET
}

function weekOfMonth(d: Date): number {
  const day = d.getDate()
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

function ptDay(d: Date): string {
  return ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
}

function shortDate(d: Date): string {
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function ptMonth(d: Date): string {
  return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][d.getMonth()]
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/`/g,'&#96;').replace(/\$/g,'&#36;')
}

type CalItem = {
  week: number; day: string; date: string; brand: string; pillar: string
  emoji: string; format: string; platform: string; title: string
  legenda: string|null; roteiro: string|null; audio: string|null; prompt: string|null
}

const PROMPT_BASE_CONST = `SISTEMA DE DESIGN iMONEY — GUIA OFICIAL v3 2026
Ferramenta: Claude Design
Estilo: flat design brasileiro. PROIBIDO: clay 3D, gradientes, sombras pesadas, bordas decorativas, texturas.

ESPECIFICAÇÕES OBRIGATÓRIAS:
Canvas: 1080x1080px. Fundo padrão: #FFFFFF (branco puro).
Regra de cores: 60% branco | 30% #1a3a1a | 8% #00C853 | 2% #F9A825 (SOMENTE conquista/milestone).
Tipografia: Nunito exclusivamente — Black 900 números | ExtraBold 800 títulos | Bold 700 subtítulos | Regular 400 corpo.
Ícones: flat design linha simples (outline), monocromático. SEM volume, SEM 3D, SEM sombra, SEM clay.
Número do slide: canto superior esquerdo, Nunito Black, cor #00C853, 48px.
Logo iMoney: canto inferior direito — bússola flat + texto iMoney, 36px.
Máximo 3 elementos por slide. Slide CTA (último): fundo #1a3a1a. Slide MILESTONE: fundo #F9A825.

`

const PROMPT_STORIES_CONST = `SISTEMA DE DESIGN iMONEY STORIES — GUIA OFICIAL v3 2026
Ferramenta: Claude Design
Estilo: flat design brasileiro. PROIBIDO: clay 3D, gradientes.
Canvas: 1080x1920px (9:16 vertical). Fundo padrão: #1a3a1a.
Tipografia: Nunito exclusivamente. Ícones: flat design linha simples.
Logo iMoney: centralizado inferior, versão branca, 40px.
Story CTA: fundo #E8F5E9, texto #1a3a1a. Story MILESTONE: fundo #F9A825.

`

function itemToCalItem(row: Record<string, unknown>): CalItem {
  const isReels = (row.content_type as string) === 'reels_script'
  const isCarousel = (row.content_type as string) === 'carousel'
  const isTikTok = (row.platform as string) === 'tiktok'
  
  const refDate = new Date((row.scheduled_for as string) || (row.created_at as string))
  
  let roteiro: string|null = null
  let audio: string|null = null
  let prompt: string|null = null
  
  const vd = (row.visual_description as string) || ''
  
  if (isReels) {
    // Extract roteiro completo and thumbnail prompt from visual_description
    const roteiroMatch = vd.match(/🎬 ROTEIRO COMPLETO:\n([\s\S]*?)(?:\n\n🖼️|$)/)
    const thumbMatch = vd.match(/🖼️ PROMPT THUMBNAIL:\n([\s\S]*)$/)
    const descricaoMatch = vd.match(/^([\s\S]*?)(?:\n\n🎬|$)/)
    
    const roteiroCompleto = roteiroMatch ? roteiroMatch[1].trim() : ''
    const descricao = descricaoMatch ? descricaoMatch[1].trim() : ''
    
    roteiro = [descricao, roteiroCompleto].filter(Boolean).join('\n\n')
    prompt = thumbMatch ? `${PROMPT_BASE_CONST}THUMBNAIL / CAPA DO REEL:\n${thumbMatch[1].trim()}` : null
    audio = `🎵 ÁUDIO TRENDING SUGERIDO\nBusque no TikTok → Sons → Em alta → tema relacionado ao conteúdo\nColoque nos primeiros 3s em volume baixo e narre por cima`
  }
  
  if (isCarousel) {
    const slides = Array.isArray(row.slides) ? row.slides as Record<string,string>[] : []
    const slideCount = (row.visual_description as string)?.match(/Carrossel (\d+) slides/)?.[1] || slides.length.toString()
    
    roteiro = `Workflow: Claude Design (prompt abaixo) → Instagram 19h\nTempo estimado: 25 min\n\n` +
      slides.map((s, i) => {
        const num = s.numero || String(i+1)
        const tipo = s.tipo || 'conteudo'
        const tit = s.titulo || ''
        const corp = s.corpo || ''
        const dest = s.destaque || ''
        return `Slide ${num} (${tipo}): ${tit}${corp ? ' — ' + corp : ''}${dest ? ' | Destaque: ' + dest : ''}`
      }).join('\n')
    
    const slidesPrompt = slides.map((s, i) => {
      const num = s.numero || String(i+1)
      const pi = s.prompt_imagem || `SLIDE ${num}: ${s.titulo || ''}${s.corpo ? ' — ' + s.corpo : ''}`
      return pi
    }).join('\n\n')
    
    prompt = `${PROMPT_BASE_CONST}CARROSSEL ${slideCount} SLIDES — ${row.tema as string}\n\n${slidesPrompt}`
  }
  
  const capt = (row.caption as string) || ''
  const tags = Array.isArray(row.hashtags)
    ? (row.hashtags as string[]).map(h => `#${h.replace(/^#/,'')}`).join(' ')
    : ''
  const legenda = capt ? `${capt}${tags ? '\n\n' + tags : ''}` : null
  
  return {
    week: weekOfMonth(refDate),
    day: ptDay(refDate),
    date: shortDate(refDate),
    brand: 'imoney',
    pillar: (row.pillar as string) || 'Educação',
    emoji: isCarousel ? '🎠' : (isReels ? '🎬' : '📸'),
    format: isCarousel
      ? `Carrossel Instagram — ${isTikTok ? '18h' : '19h'}`
      : `TikTok / Reel — 18h`,
    platform: isCarousel ? 'Instagram' : 'TikTok · Instagram',
    title: (row.tema as string) || '',
    legenda,
    roteiro,
    audio,
    prompt,
  }
}

function generateHTML(items: CalItem[], monthName: string, year: number): string {
  const weeks: Record<number, CalItem[]> = {1:[],2:[],3:[],4:[]}
  items.forEach(it => { (weeks[it.week] || weeks[4]).push(it) })
  
  const weekRanges: Record<number,string> = {
    1: `1 a 7 de ${monthName}`,
    2: `8 a 14 de ${monthName}`,
    3: `15 a 21 de ${monthName}`,
    4: `22 a 31 de ${monthName}`,
  }
  
  const totalPosts = items.length
  const carrosseis = items.filter(i => i.format.includes('Carrossel')).length
  const reels = items.filter(i => i.format.includes('TikTok')).length
  
  const overviewRows = items.map((it, idx) => {
    const bg = idx % 2 === 0 ? '#fff' : '#fafaf8'
    return `<tr style="background:${bg};border-bottom:1px solid #f3f4f6;cursor:pointer" onclick="goToCard(${it.week},${idx})">
      <td style="padding:10px 14px;font-weight:700;font-size:12px;">${esc(it.date)}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6b7280;">${esc(it.day)}</td>
      <td style="padding:10px 14px;"><span style="background:#E8F5E9;color:#1a3a1a;font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px;">💚 iMoney</span></td>
      <td style="padding:10px 14px;font-size:11px;color:#2d6a2d;font-weight:700;">${esc(it.pillar)}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6b7280;">${esc(it.format)}</td>
      <td style="padding:10px 14px;font-size:13px;font-weight:700;max-width:280px;">${esc(it.title)}</td>
    </tr>`
  }).join('\n')
  
  const weekNavBtns = [0,1,2,3,4].map(i => {
    if (i === 0) return `<button class="week-btn active" onclick="showWeek(0)">Visão Geral</button>`
    return `<button class="week-btn" onclick="showWeek(${i})">Sem ${i} · ${weekRanges[i]}</button>`
  }).join('\n    ')
  
  const weekSections = [1,2,3,4].map(w => {
    const wItems = weeks[w]
    if (wItems.length === 0) return ''
    return `<div class="week-section" id="week-${w}">
  <div class="week-header"><span class="week-number">SEMANA ${w}</span><span class="week-range">${weekRanges[w]}</span><span class="week-count" id="count-${w}"></span></div>
  <div class="cards-grid" id="grid-${w}"></div>
</div>`
  }).join('\n')
  
  const calendarJS = JSON.stringify(items.map((it, idx) => ({
    idx,
    week: it.week,
    day: it.day,
    date: it.date,
    brand: it.brand,
    pillar: it.pillar,
    emoji: it.emoji,
    format: it.format,
    platform: it.platform,
    title: it.title,
    legenda: it.legenda,
    roteiro: it.roteiro,
    audio: it.audio,
    prompt: it.prompt,
  })), null, 0)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Calendário Editorial — iMoney • ${monthName} ${year}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Nunito+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  :root{--gd:#1a3a1a;--gv:#00C853;--gl:#E8F5E9;--gm:#2d6a2d;--gold:#F9A825;--gold-light:#FFF8E1;--white:#FFFFFF;--cream:#FAFAF8;--gray:#6b7280;--gray-light:#f3f4f6;--border:#e5e7eb;--personal:#7C3AED;--personal-light:#EDE9FE;--shadow:0 2px 12px rgba(0,0,0,.08);--shadow-lg:0 8px 32px rgba(0,0,0,.12);}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Nunito',sans-serif;background:var(--cream);color:var(--gd);}
  .header{background:var(--gd);padding:28px 32px 20px;position:sticky;top:0;z-index:100;box-shadow:0 4px 24px rgba(0,0,0,.2);}
  .header-inner{max-width:1280px;margin:0 auto;}
  .header-top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
  .logo-badge{width:48px;height:48px;background:var(--gv);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:var(--gd);}
  .logo-area{display:flex;align-items:center;gap:12px;}
  .logo-text h1{font-size:20px;font-weight:900;color:var(--white);line-height:1;}
  .logo-text span{font-size:11px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.5px;}
  .header-meta .month{font-size:28px;font-weight:900;color:var(--white);}
  .header-meta .year{font-size:13px;font-weight:700;color:var(--gv);letter-spacing:1px;}
  .weeks-nav{background:var(--white);border-bottom:1px solid var(--border);padding:0 32px;position:sticky;top:90px;z-index:90;overflow-x:auto;}
  .weeks-nav-inner{max-width:1280px;margin:0 auto;display:flex;gap:4px;padding:12px 0;}
  .week-btn{padding:8px 18px;border:2px solid var(--border);background:transparent;border-radius:24px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;color:var(--gray);cursor:pointer;white-space:nowrap;transition:all .2s;}
  .week-btn:hover{border-color:var(--gv);color:var(--gd);}
  .week-btn.active{background:var(--gd);border-color:var(--gd);color:var(--white);}
  .main{max-width:1280px;margin:0 auto;padding:24px 32px 60px;}
  .week-section{display:none;}
  .week-section.active{display:block;}
  .week-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;}
  .week-number{background:var(--gd);color:var(--white);font-size:11px;font-weight:800;padding:4px 12px;border-radius:20px;letter-spacing:1px;}
  .week-range{font-size:22px;font-weight:900;}
  .week-count{margin-left:auto;font-size:12px;font-weight:600;color:var(--gray);}
  .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:18px;margin-bottom:40px;}
  .card{background:var(--white);border-radius:18px;border:1.5px solid var(--border);overflow:hidden;transition:all .25s;}
  .card:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg);border-color:var(--gv);}
  .card-top{padding:18px 18px 12px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;}
  .card-emoji{font-size:28px;flex-shrink:0;line-height:1.2;}
  .card-meta{flex:1;min-width:0;}
  .card-date-row{display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap;}
  .card-day{font-size:12px;font-weight:700;color:var(--gray);}
  .badge{font-size:11px;font-weight:800;padding:2px 8px;border-radius:8px;background:var(--gl);color:var(--gd);}
  .card-title{font-size:15px;font-weight:800;color:var(--gd);line-height:1.3;}
  .card-chips{padding:0 18px 14px;display:flex;gap:6px;flex-wrap:wrap;cursor:pointer;}
  .chip{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;}
  .chip-pillar{background:var(--gl);color:var(--gm);}
  .chip-format{background:var(--gray-light);color:var(--gray);}
  .chip-platform{background:#fff;border:1px solid var(--border);color:var(--gray);}
  .toggle-row{padding:0 18px 14px;display:flex;justify-content:flex-end;}
  .toggle-btn{font-family:'Nunito',sans-serif;font-size:11px;font-weight:700;color:var(--gv);background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;}
  .arrow{transition:transform .25s;display:inline-block;}
  .card.open .arrow{transform:rotate(180deg);}
  .card-expand{border-top:1px solid var(--gray-light);max-height:0;overflow:hidden;transition:max-height .4s ease;}
  .card.open .card-expand{max-height:8000px;}
  .expand-inner{padding:18px 18px 20px;}
  .expand-section{margin-bottom:16px;}
  .expand-label-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
  .expand-label{font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--gray);}
  .expand-text{font-family:'Nunito Sans',sans-serif;font-size:13px;line-height:1.7;color:#374151;}
  .expand-text.code{font-family:'JetBrains Mono',monospace;background:#0f1923;color:#e2e8f0;border-radius:10px;padding:14px 16px;font-size:11.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word;}
  .audio-box{background:#FFF8E1;border:1px solid #F59E0B;border-radius:10px;padding:10px 14px;margin-bottom:12px;}
  .audio-label{font-size:10px;font-weight:800;color:#92400E;letter-spacing:.5px;margin-bottom:4px;}
  .audio-text{font-size:12px;color:#78350F;line-height:1.5;}
  .copy-btn{font-family:'Nunito',sans-serif;font-size:10px;font-weight:700;color:var(--gd);background:var(--gl);border:none;border-radius:8px;padding:3px 10px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:4px;}
  .copy-btn:hover,.copy-btn.copied{background:var(--gv);color:var(--white);}
  .summary-bar{background:var(--gd);border-radius:18px;padding:22px 26px;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px;margin-bottom:28px;}
  .summary-item{text-align:center;}
  .summary-num{font-size:28px;font-weight:900;color:var(--gv);}
  .summary-label{font-size:11px;font-weight:600;color:rgba(255,255,255,.55);margin-top:4px;}
  .guia-card{background:var(--white);border:1.5px solid var(--gv);border-radius:16px;padding:18px 22px;margin-bottom:24px;}
  .guia-label{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--gv);margin-bottom:12px;}
  .guia-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;font-size:12px;color:var(--gd);}
  .legend-bar{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:24px;}
  .legend-item{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--gray);}
  .legend-dot{width:10px;height:10px;border-radius:50%;}
  html{scroll-behavior:smooth;}
  @media(max-width:700px){.header{padding:18px 16px 14px;}.weeks-nav{padding:0 16px;top:80px;}.main{padding:16px 16px 48px;}.cards-grid{grid-template-columns:1fr;}}
</style>
</head>
<body>
<div class="header">
  <div class="header-inner">
    <div class="header-top">
      <div class="logo-area">
        <div class="logo-badge">i$</div>
        <div class="logo-text"><h1>iMoney — Calendário Editorial</h1><span>GERADO PELO AGENTE DE CONTEÚDO • CLAUDE DESIGN</span></div>
      </div>
      <div class="header-meta"><div class="month">${monthName}</div><div class="year">${year}</div></div>
    </div>
  </div>
</div>

<div class="weeks-nav">
  <div class="weeks-nav-inner">
    ${weekNavBtns}
  </div>
</div>

<div class="main">

<div class="week-section active" id="week-0">
  <div class="week-header"><div class="week-range">Resumo do Mês</div></div>
  <div class="summary-bar">
    <div class="summary-item"><div class="summary-num">${totalPosts}</div><div class="summary-label">Publicações</div></div>
    <div class="summary-item"><div class="summary-num">${carrosseis}</div><div class="summary-label">Carrosséis IG</div></div>
    <div class="summary-item"><div class="summary-num">${reels}</div><div class="summary-label">TikToks / Reels</div></div>
    <div class="summary-item"><div class="summary-num">SEPC</div><div class="summary-label">S30·E35·P20·C15</div></div>
  </div>

  <div class="guia-card">
    <div class="guia-label">✅ Guia de Marketing iMoney v3 — Aplicado</div>
    <div class="guia-grid">
      <div><strong>Cadência:</strong> Seg Blog 7h · Ter Carrossel 19h · Qua TikTok/Reel · Qui Carrossel 19h · Sex TikTok 18h · Sáb Stories 12h · Dom TikTok 18h</div>
      <div><strong>SEPC:</strong> Sonho 30% · Educação 35% · Produto 20% · Conquista 15%</div>
      <div><strong>Workflow:</strong> Claude (roteiro) → Claude Design (prompt) → Instagram/TikTok</div>
      <div><strong>Hashtags IG:</strong> 5 por post · #financaspessoais + 4 específicas</div>
      <div><strong>Áudio Reels:</strong> Trending nos 3 primeiros segundos. Narrar por cima.</div>
      <div><strong>Dourado #F9A825:</strong> EXCLUSIVO para slides de Conquista/milestone.</div>
    </div>
  </div>

  <div class="legend-bar">
    <span style="font-size:13px;font-weight:700;margin-right:4px;">Formato:</span>
    <div class="legend-item"><span style="font-size:18px;">🎠</span> Carrossel Instagram</div>
    <div class="legend-item"><span style="font-size:18px;">🎬</span> TikTok / Reels</div>
    <div class="legend-item"><span style="font-size:18px;">📸</span> Post Instagram</div>
  </div>

  <div style="background:var(--white);border-radius:16px;border:1.5px solid var(--border);overflow:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:var(--gd);color:var(--white);">
        <th style="padding:12px 14px;text-align:left;font-size:11px;">DATA</th>
        <th style="padding:12px 14px;text-align:left;font-size:11px;">DIA</th>
        <th style="padding:12px 14px;text-align:left;font-size:11px;">BRAND</th>
        <th style="padding:12px 14px;text-align:left;font-size:11px;">PILAR</th>
        <th style="padding:12px 14px;text-align:left;font-size:11px;">FORMATO</th>
        <th style="padding:12px 14px;text-align:left;font-size:11px;">TEMA</th>
      </tr></thead>
      <tbody>${overviewRows}</tbody>
    </table>
  </div>
</div>

${weekSections}

</div>

<script>
const _store = {};
const calendar = ${calendarJS};

function copyText(k,bid){
  const t=_store[k]||'';
  navigator.clipboard.writeText(t).then(()=>flash(bid)).catch(()=>{
    const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';
    document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);flash(bid);
  });
}
function flash(bid){
  const b=document.getElementById(bid);if(!b)return;
  b.textContent='Copiado ✓';b.classList.add('copied');
  setTimeout(()=>{b.textContent='Copiar';b.classList.remove('copied');},2000);
}
function nl2br(s){return s?s.replace(/\\n/g,'<br>'):''}
function esc(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):''}

function buildCard(item,idx){
  const hasExpand=item.legenda||item.roteiro||item.prompt||item.audio;
  if(item.legenda) _store['leg-'+idx]=item.legenda;
  if(item.roteiro) _store['rot-'+idx]=item.roteiro;
  if(item.prompt)  _store['pmt-'+idx]=item.prompt;
  const isReel=item.format&&(item.format.toLowerCase().includes('tiktok')||item.format.toLowerCase().includes('reel'));
  return \`
  <div class="card" id="card-\${idx}">
    <div class="card-top" onclick="toggleCard(\${idx})">
      <div class="card-emoji">\${item.emoji}</div>
      <div class="card-meta">
        <div class="card-date-row">
          <span class="card-day">\${item.day} · \${item.date}</span>
          <span class="badge">💚 iMoney</span>
          \${isReel?'<span class="chip" style="background:#FEF3C7;color:#92400E;border:1px solid #F59E0B;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;">🎵 áudio</span>':''}
        </div>
        <div class="card-title">\${esc(item.title)}</div>
      </div>
    </div>
    <div class="card-chips" onclick="toggleCard(\${idx})">
      <span class="chip chip-pillar">\${esc(item.pillar)}</span>
      <span class="chip chip-format">\${esc(item.format)}</span>
      <span class="chip chip-platform">\${esc(item.platform)}</span>
    </div>
    \${hasExpand?\`
    <div class="toggle-row">
      <button class="toggle-btn" onclick="toggleCard(\${idx})">Ver detalhes <span class="arrow">▾</span></button>
    </div>
    <div class="card-expand"><div class="expand-inner">
      \${item.audio?\`<div class="audio-box"><div class="audio-label">🎵 ÁUDIO TRENDING</div><div class="audio-text">\${nl2br(esc(item.audio))}</div></div>\`:''}
      \${item.legenda?\`<div class="expand-section">
        <div class="expand-label-row">
          <span class="expand-label">📸 Legenda / Caption</span>
          <button class="copy-btn" id="copy-leg-\${idx}" onclick="copyText('leg-\${idx}','copy-leg-\${idx}')">Copiar</button>
        </div>
        <div class="expand-text">\${nl2br(esc(item.legenda))}</div>
      </div>\`:''}
      \${item.roteiro?\`<div class="expand-section">
        <div class="expand-label-row">
          <span class="expand-label">🎬 Roteiro / Estrutura</span>
          <button class="copy-btn" id="copy-rot-\${idx}" onclick="copyText('rot-\${idx}','copy-rot-\${idx}')">Copiar</button>
        </div>
        <div class="expand-text">\${nl2br(esc(item.roteiro))}</div>
      </div>\`:''}
      \${item.prompt?\`<div class="expand-section">
        <div class="expand-label-row">
          <span class="expand-label">🎨 Prompt — Claude Design</span>
          <button class="copy-btn" id="copy-pmt-\${idx}" onclick="copyText('pmt-\${idx}','copy-pmt-\${idx}')">Copiar</button>
        </div>
        <div class="expand-text code">\${esc(item.prompt)}</div>
      </div>\`:''}
    </div></div>\`:''}
  </div>\`;
}

function buildOverviewRow(item,idx){
  const bg=idx%2===0?'#fff':'#fafaf8';
  return \`<tr style="background:\${bg};border-bottom:1px solid #f3f4f6;cursor:pointer" onclick="goToCard(\${item.week},\${idx})">
    <td style="padding:10px 14px;font-weight:700;font-size:12px;">\${item.date}</td>
    <td style="padding:10px 14px;font-size:12px;color:#6b7280;">\${item.day}</td>
    <td style="padding:10px 14px;"><span style="background:#E8F5E9;color:#1a3a1a;font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px;">💚 iMoney</span></td>
    <td style="padding:10px 14px;font-size:11px;color:#2d6a2d;font-weight:700;">\${item.pillar}</td>
    <td style="padding:10px 14px;font-size:12px;color:#6b7280;">\${item.format}</td>
    <td style="padding:10px 14px;font-size:13px;font-weight:700;max-width:280px;">\${item.title}</td>
  </tr>\`;
}

function render(){
  document.getElementById('overview-table').innerHTML=calendar.map((item,idx)=>buildOverviewRow(item,idx)).join('');
  [1,2,3,4].forEach(w=>{
    const grid=document.getElementById('grid-'+w);
    if(!grid)return;
    const wItems=calendar.filter(c=>c.week===w);
    grid.innerHTML=wItems.map(item=>buildCard(item,item.idx)).join('');
    const c=document.getElementById('count-'+w);
    if(c) c.textContent=wItems.length+' publicações';
  });
}
function toggleCard(idx){document.getElementById('card-'+idx)?.classList.toggle('open');}
function showWeek(idx){
  document.querySelectorAll('.week-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.week-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('week-'+idx)?.classList.add('active');
  document.querySelectorAll('.week-btn')[idx]?.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}
function goToCard(week,idx){
  showWeek(week);
  setTimeout(()=>{
    const card=document.getElementById('card-'+idx);
    if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('open');}
  },200);
}
render();
</script>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const month = parseInt(url.searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()))

  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('content_pipeline')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const rows = data ?? []
  if (rows.length === 0) return NextResponse.json({ error: 'Nenhum conteúdo encontrado para este mês' }, { status: 404 })

  const calItems: CalItem[] = rows.map(row => itemToCalItem(row as Record<string, unknown>))

  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const monthName = months[month - 1]
  
  const html = generateHTML(calItems, monthName, year)

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="calendario-imoney-${monthName.toLowerCase()}-${year}.html"`,
    },
  })
}
