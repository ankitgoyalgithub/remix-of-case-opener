import { Document, DocumentType } from '@/types/case';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, File, Check, Loader2, Eye, Star, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useRef, useState } from 'react';

interface DocumentsPanelProps {
  documents: Document[];
  selectedDocument: Document | null;
  onSelectDocument: (doc: Document) => void;
  activeStage?: number;
  docDefs?: any[];
  onUpload?: (file: globalThis.File) => Promise<void>;
  onReupload?: (docId: string, file: globalThis.File) => Promise<void>;
  onPreview?: (doc: Document) => void;
}

export function DocumentsPanel({
  documents,
  selectedDocument,
  onSelectDocument,
  activeStage,
  docDefs,
  onUpload,
  onReupload,
  onPreview
}: DocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeDocForReupload, setActiveDocForReupload] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      try {
        setIsUploading(true);
        await onUpload(file);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleReuploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onReupload && activeDocForReupload) {
      try {
        setIsUploading(true);
        await onReupload(activeDocForReupload, file);
      } finally {
        setIsUploading(false);
        setActiveDocForReupload(null);
        if (reuploadRef.current) reuploadRef.current.value = '';
      }
    }
  };

  const getDocIcon = (type: string) => {
    if (type.includes('xlsx') || type === 'census') {
      return <FileSpreadsheet className="h-5 w-5 text-success" />;
    }
    if (type.includes('pdf') || type.includes('license') || type.includes('card') || type.includes('quote')) {
      return <FileText className="h-5 w-5 text-indigo-500" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'extracted':
        return (
          <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-bold px-1.5 py-0">
            READY
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-1.5 py-0">
            <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />
            AI RUNNING
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 opacity-50">
            NEW
          </Badge>
        );
    }
  };

  // Show all uploaded case documents (requirements are now case-level, not stage-level)
  const filteredDocuments = documents;

  return (
    <div className="space-y-4">
      <input
        type="file"
        className="hidden"
        ref={reuploadRef}
        onChange={handleReuploadChange}
      />

      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <h3 className="text-[11px] font-black tracking-widest text-muted-foreground uppercase flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" />
          Stage Evidence ({filteredDocuments.length})
        </h3>

        {onUpload && (
          <>
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg border-primary/20 hover:bg-primary/5"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
              Import New
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-2">
        {filteredDocuments.length > 0 ? filteredDocuments.map((doc) => {
          const isSelected = selectedDocument?.id === doc.id;

          return (
            <div
              key={doc.id}
              onClick={() => onSelectDocument(doc)}
              className={cn(
                "group relative p-3 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden",
                isSelected
                  ? "bg-primary/5 border-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.05)]"
                  : "bg-muted/10 border-transparent hover:border-border/60 hover:bg-muted/20"
              )}
            >
              {isSelected && <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl -z-10" />}

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary/10" : "bg-card border border-border/50"
                  )}>
                    {getDocIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-bold truncate transition-colors", isSelected ? "text-primary" : "text-foreground")}>
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(doc.status)}
                      <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
                        {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview?.(doc);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDocForReupload(doc.id);
                      reuploadRef.current?.click();
                    }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">No stage evidence</p>
            <p className="text-[10px] font-medium text-muted-foreground/60 mt-1 max-w-[150px]">Upload associated documents to this stage</p>
          </div>
        )}
      </div>
    </div>
  );
}

