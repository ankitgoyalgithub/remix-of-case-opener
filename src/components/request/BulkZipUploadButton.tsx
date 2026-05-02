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

/**
 * Operator drops a .zip in one click; the backend unzips, classifies each
 * file by content, and runs extraction. The current request gets all the
 * resulting Document rows attached.
 */
export function BulkZipUploadButton({ requestId, onComplete, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Please drop a .zip file');
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append('request', requestId);
    fd.append('file', file);
    const t = toast.loading('Uploading & classifying…');
    try {
      const res: any = await api.studio.bulkUpload(fd);
      const processed = res.processed?.length || 0;
      const skipped = res.skipped?.length || 0;
      const errors = res.errors?.length || 0;
      toast.success(
        `Bulk upload done — processed ${processed}` +
        (skipped ? `, skipped ${skipped}` : '') +
        (errors ? `, ${errors} errors` : ''),
        { id: t },
      );
      onComplete?.();
    } catch (err: any) {
      console.error('Bulk zip upload failed', err);
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
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
        Bulk upload (.zip)
      </Button>
    </>
  );
}
