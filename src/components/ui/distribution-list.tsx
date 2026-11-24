export function DistributionList({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{ key: string; label: string; count: number }>;
}) {
  const max = items.reduce((acc, item) => Math.max(acc, item.count), 0);

  return (
    <section className="surface p-5">
      <h2 className="text-sm font-medium text-near-black">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-neutral">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const width = max > 0 ? Math.max(4, (item.count / max) * 100) : 0;
            return (
              <li key={item.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-charcoal">{item.label}</span>
                  <span className="font-medium text-near-black">{item.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-near-black transition-[width] duration-200"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
