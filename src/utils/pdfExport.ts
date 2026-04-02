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

function addHeader(doc: jsPDF, title: string, data: AnalysisData) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TIJOLÃO', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 25);

  const evalLabel = EVALUATION_LABELS[data.evaluationType];
  const info = `${evalLabel} | Mês: ${data.month} | Período: ${data.dateConfig.startDate || '—'} a ${data.dateConfig.endDate || '—'}`;
  doc.text(info, pageW - 14, 18, { align: 'right' });

  const days = `Dias úteis: ${data.dateConfig.workingDaysUsed}/${data.dateConfig.totalWorkingDays} | Dias do mês: ${data.dateConfig.totalMonthDays}`;
  doc.text(days, pageW - 14, 25, { align: 'right' });
}

export function exportSalesPdf(data: AnalysisData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Relatório de Análise de Vendas', data);

  const totals = getTotals(data);

  // Summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Faturamento Bruto Total: ${formatCurrency(data.grossRevenue)}`, 14, 34);
  doc.text(`Performance Geral: ${formatPercent(totals.performance)}`, 120, 34);
  doc.text(`Acima da Meta: ${totals.aboveMeta} | Abaixo: ${totals.belowMeta}`, 200, 34);

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
    startY: 38,
    head: [['Descrição', 'Meta de Vendas', 'Vendas Realizadas', 'Performance', 'Margem Resultado', 'Curva']],
    body: rows,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [41, 37, 36], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center', cellWidth: 15 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        const rowIdx = hookData.row.index;
        const isTotal = rowIdx === data.productLines.length;
        if (isTotal) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [245, 245, 244];
        }
      }
    },
  });

  // Curve summary table
  const curveTotals = getCurveTotals(data);
  const marginByCurve = getMarginByCurve(data);
  const curveY = (doc as any).lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: curveY,
    head: [['Curva', 'Previsto', 'Realizado', 'Alcance', 'Acima Meta', 'Abaixo Meta']],
    body: (['A', 'B', 'C'] as const).map((c) => [
      `Curva ${c}`,
      formatCurrency(curveTotals[c].target),
      formatCurrency(curveTotals[c].realized),
      curveTotals[c].target > 0 ? formatPercent((curveTotals[c].realized / curveTotals[c].target) * 100) : '0.00%',
      String(marginByCurve[c].above),
      String(marginByCurve[c].below),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 37, 36], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
    tableWidth: 160,
  });

  doc.save(`Analise_Vendas_${data.month}_${data.evaluationType}.pdf`);
}

export function exportMarginsPdf(data: AnalysisData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  addHeader(doc, 'Relatório de Análise de Margens', data);

  const avgTarget = getAverageMargin(data, 'target');
  const avgRealized = getAverageMargin(data, 'realized');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Margem Média Prevista: ${formatPercent(avgTarget)}`, 14, 34);
  doc.text(`CMV Médio Previsto: ${formatPercent(100 - avgTarget)}`, 80, 34);
  doc.text(`Margem Média Realizada: ${formatPercent(avgRealized)}`, 155, 34);
  doc.text(`CMV Médio Realizado: ${formatPercent(100 - avgRealized)}`, 230, 34);

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
    startY: 38,
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
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [41, 37, 36], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 55, halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
  });

  doc.save(`Analise_Margens_${data.month}_${data.evaluationType}.pdf`);
}
