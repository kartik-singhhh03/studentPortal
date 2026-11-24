import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded border border-dashed border-border bg-white px-6 py-12 text-center">
      <h2 className="text-base font-medium text-near-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-neutral">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
