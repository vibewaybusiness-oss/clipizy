import { cn } from "@/lib/utils";

export const VibewaveLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-12 h-12", className)}
  >
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
        <stop offset="100%" style={{ stopColor: "hsl(var(--accent))" }} />
      </linearGradient>
    </defs>
    <g transform="translate(50, 50)">
      <circle cx="0" cy="0" r="48" fill="none" stroke="url(#logoGradient)" strokeWidth="4" />
      <path
        d="M -30 15 Q -15 25 0 15 T 30 15"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M -30 0 Q -15 -10 0 0 T 30 0"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="4"
        strokeLinecap="round"
      />
       <path
        d="M -30 -15 Q -15 -25 0 -15 T 30 -15"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </g>
  </svg>
);
