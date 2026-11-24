import { CsvUploadForm } from "@/components/imports/csv-upload-form";
import { PageHeader } from "@/components/ui/page-header";

export default function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Import CSV"
        description="Upload a student results CSV. Accepted rows are saved; rejected rows appear with clear reasons."
      />
      <CsvUploadForm />
    </div>
  );
}
