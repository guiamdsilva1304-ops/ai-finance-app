"use client";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  dark?: boolean;
}

export function Logo({ size = 48, showText = true, showTagline = false, className, dark = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        viewBox="0 0 90 90"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className="shrink-0"
      >
        <defs>
          <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
          <linearGradient id="lg2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <filter id="glow">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22c55e" floodOpacity="0.5" />
          </filter>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#166534" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background circle */}
        <circle cx="45" cy="45" r="43" fill="white" filter="url(#shadow)" />
        <circle cx="45" cy="45" r="41" fill="none" stroke="url(#lg1)" strokeWidth="2.5" />

        {/* Inner rings */}
        <circle cx="45" cy="45" r="34" fill="none" stroke="#bbf7d0" strokeWidth="0.8" strokeDasharray="3,5" />
        <circle cx="45" cy="45" r="26" fill="none" stroke="#dcfce7" strokeWidth="0.6" />

        {/* Cardinal marks */}
        <g stroke="#22c55e" strokeWidth="1.5" opacity="0.7">
          <line x1="45" y1="5" x2="45" y2="14" />
          <line x1="45" y1="76" x2="45" y2="85" />
          <line x1="5" y1="45" x2="14" y2="45" />
          <line x1="76" y1="45" x2="85" y2="45" />
        </g>
        <g stroke="#86efac" strokeWidth="1" opacity="0.4">
          <line x1="69" y1="21" x2="64" y2="26" />
          <line x1="21" y1="69" x2="26" y2="64" />
          <line x1="69" y1="69" x2="64" y2="64" />
          <line x1="21" y1="21" x2="26" y2="26" />
        </g>

        {/* North needle */}
        <polygon points="45,9 39,45 45,39 51,45" fill="url(#lg1)" filter="url(#glow)" />
        <polygon points="45,9 39,45 45,39 51,45" fill="none" stroke="#86efac" strokeWidth="0.6" opacity="0.6" />

        {/* South needle */}
        <polygon points="45,81 39,45 45,51 51,45" fill="#15803d" opacity="0.8" />

        {/* Fleur-de-lis top */}
        <g transform="translate(45,4)" fill="url(#lg1)">
          <ellipse cx="0" cy="-0.5" rx="2.5" ry="4" />
          <ellipse cx="-3.5" cy="1" rx="2" ry="3" transform="rotate(-25)" />
          <ellipse cx="3.5" cy="1" rx="2" ry="3" transform="rotate(25)" />
          <rect x="-1.5" y="3" width="3" height="3.5" rx="1" />
        </g>

        {/* Center hub */}
        <circle cx="45" cy="45" r="15" fill="white" stroke="url(#lg1)" strokeWidth="2" />
        <circle cx="45" cy="45" r="11" fill="none" stroke="#dcfce7" strokeWidth="0.8" />

        {/* Dollar sign */}
        <text
          x="45" y="51"
          textAnchor="middle"
          fontFamily="Georgia,serif"
          fontSize="18"
          fontWeight="900"
          fill="url(#lg1)"
          filter="url(#glow)"
        >
          $
        </text>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-black leading-none tracking-tight",
              dark ? "text-white" : "text-[#14532d]"
            )}
            style={{ fontFamily: "'Nunito', sans-serif", fontSize: size * 0.55 }}
          >
            iMoney
          </span>
          {showTagline && (
            <span
              className={cn("text-[10px] uppercase tracking-widest font-semibold mt-0.5",
                dark ? "text-green-300" : "text-[#6b9e80]"
              )}
            >
              assessor<strong className={dark ? "text-green-200" : "text-[#15803d]"}>IA</strong> financeira
            </span>
          )}
        </div>
      )}
    </div>
  );
}
