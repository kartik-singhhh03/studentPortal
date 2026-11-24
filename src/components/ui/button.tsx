import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "border-near-black bg-near-black text-white hover:bg-charcoal disabled:border-border disabled:bg-border disabled:text-neutral",
  secondary:
    "border-border bg-white text-near-black hover:bg-off-white disabled:text-neutral",
  ghost:
    "border-transparent bg-transparent text-charcoal hover:bg-off-white hover:text-near-black",
} as const;

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-medium transition-[background-color,transform,opacity] duration-150 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-near-black disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
