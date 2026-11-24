import type { ReactNode } from "react";

const tones = {
  neutral: "border-border bg-white text-charcoal",
  success: "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]",
  warning: "border-[#fde68a] bg-[#fffbeb] text-[#854d0e]",
  danger: "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
