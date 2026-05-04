import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AnalysisData } from '@/types/analysis';
import { EVALUATION_LABELS } from '@/types/analysis';
import {
  calculatePerformance,
  calculateWeightedAverage,
  getCurve,
  getCurveTotals,
  getMarginByCurve,
  getTotals,
  getAverageMargin,
  formatCurrency,
  formatPercent,
} from './calculations';

// Platform palette (matches index.css tokens, converted from HSL to RGB)
const COLORS = {
  primary: [34, 169, 153] as [number, number, number],        // teal --primary 172 66% 40%
  primaryDark: [22, 120, 109] as [number, number, number],
  primaryLight: [224, 244, 241] as [number, number, number],  // accent tint
  headerBg: [15, 32, 39] as [number, number, number],         // dark slate
  headerText: [255, 255, 255] as [number, number, number],
  tableHead: [30, 58, 67] as [number, number, number],        // slate teal
  altRow: [240, 250, 248] as [number, number, number],
  totalRow: [212, 240, 235] as [number, number, number],
  text: [26, 32, 44] as [number, number, number],
  muted: [110, 122, 135] as [number, number, number],
  border: [205, 218, 222] as [number, number, number],
  positive: [38, 154, 102] as [number, number, number],
  negative: [220, 53, 69] as [number, number, number],
};

function addHeader(doc: jsPDF, title: string, data: AnalysisData) {
  const pageW = doc.internal.pageSize.getWidth();

  // Top teal band
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 18, 'F');
  // Thin darker accent line
  doc.setFillColor(...COLORS.primaryDark);
  doc.rect(0, 18, pageW, 1.2, 'F');

  // Brand
  doc.setTextColor(...COLORS.headerText);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('TIJOLÃO', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const evalLabel = EVALUATION_LABELS[data.evaluationType];
  const info = `${evalLabel}  |  Mês: ${data.month}  |  Período: ${data.dateConfig.startDate || '—'} a ${data.dateConfig.endDate || '—'}`;
  doc.text(info, pageW - 14, 12, { align: 'right' });

  // Subtitle row
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 27);

  const total = data.dateConfig.totalWorkingDays || 0;
  const used = data.dateConfig.workingDaysUsed || 0;
  const pct = total > 0 ? (used / total) * 100 : 0;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  const days = `Dias úteis: ${used}/${total} (${formatPercent(pct)})  •  Dias do mês: ${data.dateConfig.totalMonthDays}`;
  doc.text(days, pageW - 14, 27, { align: 'right' });

  // Divider
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(14, 30, pageW - 14, 30);
}

function drawKpiCards(
  doc: jsPDF,
  y: number,
  cards: { label: string; value: string; accent?: [number, number, number] }[],
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap = 4;
  const totalW = pageW - margin * 2;
  const cardW = (totalW - gap * (cards.length - 1)) / cards.length;
  const cardH = 14;

  cards.forEach((c, i) => {
    const x = margin + i * (cardW + gap);
    // Card background
    doc.setFillColor(248, 250, 251);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'FD');
    // Accent stripe
    const accent = c.accent || COLORS.primary;
    doc.setFillColor(...accent);
    doc.rect(x, y, 1.6, cardH, 'F');

    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(c.label.toUpperCase(), x + 4, y + 5);

    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(c.value, x + 4, y + 11);
  });
}

export function exportSalesPdf(data: AnalysisData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Relatório de Análise de Vendas', data);

  const totals = getTotals(data);

  drawKpiCards(doc, 33, [
    { label: 'Faturamento Bruto', value: formatCurrency(data.grossRevenue) },
    { label: 'Meta Total', value: formatCurrency(totals.totalTarget) },
    { label: 'Realizado', value: formatCurrency(totals.totalRealized) },
    {
      label: 'Performance',
      value: formatPercent(totals.performance),
      accent: totals.performance >= 100 ? COLORS.positive : COLORS.negative,
    },
    { label: 'Acima da Meta', value: String(totals.aboveMeta), accent: COLORS.positive },
    { label: 'Abaixo da Meta', value: String(totals.belowMeta), accent: COLORS.negative },
  ]);

  // Main table
  const rows = data.productLines.map((line) => {
    const perf = calculatePerformance(line.salesRealized, line.salesTarget);
    const marginResult = line.marginRealized - line.marginTarget;
    const curve = getCurve(line.participationTarget);
    return [
      line.name,
      formatCurrency(line.salesTarget),
      formatCurrency(line.salesRealized),
      formatPercent(perf),
      formatPercent(marginResult),
      curve,
    ];
  });

  rows.push([
    'TOTAL',
    formatCurrency(totals.totalTarget),
    formatCurrency(totals.totalRealized),
    formatPercent(totals.performance),
    '',
    '',
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['Descrição', 'Meta de Vendas', 'Vendas Realizadas', 'Performance', 'Margem Resultado', 'Curva']],
    body: rows,
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.tableHead,
      textColor: COLORS.headerText,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: { fillColor: COLORS.altRow },
    columnStyles: {
      0: { cellWidth: 55, halign: 'left', fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center', cellWidth: 18 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        const rowIdx = hookData.row.index;
        const isTotal = rowIdx === data.productLines.length;
        if (isTotal) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = COLORS.totalRow;
          hookData.cell.styles.textColor = COLORS.primaryDark;
        }
        // Color performance cell
        if (hookData.column.index === 3 && !isTotal) {
          const raw = parseFloat(String(hookData.cell.raw).replace(/[^\d,.-]/g, '').replace(',', '.'));
          if (!isNaN(raw)) {
            hookData.cell.styles.textColor = raw >= 100 ? COLORS.positive : COLORS.negative;
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
        // Curve cell tinting
        if (hookData.column.index === 5 && !isTotal) {
          const c = String(hookData.cell.raw);
          if (c === 'A') hookData.cell.styles.fillColor = [224, 244, 241];
          else if (c === 'B') hookData.cell.styles.fillColor = [255, 243, 205];
          else if (c === 'C') hookData.cell.styles.fillColor = [235, 238, 241];
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.halign = 'center';
        }
      }
    },
  });

  // Curve summary table
  const curveTotals = getCurveTotals(data);
  const marginByCurve = getMarginByCurve(data);
  const curveY = (doc as any).lastAutoTable.finalY + 8;

  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Resumo por Curva ABC', 14, curveY);

  autoTable(doc, {
    startY: curveY + 2,
    head: [['Curva', 'Previsto', 'Realizado', 'Alcance', 'Acima Meta', 'Abaixo Meta']],
    body: (['A', 'B', 'C'] as const).map((c) => [
      `Curva ${c}`,
      formatCurrency(curveTotals[c].target),
      formatCurrency(curveTotals[c].realized),
      curveTotals[c].target > 0 ? formatPercent((curveTotals[c].realized / curveTotals[c].target) * 100) : '0.00%',
      String(marginByCurve[c].above),
      String(marginByCurve[c].below),
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.tableHead,
      textColor: COLORS.headerText,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: { fillColor: COLORS.altRow },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    tableWidth: 170,
  });

  doc.save(`Analise_Vendas_${data.month}_${data.evaluationType}.pdf`);
}

export function exportMarginsPdf(data: AnalysisData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Relatório de Análise de Margens', data);

  const avgTarget = getAverageMargin(data, 'target');
  const avgRealized = getAverageMargin(data, 'realized');

  drawKpiCards(doc, 33, [
    { label: 'Margem Média Prevista', value: formatPercent(avgTarget) },
    { label: 'CMV Médio Previsto', value: formatPercent(100 - avgTarget) },
    {
      label: 'Margem Média Realizada',
      value: formatPercent(avgRealized),
      accent: avgRealized >= avgTarget ? COLORS.positive : COLORS.negative,
    },
    { label: 'CMV Médio Realizado', value: formatPercent(100 - avgRealized) },
  ]);

  const rows = data.productLines.map((line) => {
    const wpTarget = calculateWeightedAverage(line.marginTarget, line.participationTarget);
    const wpRealized = calculateWeightedAverage(line.marginRealized, line.participationRealized);
    const marginResult = line.marginRealized - line.marginTarget;
    const partResult = line.participationRealized - line.participationTarget;

    return [
      line.name,
      formatPercent(line.marginTarget),
      formatPercent(line.participationTarget),
      formatPercent(wpTarget),
      formatPercent(line.marginRealized),
      formatPercent(line.participationRealized),
      formatPercent(wpRealized),
      formatPercent(marginResult),
      formatPercent(partResult),
    ];
  });

  autoTable(doc, {
    startY: 52,
    head: [
      [
        { content: 'Descrição', rowSpan: 2 },
        { content: 'Previsto', colSpan: 3 },
        { content: 'Realizado', colSpan: 3 },
        { content: 'Resultado', colSpan: 2 },
      ],
      ['Margem', 'Partic.', 'M. Pond.', 'Margem', 'Partic.', 'M. Pond.', 'Margem', 'Partic.'],
    ],
    body: rows,
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLORS.tableHead,
      textColor: COLORS.headerText,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: COLORS.altRow },
    columnStyles: {
      0: { cellWidth: 55, halign: 'left', fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        // Result columns: Margem (7) blue/red, Participação (8) green/yellow
        if (hookData.column.index === 7 || hookData.column.index === 8) {
          const raw = parseFloat(String(hookData.cell.raw).replace(/[^\d,.-]/g, '').replace(',', '.'));
          if (!isNaN(raw)) {
            if (hookData.column.index === 7) {
              hookData.cell.styles.fillColor = raw >= 0 ? [219, 234, 254] : [254, 226, 226];
            } else {
              hookData.cell.styles.fillColor = raw >= 0 ? [220, 252, 231] : [254, 249, 195];
            }
            hookData.cell.styles.textColor = [0, 0, 0];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  doc.save(`Analise_Margens_${data.month}_${data.evaluationType}.pdf`);
}
