"use client";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
  animate?: boolean;
  animDelay?: number;
}

export function MetricCard({ label, value, sub, trend, trendValue, icon, className, animate = true, animDelay = 0 }: MetricCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-[#16a34a]" : trend === "down" ? "text-red-500" : "text-[#8db89d]";
  return (
    <div className={cn("card card-hover relative overflow-hidden", animate && "animate-fade-up opacity-0", className)}
      style={animate ? { animationDelay: `${animDelay}ms` } : undefined}>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#16a34a] via-[#4ade80] to-transparent opacity-60" />
      <div className="flex items-start justify-between mb-3">
        <span className="metric-label">{label}</span>
        {icon && <span className="text-[#bbf7d0] opacity-80">{icon}</span>}
      </div>
      <div className="metric-val mb-1">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {sub && <span className="metric-sub">{sub}</span>}
        {trend && trendValue && (
          <span className={cn("flex items-center gap-0.5 text-xs font-bold ml-auto", trendColor)}>
            <TrendIcon size={12} />{trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="card">
      <div className="shimmer h-3 w-20 rounded mb-3" />
      <div className="shimmer h-8 w-32 rounded mb-2" />
      <div className="shimmer h-3 w-16 rounded" />
    </div>
  );
}
