'use client';
import * as React from 'react';
import { C, FONT } from './tokens';

/* ───── Icon (Lucide-style inline strokes) ───── */
export type IconName =
  | 'target' | 'wallet' | 'sparkles' | 'home' | 'plus' | 'bell'
  | 'chevron-right' | 'chevron-left' | 'check' | 'user' | 'send'
  | 'trending-up' | 'plane' | 'car' | 'ring' | 'arrow-up-right'
  | 'arrow-down-left' | 'compass' | 'chat' | 'pie'
  | 'piggy-bank' | 'calendar';

export function Icon({
  name, size = 22, color = C.green900, stroke = 1.75,
}: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'target': return <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'sparkles': return <svg {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>;
    case 'home': return <svg {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case 'check': return <svg {...p} strokeWidth={2.4}><polyline points="20 6 9 17 4 12"/></svg>;
    case 'trending-up': return <svg {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
    case 'compass': return <svg {...p}><circle cx="12" cy="12" r="10"/><polygon points="16 8 14 14 8 16 10 10"/></svg>;
    case 'bell': return <svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
    case 'plus': return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'chevron-right': return <svg {...p}><polyline points="9 18 15 12 9 6"/></svg>;
    case 'chevron-left': return <svg {...p}><polyline points="15 18 9 12 15 6"/></svg>;
    case 'user': return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'send': return <svg {...p}><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>;
    case 'wallet': return <svg {...p}><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>;
    case 'arrow-up-right': return <svg {...p}><path d="M7 17 17 7M7 7h10v10"/></svg>;
    case 'arrow-down-left': return <svg {...p}><path d="M17 7 7 17M17 17H7V7"/></svg>;
    case 'chat': return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'pie': return <svg {...p}><path d="M21 15.5A9 9 0 1 1 8.5 3"/><path d="M21 12A9 9 0 0 0 12 3v9z"/></svg>;
    case 'plane': return <svg {...p}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>;
    case 'car': return <svg {...p}><path d="M5 17H3a2 2 0 0 1-2-2v-3l2.5-5.5A2 2 0 0 1 5.3 5h13.4a2 2 0 0 1 1.8 1.1L23 12v3a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
    case 'ring': return <svg {...p}><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>;
    case 'piggy-bank': return <svg {...p}><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z"/><path d="M2 9v1a2 2 0 0 0 2 2"/><path d="M16 11h0" strokeWidth={2.5}/></svg>;
    case 'calendar': return <svg {...p}><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
    default: return <svg {...p}/>;
  }
}

/* ───── LogoMark ───── */
export function LogoMark({ size = 32, radius }: { size?: number; radius?: number }) {
  const r = radius != null ? radius : Math.round(size * 0.22);
  return (
    <img
      src="/imoney/logo-icon-512.png"
      alt="iMoney"
      width={size}
      height={size}
      style={{ borderRadius: r, display: 'block' }}
    />
  );
}

/* ───── Button ───── */
type ButtonVariant = 'primary' | 'dark' | 'ghost' | 'pro';
export function Button({
  children, variant = 'primary', onClick, href, full = false, icon, style = {},
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  href?: string;
  full?: boolean;
  icon?: IconName;
  style?: React.CSSProperties;
}) {
  const map: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: C.green500, color: '#0a200a' },
    dark:    { background: C.green900, color: '#fff' },
    ghost:   { background: '#fff', color: C.green900, border: '1.5px solid rgba(26,58,26,0.18)' },
    pro:     { background: C.gold, color: '#2a1a00' },
  };
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px 22px', fontFamily: FONT, fontWeight: 800, fontSize: 16,
    borderRadius: 16, border: 0, cursor: 'pointer', textDecoration: 'none',
    transition: 'transform 120ms cubic-bezier(.2,.8,.2,1)',
    width: full ? '100%' : 'auto',
    ...map[variant],
    ...style,
  };
  const press = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.transform = 'scale(0.97)');
  const release = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.transform = 'scale(1)');
  const inner = <>{icon && <Icon name={icon} size={18}/>}{children}</>;
  if (href) return (
    <a href={href} style={base} onMouseDown={press} onMouseUp={release} onMouseLeave={release}>{inner}</a>
  );
  return (
    <button onClick={onClick} style={base} onMouseDown={press} onMouseUp={release} onMouseLeave={release}>{inner}</button>
  );
}

/* ───── Card ───── */
export function Card({
  children, tone = 'white', style = {},
}: { children: React.ReactNode; tone?: 'white' | 'tint' | 'dark' | 'gold'; style?: React.CSSProperties }) {
  const tones: Record<string, React.CSSProperties> = {
    white: { background: '#fff', boxShadow: '0 1px 2px rgba(26,58,26,0.06)', color: C.ink },
    tint:  { background: C.green50, color: C.green900 },
    dark:  { background: C.green900, color: '#fff' },
    gold:  { background: C.gold50,  color: '#5c3a00' },
  };
  return <div style={{ borderRadius: 16, padding: 18, fontFamily: FONT, ...tones[tone], ...style }}>{children}</div>;
}

/* ───── Money ───── */
export function Money({ value, cents = '00', size = 28, color, weight = 900 }:
  { value: string; cents?: string; size?: number; color?: string; weight?: number }) {
  return (
    <span style={{
      fontFamily: FONT, fontWeight: weight, fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.01em', fontSize: size, color,
    }}>
      R$ {value}<span style={{ fontSize: Math.round(size * 0.55), opacity: 0.85 }}>,{cents}</span>
    </span>
  );
}

/* ───── GoalProgress ───── */
export function GoalProgress({ pct, dark = false }: { pct: number; dark?: boolean }) {
  return (
    <div style={{ background: dark ? 'rgba(255,255,255,0.12)' : C.green50, height: 10, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: C.green500, borderRadius: 999 }}/>
    </div>
  );
}

/* ───── GoalCard ───── */
type GoalTone = 'white' | 'dark' | 'gold';
export function GoalCard({
  title, emoji, current, target, pct, statusLeft, statusRight, tone = 'white',
}: {
  title: string;
  emoji: string;
  current: string;
  target?: string;
  pct: number;
  statusLeft: string;
  statusRight: string;
  tone?: GoalTone;
}) {
  const isDark = tone === 'dark';
  const isGold = tone === 'gold';
  const bg = isDark ? C.green900 : isGold ? C.gold50 : '#fff';
  const titleColor = isDark ? '#fff' : C.green900;
  const amountColor = isDark ? '#fff' : isGold ? C.gold : C.green900;
  const targetColor = isDark ? 'rgba(255,255,255,0.5)' : C.ink3;
  const barBg = isDark ? 'rgba(255,255,255,0.12)' : isGold ? 'rgba(249,168,37,0.2)' : C.green50;
  const barFill = isGold ? C.gold : C.green500;
  const statusLeftColor = isDark ? C.green500 : isGold ? '#8a5c00' : C.green500;
  const statusRightColor = isDark ? 'rgba(255,255,255,0.55)' : C.ink3;
  return (
    <div style={{
      background: bg, borderRadius: 16, padding: '20px 22px', fontFamily: FONT,
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(26,58,26,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: titleColor }}>{title}</div>
        <div style={{ fontSize: 26 }}>{emoji}</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <span style={{
          fontSize: 30, fontWeight: 900, color: amountColor,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
        }}>R$ {current}</span>
        {target && (
          <span style={{ fontSize: 14, color: targetColor, marginLeft: 6 }}>/ {target}</span>
        )}
      </div>
      <div style={{ background: barBg, height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barFill, borderRadius: 999 }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: statusLeftColor }}>{statusLeft}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: statusRightColor }}>{statusRight}</span>
      </div>
    </div>
  );
}

/* ───── FormField ───── */
export function FormField({
  label, placeholder, value, onChange, helper, error, success, type = 'text', prefix,
}: {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  helper?: string;
  error?: string;
  success?: string;
  type?: 'text' | 'email' | 'password' | 'currency';
  prefix?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);
  const borderColor = hasError ? C.danger : (focused || hasSuccess) ? C.green500 : 'rgba(26,58,26,0.18)';
  const hint = error ?? success ?? helper;
  const hintColor = hasError ? C.danger : hasSuccess ? C.green500 : C.ink3;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: FONT }}>
      <label style={{ fontSize: 14, fontWeight: 700, color: C.green900 }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        border: `1.5px solid ${borderColor}`, borderRadius: 12,
        overflow: 'hidden', background: '#fff', transition: 'border-color 150ms',
      }}>
        {prefix && (
          <div style={{
            padding: '0 13px', background: C.green50,
            display: 'flex', alignItems: 'center',
            fontSize: 14, fontWeight: 800, color: C.green900,
            borderRight: `1.5px solid ${borderColor}`, flexShrink: 0,
          }}>{prefix}</div>
        )}
        <input
          type={type === 'currency' ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, padding: '13px 14px', border: 'none', outline: 'none',
            fontSize: 15, fontFamily: FONT, color: C.ink, background: 'transparent',
          }}
        />
      </div>
      {hint && (
        <span style={{ fontSize: 12.5, fontWeight: 600, color: hintColor }}>{hint}</span>
      )}
    </div>
  );
}

/* ───── PlanUpgradeCard ───── */
export function PlanUpgradeCard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: FONT }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '26px 24px',
        border: `1.5px solid rgba(26,58,26,0.10)`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.ink3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Gratuito</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: C.green900, letterSpacing: '-0.02em', marginBottom: 12 }}>Comece sua jornada</div>
        <div style={{ fontSize: 34, fontWeight: 900, color: C.green900, marginBottom: 8 }}>R$ 0</div>
        <div style={{ fontSize: 13, color: C.ink3, lineHeight: 1.5, marginBottom: 22 }}>
          Dashboard · metas básicas · Assessor IA 10 msgs/dia
        </div>
        <Button variant="dark" full href="/login">Baixar grátis</Button>
      </div>
      <div style={{
        background: 'linear-gradient(160deg, #f9a825 0%, #f4b54a 100%)',
        borderRadius: 20, padding: '26px 24px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#8a5c00', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>✨ Pro</div>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#2a1a00', letterSpacing: '-0.02em', marginBottom: 12 }}>Invista no seu sonho</div>
        <div style={{ fontSize: 34, fontWeight: 900, color: '#2a1a00', marginBottom: 8 }}>
          R$ 29,90<span style={{ fontSize: 15, fontWeight: 700 }}>/mês</span>
        </div>
        <div style={{ fontSize: 13, color: '#7a4f00', lineHeight: 1.5, marginBottom: 22 }}>
          Menos de R$1/dia — o preço de um café
        </div>
        <Button variant="dark" full href="/dashboard/pro">Virar Pro →</Button>
      </div>
    </div>
  );
}

/* ───── Toast ───── */
type ToastType = 'conquista' | 'progresso' | 'atencao' | 'gui';
const TOAST_CFG: Record<ToastType, { emoji: string; iconBg: string; bg: string; titleColor: string; bodyColor: string }> = {
  conquista: { emoji: '🎉', iconBg: '#fff3e0', bg: '#fff',      titleColor: C.green900, bodyColor: C.ink2 },
  progresso: { emoji: '✨', iconBg: C.green50,  bg: '#fff',      titleColor: C.green900, bodyColor: C.ink2 },
  atencao:   { emoji: '💡', iconBg: '#fff8e1', bg: '#fff',      titleColor: C.green900, bodyColor: C.ink2 },
  gui:       { emoji: '🧭', iconBg: C.green500, bg: C.green900, titleColor: '#fff',      bodyColor: 'rgba(255,255,255,0.72)' },
};
export function Toast({ type, title, body }: { type: ToastType; title: string; body: string }) {
  const cfg = TOAST_CFG[type];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: cfg.bg, borderRadius: 16, padding: '16px 18px',
      boxShadow: '0 2px 12px rgba(26,58,26,0.10)', fontFamily: FONT,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: cfg.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>{cfg.emoji}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: cfg.titleColor, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: cfg.bodyColor, lineHeight: 1.4 }}>{body}</div>
      </div>
    </div>
  );
}
