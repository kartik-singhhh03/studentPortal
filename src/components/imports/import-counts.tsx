import { describeImportCounts } from "@/lib/format";

export function ImportCounts({
  totalRows,
  acceptedRows,
  rejectedRows,
  skippedRows,
}: {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  skippedRows: number;
}) {
  return (
    <div className="space-y-1 text-sm text-charcoal">
      <p>
        <span className="font-medium text-near-black">{totalRows}</span> rows
        processed
        <span className="text-neutral"> (accepted + rejected)</span>
      </p>
      <p>
        <span className="font-medium text-near-black">{acceptedRows}</span>{" "}
        accepted ·{" "}
        <span className="font-medium text-near-black">{rejectedRows}</span>{" "}
        rejected
      </p>
      {skippedRows > 0 ? (
        <p className="text-neutral">
          {skippedRows} blank row{skippedRows === 1 ? "" : "s"} skipped (not
          counted above)
        </p>
      ) : null}
      <p className="sr-only">
        {describeImportCounts({
          totalRows,
          acceptedRows,
          rejectedRows,
          skippedRows,
        })}
      </p>
    </div>
  );
}
