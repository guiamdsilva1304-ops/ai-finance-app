import { cn } from "@/lib/utils";
import Image from "next/image";

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
      <Image
        src="/logo.png"
        alt="iMoney"
        width={size}
        height={size}
        className="shrink-0 object-contain"
        priority
      />
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
