import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

/** One exportable MOL comparison row — flattened from the report's ParsedRow. */
export interface MolExportRow {
  censusName: string;
  censusPassport: string;
  censusNationality: string;
  molName: string;
  molPassport: string;
  molNationality: string;
  confidence: number | null;
  status: string;
}

export interface MolExportMeta {
  company?: string;
  requestId?: string;
  scopeLabel: string;   // e.g. "Needs review + Missing in MOL"
}

const HEADERS = [
  'Census name', 'Census passport', 'Census nationality',
  'MOL name', 'MOL passport / ID', 'MOL nationality',
  'Confidence', 'Status',
];

function rowToCells(r: MolExportRow): string[] {
  return [
    r.censusName || '',
    r.censusPassport || '',
    r.censusNationality || '',
    r.molName || 'Not found',
    r.molPassport || '',
    r.molNationality || '',
    r.confidence != null ? `${r.confidence}%` : '',
    r.status,
  ];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeStamp(meta: MolExportMeta): string {
  const base = (meta.requestId || meta.company || 'mol-validation').replace(/[^a-zA-Z0-9_-]/g, '_');
  const stamp = new Date().toISOString().slice(0, 16).replace(/\D/g, '');
  return `mol_${base}_${stamp}`;
}

/**
 * CSV — opens cleanly in Excel. UTF-8 BOM so Arabic / accented names survive.
 */
export function exportMolCsv(rows: MolExportRow[], meta: MolExportMeta) {
  const escape = (v: string) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  lines.push(HEADERS.map(escape).join(','));
  for (const r of rows) lines.push(rowToCells(r).map(escape).join(','));

  const csv = '﻿' + lines.join('\r\n');  // BOM
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeStamp(meta)}.csv`);
}

/**
 * PDF — landscape table via jspdf-autotable. Note: jsPDF's core fonts can't
 * render Arabic, so this exports the Latin name + structured fields only.
 */
export function exportMolPdf(rows: MolExportRow[], meta: MolExportMeta) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 22);
  doc.setFont('helvetica', 'bold');
  doc.text('Census Validation', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 108, 118);
  const subtitle = [
    meta.company ? `Company: ${meta.company}` : null,
    meta.requestId ? `Request: ${meta.requestId}` : null,
    `Scope: ${meta.scopeLabel}`,
    `Records: ${rows.length}`,
    `Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`,
  ].filter(Boolean).join('   ·   ');
  doc.text(subtitle, 14, 22);

  autoTable(doc, {
    startY: 27,
    head: [HEADERS],
    body: rows.map(rowToCells),
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2, lineColor: [206, 211, 218], lineWidth: 0.1, textColor: [20, 20, 22] },
    headStyles: { fillColor: [243, 245, 248], textColor: [60, 64, 72], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    columnStyles: {
      6: { halign: 'right' },
    },
    didParseCell: (data) => {
      // Tint the status cell by value.
      if (data.section === 'body' && data.column.index === 7) {
        const v = String(data.cell.raw || '').toLowerCase();
        if (v.includes('missing')) data.cell.styles.textColor = [212, 33, 56];
        else if (v.includes('review')) data.cell.styles.textColor = [183, 121, 13];
        else if (v.includes('confirm') || v.includes('validated')) data.cell.styles.textColor = [34, 150, 75];
      }
    },
  });

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 155, 162);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW - 14, doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    );
  }

  doc.save(`${safeStamp(meta)}.pdf`);
}
