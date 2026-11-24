import { Badge } from "@/components/ui/badge";
import { importStatusLabel } from "@/lib/format";

export function ImportStatusBadge({ status }: { status: string }) {
  const tone =
    status === "COMPLETED"
      ? "success"
      : status === "FAILED"
        ? "danger"
        : status === "SKIPPED_IDENTICAL"
          ? "warning"
          : status === "PROCESSING"
            ? "neutral"
            : "neutral";

  return <Badge tone={tone}>{importStatusLabel(status)}</Badge>;
}
