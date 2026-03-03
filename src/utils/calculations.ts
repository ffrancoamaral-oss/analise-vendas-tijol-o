import type { ProductLineData, AnalysisData } from '@/types/analysis';

export function calculateSalesTarget(grossRevenue: number, participationTarget: number): number {
  return grossRevenue * (participationTarget / 100);
}

export function calculatePerformance(realized: number, target: number): number {
  if (target === 0) return 0;
  return (realized / target) * 100;
}

export function calculateWeightedAverage(margin: number, participation: number): number {
  return (margin / 100) * (participation / 100) * 100;
}

export function calculateMarginResult(realized: number, target: number): number {
  return realized - target;
}

export type CurveType = 'A' | 'B' | 'C';

export function getCurve(participationTarget: number): CurveType {
  if (participationTarget >= 2.50) return 'A';
  if (participationTarget >= 0.30) return 'B';
  return 'C';
}

export function getCurveTotals(data: AnalysisData) {
  const curves = { A: { target: 0, realized: 0 }, B: { target: 0, realized: 0 }, C: { target: 0, realized: 0 } };
  
  for (const line of data.productLines) {
    const curve = getCurve(line.participationTarget);
    curves[curve].target += line.salesTarget;
    curves[curve].realized += line.salesRealized;
  }
  
  return curves;
}

export function getMarginByCurve(data: AnalysisData) {
  const curves = { A: { above: 0, below: 0 }, B: { above: 0, below: 0 }, C: { above: 0, below: 0 } };
  
  for (const line of data.productLines) {
    const curve = getCurve(line.participationTarget);
    const marginResult = line.marginRealized - line.marginTarget;
    if (marginResult >= 0) curves[curve].above++;
    else curves[curve].below++;
  }
  
  return curves;
}

export function getTotals(data: AnalysisData) {
  let totalTarget = 0;
  let totalRealized = 0;
  let aboveMeta = 0;
  let belowMeta = 0;

  for (const line of data.productLines) {
    totalTarget += line.salesTarget;
    totalRealized += line.salesRealized;
    if (line.salesRealized >= line.salesTarget && line.salesTarget > 0) aboveMeta++;
    else if (line.salesTarget > 0) belowMeta++;
  }

  return {
    totalTarget,
    totalRealized,
    performance: totalTarget > 0 ? (totalRealized / totalTarget) * 100 : 0,
    aboveMeta,
    belowMeta,
  };
}

export function getAverageMargin(data: AnalysisData, type: 'target' | 'realized') {
  let sumWeighted = 0;
  for (const line of data.productLines) {
    if (type === 'target') {
      sumWeighted += calculateWeightedAverage(line.marginTarget, line.participationTarget);
    } else {
      sumWeighted += calculateWeightedAverage(line.marginRealized, line.participationRealized);
    }
  }
  return sumWeighted;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}
