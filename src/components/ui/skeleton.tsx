export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-[var(--radius-sm)] ${className}`}
      aria-hidden
    />
  );
}
