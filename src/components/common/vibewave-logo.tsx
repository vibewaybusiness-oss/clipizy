import { cn } from "@/lib/utils";

interface ClipizyLogoProps {
  className?: string;
}

export function ClipizyLogo({ className }: ClipizyLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("w-8 h-8", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--brand-primary))" />
          <stop offset="100%" stopColor="hsl(var(--brand-accent))" />
        </linearGradient>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--brand-primary))" />
          <stop offset="50%" stopColor="hsl(var(--brand-secondary))" />
          <stop offset="100%" stopColor="hsl(var(--brand-accent))" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle
        cx="16"
        cy="16"
        r="15"
        fill="url(#logoGradient)"
        className="opacity-20"
      />

      {/* Main circle */}
      <circle
        cx="16"
        cy="16"
        r="12"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="2"
      />

      {/* Wave pattern */}
      <path
        d="M8 16 Q12 8, 16 16 T24 16"
        stroke="url(#waveGradient)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Inner wave */}
      <path
        d="M10 16 Q14 12, 18 16 T26 16"
        stroke="url(#waveGradient)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Center dot */}
      <circle
        cx="16"
        cy="16"
        r="2"
        fill="url(#logoGradient)"
      />
    </svg>
  );
}
