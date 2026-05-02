import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

interface OutputTemplate {
  id: number;
  name: string;
  description?: string;
}

interface Props {
  requestId: string;
  className?: string;
}

export function OutputTemplatePicker({ requestId, className }: Props) {
  const [templates, setTemplates] = useState<OutputTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.studio.outputTemplates.list()
      .then(t => setTemplates(t as OutputTemplate[]))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const renderOne = async (tpl: OutputTemplate) => {
    const url = api.studio.outputTemplates.renderUrl(tpl.id, requestId);
    const t = toast.loading(`Rendering ${tpl.name}…`);
    try {
      const token = getToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const filename = res.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1] || `${tpl.name}.xlsx`;
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success('Downloaded', { id: t });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Render failed', { id: t });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />}
          Generate output
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest">Output templates</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.length === 0 && (
          <DropdownMenuItem disabled className="text-xs">No templates configured.</DropdownMenuItem>
        )}
        {templates.map(t => (
          <DropdownMenuItem key={t.id} onSelect={() => renderOne(t)} className="cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <span className="truncate">{t.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
