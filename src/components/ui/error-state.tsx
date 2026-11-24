export function ErrorState({
  title = "Something went wrong",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      className="rounded border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
