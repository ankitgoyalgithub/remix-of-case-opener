import jsPDF from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  CaseData,
  DOCUMENT_TYPE_LABELS,
} from '@/types/case';

type RGB = [number, number, number];

const COLOR = {
  text: [20, 20, 22] as RGB,
  muted: [102, 108, 118] as RGB,
  border: [206, 211, 218] as RGB,
  tint: [243, 245, 248] as RGB,
  primary: [212, 33, 56] as RGB,
  success: [34, 150, 75] as RGB,
  warning: [217, 153, 16] as RGB,
  danger: [212, 33, 56] as RGB,
};

const MARGIN_X = 16;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 16;

interface DrawContext {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  y: number;
  meta: HeaderMeta;
}

interface HeaderMeta {
  companyName: string;
  smartId: string;
  isFinal: boolean;
  generatedAt: Date;
}

const TABLE_DEFAULTS: Partial<UserOptions> = {
  theme: 'plain',
  styles: {
    font: 'helvetica',
    fontSize: 9,
    cellPadding: { top: 2.4, bottom: 2.4, left: 3, right: 3 },
    textColor: COLOR.text,
    lineColor: COLOR.border,
    lineWidth: 0.1,
    overflow: 'linebreak',
  },
  headStyles: {
    fillColor: COLOR.tint,
    textColor: COLOR.muted,
    fontStyle: 'bold',
    fontSize: 7.5,
    cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
  },
};

function ensureSpace(ctx: DrawContext, needed: number) {
  if (ctx.y + needed > ctx.pageHeight - MARGIN_BOTTOM) {
    ctx.doc.addPage();
    ctx.y = MARGIN_TOP;
  }
}

function setFill(doc: jsPDF, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function drawSectionHeader(ctx: DrawContext, num: string, title: string) {
  ensureSpace(ctx, 14);
  const { doc } = ctx;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, COLOR.primary);
  doc.text(num, MARGIN_X, ctx.y);
  setText(doc, COLOR.text);
  doc.setFontSize(12);
  doc.text(title, MARGIN_X + 10, ctx.y);
  ctx.y += 2.2;
  setDraw(doc, COLOR.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, ctx.y, ctx.pageWidth - MARGIN_X, ctx.y);
  ctx.y += 5;
}

function drawKeyValueGrid(
  ctx: DrawContext,
  rows: Array<{ label: string; value: string }>,
  cols = 2,
) {
  const { doc } = ctx;
  const colW = ctx.contentWidth / cols;
  const rowH = 10;
  const totalRows = Math.ceil(rows.length / cols);
  ensureSpace(ctx, totalRows * rowH + 2);

  rows.forEach((row, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = MARGIN_X + c * colW;
    const y = ctx.y + r * rowH;
    setText(doc, COLOR.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(row.label.toUpperCase(), x, y);
    setText(doc, COLOR.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(row.value || '—', colW - 4);
    doc.text(lines[0] ?? '—', x, y + 4.6);
  });

  ctx.y += totalRows * rowH + 2;
}

function drawParagraph(ctx: DrawContext, text: string, opts?: { italic?: boolean; muted?: boolean }) {
  const { doc } = ctx;
  doc.setFont('helvetica', opts?.italic ? 'italic' : 'normal');
  doc.setFontSize(9.5);
  setText(doc, opts?.muted ? COLOR.muted : COLOR.text);
  const lines = doc.splitTextToSize(text, ctx.contentWidth);
  ensureSpace(ctx, lines.length * 4.6 + 2);
  doc.text(lines, MARGIN_X, ctx.y);
  ctx.y += lines.length * 4.6 + 2;
}

function drawPill(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  tone: 'success' | 'warning' | 'danger' | 'muted' | 'primary',
) {
  const tones: Record<typeof tone, { fill: RGB; text: RGB }> = {
    success: { fill: [220, 240, 226], text: COLOR.success },
    warning: { fill: [253, 240, 211], text: COLOR.warning },
    danger: { fill: [253, 223, 227], text: COLOR.danger },
    muted: { fill: COLOR.tint, text: COLOR.muted },
    primary: { fill: [253, 223, 227], text: COLOR.primary },
  };
  const t = tones[tone];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const txt = label.toUpperCase();
  const w = doc.getTextWidth(txt) + 5;
  const h = 4.6;
  setFill(doc, t.fill);
  doc.roundedRect(x, y - h + 1.2, w, h, 1.2, 1.2, 'F');
  setText(doc, t.text);
  doc.text(txt, x + 2.5, y);
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'muted' | 'primary' {
  const s = status.toLowerCase();
  if (s === 'complete' || s === 'verified' || s === 'approved' || s === 'extracted' || s === 'passed') return 'success';
  if (s === 'needs-review' || s === 'pending' || s === 'active' || s === 'in-progress') return 'warning';
  if (s === 'failed' || s === 'rejected' || s === 'blocked') return 'danger';
  return 'muted';
}

function drawCoverHeader(ctx: DrawContext) {
  const { doc, meta } = ctx;
  const startY = MARGIN_TOP;

  setFill(doc, COLOR.tint);
  doc.rect(0, 0, ctx.pageWidth, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, COLOR.primary);
  doc.text('EVIDENCE PACK', MARGIN_X, startY);

  setText(doc, COLOR.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(meta.isFinal ? 'FINAL' : 'DRAFT', MARGIN_X + 32, startY);

  setText(doc, COLOR.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(meta.companyName, MARGIN_X, startY + 8);

  setText(doc, COLOR.muted);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.text(meta.smartId, MARGIN_X, startY + 14);

  // Right-aligned generated stamp
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, COLOR.muted);
  const gen = `Generated ${format(meta.generatedAt, 'dd MMM yyyy · HH:mm')}`;
  doc.text(gen, ctx.pageWidth - MARGIN_X, startY, { align: 'right' });

  ctx.y = 40;
}

function drawFooter(doc: jsPDF, meta: HeaderMeta) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, COLOR.muted);
    setDraw(doc, COLOR.border);
    doc.setLineWidth(0.1);
    doc.line(MARGIN_X, ph - MARGIN_BOTTOM + 4, pw - MARGIN_X, ph - MARGIN_BOTTOM + 4);
    doc.text(`${meta.companyName} · ${meta.smartId}`, MARGIN_X, ph - MARGIN_BOTTOM + 9);
    doc.text(meta.isFinal ? 'Final · Audit copy' : 'Draft · Not for distribution', pw / 2, ph - MARGIN_BOTTOM + 9, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pw - MARGIN_X, ph - MARGIN_BOTTOM + 9, { align: 'right' });
  }
}

function table(ctx: DrawContext, opts: UserOptions) {
  autoTable(ctx.doc, {
    ...TABLE_DEFAULTS,
    ...opts,
    styles: { ...TABLE_DEFAULTS.styles, ...(opts.styles ?? {}) },
    headStyles: { ...TABLE_DEFAULTS.headStyles, ...(opts.headStyles ?? {}) },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: MARGIN_BOTTOM + 6 },
    startY: ctx.y,
  });
  // jspdf-autotable stores last Y on the doc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx.y = ((ctx.doc as any).lastAutoTable?.finalY ?? ctx.y) + 6;
}

function renderValueCompact(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    if (value.every(v => typeof v === 'string' || typeof v === 'number')) return value.join(', ');
    return value.map(v => renderValueCompact(v)).join(' · ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${renderValueCompact(v)}`)
      .join(', ');
  }
  return String(value);
}

function sectionRequestSummary(ctx: DrawContext, data: CaseData) {
  drawSectionHeader(ctx, '01', 'Request summary');
  drawKeyValueGrid(ctx, [
    { label: 'Request ID', value: data.id },
    { label: 'Current stage', value: `Stage ${data.currentStage} of ${data.stages.length}` },
    { label: 'Company', value: data.companyName },
    { label: 'Created', value: data.createdAt ? format(data.createdAt, 'dd MMM yyyy HH:mm') : '—' },
    { label: 'Status', value: data.status },
    { label: 'Assigned to', value: data.owner || 'Unassigned' },
    { label: 'Queue', value: data.queue },
    { label: 'Priority', value: data.priority },
  ], 2);
}

function sectionDecision(ctx: DrawContext, data: CaseData) {
  drawSectionHeader(ctx, '02', 'Decision & publication');
  if (!data.decision && !data.publication) {
    drawParagraph(ctx, 'No decision recorded yet.', { muted: true, italic: true });
    return;
  }
  const rows: string[][] = [];
  if (data.decision) {
    rows.push([
      'Decision',
      data.decision.outcome,
      format(data.decision.at, 'dd MMM yyyy HH:mm'),
      data.decision.by || 'System',
      data.decision.comment || '—',
    ]);
  }
  if (data.publication) {
    rows.push([
      'Publication',
      'Published',
      format(data.publication.at, 'dd MMM yyyy HH:mm'),
      data.publication.by || 'System',
      'Data pushed to the core policy system.',
    ]);
  }
  table(ctx, {
    head: [['Event', 'Outcome', 'Timestamp', 'Actor', 'Comment']],
    body: rows,
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 28 },
      4: { cellWidth: 'auto' },
    },
  });
}

function sectionStages(ctx: DrawContext, data: CaseData) {
  drawSectionHeader(ctx, '03', 'Stage completion');
  const body = data.stages.map(s => [
    `S${s.id}`,
    s.name,
    s.status.replace('-', ' '),
  ]);
  table(ctx, {
    head: [['#', 'Stage', 'Status']],
    body,
    columnStyles: {
      0: { cellWidth: 14, fontStyle: 'bold', textColor: COLOR.muted },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (cell) => {
      if (cell.section === 'body' && cell.column.index === 2) {
        const tone = statusTone(String(cell.cell.raw));
        const map: Record<string, RGB> = {
          success: COLOR.success,
          warning: COLOR.warning,
          danger: COLOR.danger,
          muted: COLOR.muted,
          primary: COLOR.primary,
        };
        cell.cell.styles.textColor = map[tone];
      }
    },
  });
}

function sectionChecklist(ctx: DrawContext, data: CaseData) {
  drawSectionHeader(ctx, '04', 'Checklist snapshot');
  let any = false;
  data.stages.forEach(stage => {
    const items = data.checklist.filter(c => c.stageId === stage.id);
    if (items.length === 0) return;
    any = true;
    const completed = items.filter(i => i.checked).length;
    const requiredItems = items.filter(i => i.required);
    const requiredPending = requiredItems.filter(i => !i.checked).length;

    ensureSpace(ctx, 14);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(10);
    setText(ctx.doc, COLOR.text);
    ctx.doc.text(stage.name, MARGIN_X, ctx.y);
    setText(ctx.doc, COLOR.muted);
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(8);
    const suffix = `${completed}/${items.length} complete${requiredPending > 0 ? ` · ${requiredPending} required pending` : ''}`;
    ctx.doc.text(suffix, ctx.pageWidth - MARGIN_X, ctx.y, { align: 'right' });
    ctx.y += 3;

    table(ctx, {
      head: [['', 'Item', 'Required']],
      body: items.map(item => [
        item.checked ? 'CHECK' : 'OPEN',
        item.label,
        item.required ? 'Yes' : 'No',
      ]),
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22, halign: 'center' },
      },
      didParseCell: (cell) => {
        if (cell.section === 'body' && cell.column.index === 0) {
          // Hide the marker text — we draw a shape in didDrawCell instead.
          cell.cell.text = [''];
        }
        if (cell.section === 'body' && cell.column.index === 2) {
          const isReq = String(cell.cell.raw) === 'Yes';
          if (isReq) {
            cell.cell.styles.textColor = COLOR.primary;
            cell.cell.styles.fontStyle = 'bold';
          } else {
            cell.cell.styles.textColor = COLOR.muted;
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 0) return;
        const row = data.row.raw as string[];
        const checked = row[0] === 'CHECK';
        const cx = data.cell.x + data.cell.width / 2;
        const cy = data.cell.y + data.cell.height / 2;
        const r = 1.6;
        if (checked) {
          setFill(ctx.doc, COLOR.success);
          ctx.doc.circle(cx, cy, r, 'F');
          // White check mark inside
          ctx.doc.setDrawColor(255, 255, 255);
          ctx.doc.setLineWidth(0.4);
          ctx.doc.line(cx - 0.9, cy + 0.1, cx - 0.2, cy + 0.8);
          ctx.doc.line(cx - 0.2, cy + 0.8, cx + 1.0, cy - 0.7);
        } else {
          setDraw(ctx.doc, COLOR.border);
          ctx.doc.setLineWidth(0.25);
          ctx.doc.circle(cx, cy, r, 'S');
        }
      },
    });
  });
  if (!any) drawParagraph(ctx, 'No checklist items recorded.', { muted: true, italic: true });
}

function sectionExtracted(ctx: DrawContext, data: CaseData) {
  if (!data.extractedData || data.extractedData.length === 0) return;
  drawSectionHeader(ctx, '05', 'Extracted data');
  data.extractedData.forEach(section => {
    const verifiedCount = section.fields.filter(f => f.status === 'verified').length;

    ensureSpace(ctx, 14);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(10);
    setText(ctx.doc, COLOR.text);
    ctx.doc.text(section.title, MARGIN_X, ctx.y);
    setText(ctx.doc, COLOR.muted);
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(8);
    ctx.doc.text(`${verifiedCount}/${section.fields.length} verified`, ctx.pageWidth - MARGIN_X, ctx.y, { align: 'right' });
    ctx.y += 3;

    table(ctx, {
      head: [['Field', 'Value', 'Confidence', 'Status']],
      body: section.fields.map(f => [
        f.label,
        renderValueCompact(f.value),
        `${f.confidence}%`,
        f.status,
      ]),
      columnStyles: {
        0: { cellWidth: 44, fontStyle: 'bold', textColor: COLOR.muted },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 24, halign: 'right' },
      },
      didParseCell: (cell) => {
        if (cell.section === 'body' && cell.column.index === 3) {
          const tone = statusTone(String(cell.cell.raw));
          const map: Record<string, RGB> = {
            success: COLOR.success, warning: COLOR.warning, danger: COLOR.danger, muted: COLOR.muted, primary: COLOR.primary,
          };
          cell.cell.styles.textColor = map[tone];
          cell.cell.styles.fontStyle = 'bold';
        }
        if (cell.section === 'body' && cell.column.index === 2) {
          const num = parseInt(String(cell.cell.raw)) || 0;
          cell.cell.styles.textColor = num >= 95 ? COLOR.success : num >= 85 ? COLOR.warning : COLOR.danger;
        }
      },
    });
  });
}

function sectionOverrides(ctx: DrawContext, data: CaseData) {
  drawSectionHeader(ctx, '06', 'Overrides');
  const wm = data.workforceMismatch;
  if (!wm.detected || !wm.accepted) {
    drawParagraph(ctx, 'No overrides were applied during this request.', { muted: true, italic: true });
    return;
  }
  table(ctx, {
    head: [['Override', 'Status', 'Detail', 'Reason']],
    body: [[
      'Workforce mismatch',
      'Accepted',
      `MOL ${wm.molCount} vs Census ${wm.censusCount}`,
      wm.acceptReason || '—',
    ]],
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 22, textColor: COLOR.success, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { cellWidth: 'auto' },
    },
  });
}

function sectionTimeline(ctx: DrawContext, data: CaseData) {
  drawSectionHeader(ctx, '07', 'Activity timeline');
  const sorted = [...data.timeline].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  if (sorted.length === 0) {
    drawParagraph(ctx, 'No activity recorded.', { muted: true, italic: true });
    return;
  }
  table(ctx, {
    head: [['When', 'Event', 'Actor', 'Detail']],
    body: sorted.map(e => [
      format(e.timestamp, 'dd MMM HH:mm'),
      e.action,
      e.user,
      e.details || '—',
    ]),
    columnStyles: {
      0: { cellWidth: 28, font: 'courier', fontSize: 8.5, textColor: COLOR.muted },
      1: { cellWidth: 48, fontStyle: 'bold' },
      2: { cellWidth: 32 },
      3: { cellWidth: 'auto' },
    },
  });
}

function sectionDocuments(ctx: DrawContext, data: CaseData) {
  drawSectionHeader(ctx, '08', `Documents (${data.documents.length})`);
  if (data.documents.length === 0) {
    drawParagraph(ctx, 'No documents uploaded.', { muted: true, italic: true });
    return;
  }
  table(ctx, {
    head: [['Document', 'Type', 'Uploaded', 'Status']],
    body: data.documents.map(d => [
      d.name,
      DOCUMENT_TYPE_LABELS[d.type] || d.type,
      format(d.uploadedAt, 'dd MMM yyyy HH:mm'),
      d.status,
    ]),
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold' },
      1: { cellWidth: 44 },
      2: { cellWidth: 34, font: 'courier', fontSize: 8.5, textColor: COLOR.muted },
      3: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (cell) => {
      if (cell.section === 'body' && cell.column.index === 3) {
        const tone = statusTone(String(cell.cell.raw));
        const map: Record<string, RGB> = {
          success: COLOR.success, warning: COLOR.warning, danger: COLOR.danger, muted: COLOR.muted, primary: COLOR.primary,
        };
        cell.cell.styles.textColor = map[tone];
      }
    },
  });
}

function sectionRiskFlags(ctx: DrawContext, data: CaseData) {
  if (!data.riskFlags || data.riskFlags.length === 0) return;
  drawSectionHeader(ctx, '09', `Risk flags (${data.riskFlags.length})`);
  table(ctx, {
    head: [['Severity', 'Title', 'Resolved', 'Resolved by', 'Note']],
    body: data.riskFlags.map(f => [
      f.severity,
      f.title,
      f.resolved ? (f.resolvedAt ? format(f.resolvedAt, 'dd MMM HH:mm') : 'Yes') : 'Open',
      f.resolvedBy || '—',
      f.resolutionNote || f.description || '—',
    ]),
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 28 },
      4: { cellWidth: 60 },
    },
    didParseCell: (cell) => {
      if (cell.section === 'body' && cell.column.index === 0) {
        const sev = String(cell.cell.raw).toLowerCase();
        cell.cell.styles.textColor =
          sev.includes('critical') || sev.includes('high') ? COLOR.danger :
          sev.includes('medium') ? COLOR.warning : COLOR.muted;
      }
      if (cell.section === 'body' && cell.column.index === 2) {
        cell.cell.styles.textColor = String(cell.cell.raw) === 'Open' ? COLOR.danger : COLOR.success;
      }
    },
  });
}

export interface BuildEvidencePdfOptions {
  caseData: CaseData;
}

export async function buildEvidencePackPdf({ caseData }: BuildEvidencePdfOptions): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setFont('helvetica', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN_X * 2;

  const meta: HeaderMeta = {
    companyName: caseData.companyName,
    smartId: caseData.smartId || caseData.id,
    isFinal: caseData.isIssued,
    generatedAt: new Date(),
  };

  const ctx: DrawContext = {
    doc,
    pageWidth,
    pageHeight,
    contentWidth,
    y: MARGIN_TOP,
    meta,
  };

  drawCoverHeader(ctx);

  // Draft/Final pill below header
  const tone = meta.isFinal ? 'success' : 'warning';
  drawPill(doc, MARGIN_X, ctx.y, meta.isFinal ? 'Final · Audit copy' : 'Draft · Pre-decision', tone);
  ctx.y += 6;

  sectionRequestSummary(ctx, caseData);
  sectionDecision(ctx, caseData);
  sectionStages(ctx, caseData);
  sectionChecklist(ctx, caseData);
  sectionExtracted(ctx, caseData);
  sectionOverrides(ctx, caseData);
  sectionTimeline(ctx, caseData);
  sectionDocuments(ctx, caseData);
  sectionRiskFlags(ctx, caseData);

  drawFooter(doc, meta);

  return doc.output('blob');
}

export function downloadEvidencePackPdf(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
