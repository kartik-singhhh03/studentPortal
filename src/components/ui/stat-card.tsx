export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface px-4 py-5">
      <p className="text-xs uppercase tracking-wide text-neutral">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-near-black">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-neutral">{hint}</p> : null}
    </div>
  );
}
