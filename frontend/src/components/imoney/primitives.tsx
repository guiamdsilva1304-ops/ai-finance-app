'use client';
import * as React from 'react';
import { C, FONT } from './tokens';

/* ───── Icon (Lucide-style inline strokes) ───── */
export type IconName =
  | 'target' | 'wallet' | 'sparkles' | 'home' | 'plus' | 'bell'
  | 'chevron-right' | 'chevron-left' | 'check' | 'user' | 'send'
  | 'trending-up' | 'plane' | 'car' | 'ring' | 'arrow-up-right'
  | 'arrow-down-left' | 'compass' | 'chat' | 'pie';

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
  children, variant = 'primary', onClick, full = false, icon, style = {},
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  full?: boolean;
  icon?: IconName;
  style?: React.CSSProperties;
}) {
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: C.green500, color: '#0a200a' },
    dark:    { background: C.green900, color: '#fff' },
    ghost:   { background: 'transparent', color: C.green900, border: `1.5px solid ${C.divider}` },
    pro:     { background: C.gold, color: '#2a1a00', boxShadow: '0 12px 28px rgba(249,168,37,0.32)' },
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '14px 22px', fontFamily: FONT, fontWeight: 800, fontSize: 16,
        borderRadius: 14, border: 0, cursor: 'pointer',
        transition: 'transform 120ms cubic-bezier(.2,.8,.2,1)',
        width: full ? '100%' : 'auto',
        ...variants[variant],
        ...style,
      }}
      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {icon && <Icon name={icon} size={18}/>}
      {children}
    </button>
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
