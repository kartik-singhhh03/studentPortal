export function ProgressIndeterminate({ label }: { label: string }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <p className="text-sm text-charcoal">{label}</p>
      <div className="progress-indeterminate" aria-hidden>
        <span />
      </div>
    </div>
  );
}
