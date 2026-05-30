import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Props {
  requestId: string;
  onComplete?: () => void;
  className?: string;
}

const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc,.zip';

/**
 * Bulk upload — operator picks one or more files (any mix of supported docs +
 * zip archives). Each non-zip file is uploaded directly; each zip is
 * server-side unzipped and every supported entry inside is ingested. Doc-type
 * classification + extraction run automatically for everything.
 */
export function BulkZipUploadButton({ requestId, onComplete, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setBusy(true);
    const fd = new FormData();
    fd.append('request', requestId);
    for (const f of files) {
      fd.append('file', f);
    }
    const t = toast.loading(
      files.length === 1 ? `Uploading ${files[0].name}…` : `Uploading ${files.length} files…`,
    );
    try {
      const res: any = await api.studio.bulkUpload(fd);
      const processed = res.processed?.length || 0;
      const skipped = res.skipped?.length || 0;
      const errors = res.errors?.length || 0;
      const message =
        `Bulk upload done — processed ${processed}` +
        (skipped ? `, skipped ${skipped}` : '') +
        (errors ? `, ${errors} errors` : '');
      // If anything went wrong, surface the first reason in the description
      const firstSkipped = res.skipped?.[0];
      const firstError = res.errors?.[0];
      const description = firstError
        ? `${firstError.name}: ${firstError.error}`
        : firstSkipped
          ? `${firstSkipped.name}: ${firstSkipped.reason}`
          : undefined;
      if (errors > 0) {
        toast.error(message, { id: t, description });
      } else {
        toast.success(message, { id: t, description });
      }
      onComplete?.();
    } catch (err: any) {
      console.error('Bulk upload failed', err);
      toast.error(err?.message || 'Bulk upload failed', { id: t });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) onFiles(files);
          e.target.value = '';
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Pick one or many files at once. Hold Ctrl/Cmd or Shift to multi-select. Supports PDFs, images, Office docs, and .zip archives."
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
        Upload files
      </Button>
    </>
  );
}
