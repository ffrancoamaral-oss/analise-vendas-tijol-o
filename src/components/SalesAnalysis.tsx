import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { AnalysisData, ProductLineData } from '@/types/analysis';
import {
  calculatePerformance,
  getCurve,
  getCurveTotals,
  getMarginByCurve,
  getTotals,
  getTotalsFromLines,
  getAverageMargin,
  formatCurrency,
  formatPercent,
} from '@/utils/calculations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SalesAnalysisProps {
  data: AnalysisData;
  onGrossRevenueChange: (value: number) => void;
}

type CurveFilter = 'all' | 'A' | 'B' | 'C';
type SalesFilter = 'all' | 'positive' | 'negative';
type MarginFilter = 'all' | 'positive' | 'negative';

function parseInputNumber(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  // pt-BR style: dots as thousand separators, comma as decimal
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  return parseFloat(normalized);
}

const SalesAnalysis: React.FC<SalesAnalysisProps> = ({ data, onGrossRevenueChange }) => {
  const [draft, setDraft] = React.useState<string | null>(null);
  const [curveFilter, setCurveFilter] = React.useState<CurveFilter>('all');
  const [salesFilter, setSalesFilter] = React.useState<SalesFilter>('all');
  const [marginFilter, setMarginFilter] = React.useState<MarginFilter>('all');

  const totals = getTotals(data);
  const curveTotals = getCurveTotals(data);
  const marginByCurve = getMarginByCurve(data);
  const marginTargetAvg = getAverageMargin(data, 'target');
  const marginOnTrack = totals.marginPercent >= marginTargetAvg;
  const salesOnTrack = totals.performance >= 100;
  const workingDaysPct = data.dateConfig.totalWorkingDays > 0
    ? ((data.dateConfig.workingDaysUsed / data.dateConfig.totalWorkingDays) * 100)
    : 0;

  const allLines: ProductLineData[] = data?.productLines ?? [];

  // Apply chained filters
  const filteredLines = allLines.filter((line) => {
    // Curve filter
    if (curveFilter !== 'all') {
      const curve = getCurve(line.participationTarget);
      if (curve !== curveFilter) return false;
    }
    // Sales filter (Performance vs % Dias Úteis)
    if (salesFilter !== 'all') {
      const perf = calculatePerformance(line.salesRealized, line.salesTarget);
      const isPositive = perf >= workingDaysPct;
      if (salesFilter === 'positive' && !isPositive) return false;
      if (salesFilter === 'negative' && isPositive) return false;
    }
    // Margin filter (Resultado da Margem)
    if (marginFilter !== 'all') {
      const marginResult = line.marginRealized - line.marginTarget;
      const isPositive = marginResult >= 0;
      if (marginFilter === 'positive' && !isPositive) return false;
      if (marginFilter === 'negative' && isPositive) return false;
    }
    return true;
  });

  // Totals reflect only visible (filtered) lines
  const visibleTotals = getTotalsFromLines(filteredLines);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="module-card">
        <div className="module-header">
          <h2 className="text-lg font-bold">Relatório de Performance de Vendas por Linha de Produto</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Vendas Realizadas vs Meta</p>
            <p className="text-2xl font-bold font-mono mt-1">{formatCurrency(totals.totalRealized)}</p>
            <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${salesOnTrack ? 'value-positive text-emerald-600' : 'value-negative text-rose-600'}`}>
              {salesOnTrack ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {formatPercent(totals.performance)} da meta
            </p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Dias Úteis Utilizados</p>
            <p className="text-2xl font-bold font-mono mt-1">{data.dateConfig.workingDaysUsed}</p>
            <p className="text-xs text-muted-foreground">{formatPercent(workingDaysPct, 1)} do total</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Dias Úteis Total</p>
            <p className="text-2xl font-bold font-mono mt-1">{data.dateConfig.totalWorkingDays}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Dias do Mês</p>
            <p className="text-2xl font-bold font-mono mt-1">{data.dateConfig.totalMonthDays}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Meta de Faturamento Total</p>
            <input
              type="text"
              inputMode="decimal"
              className="editable-cell w-full text-xl font-bold font-mono mt-1"
              value={draft ?? formatCurrency(data.grossRevenue)}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => setDraft(String(data.grossRevenue))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              onBlur={() => {
                if (draft !== null) {
                  const num = parseInputNumber(draft);
                  if (!isNaN(num)) onGrossRevenueChange(num);
                }
                setDraft(null);
              }}
            />
          </div>

          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Margem Líquida Total</p>
            <p className={`text-2xl font-bold font-mono mt-1 flex items-center gap-1 ${marginOnTrack ? 'value-positive text-emerald-600' : 'value-negative text-rose-600'}`}>
              {marginOnTrack ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
              {formatPercent(totals.marginPercent)}
            </p>
            <p className="text-xs text-muted-foreground">Meta ponderada: {formatPercent(marginTargetAvg)}</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="module-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Curva</span>
            <Select value={curveFilter} onValueChange={(v) => setCurveFilter(v as CurveFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Curva" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="A">Curva A</SelectItem>
                <SelectItem value="B">Curva B</SelectItem>
                <SelectItem value="C">Curva C</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Vendas</span>
            <Select value={salesFilter} onValueChange={(v) => setSalesFilter(v as SalesFilter)}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Vendas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="positive">Vendas Positivas (Performance ≥ % Dias Úteis)</SelectItem>
                <SelectItem value="negative">{`Vendas Negativas (Performance < % Dias Úteis)`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Margem</span>
            <Select value={marginFilter} onValueChange={(v) => setMarginFilter(v as MarginFilter)}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Margem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="positive">Margem Positiva (Resultado ≥ 0)</SelectItem>
                <SelectItem value="negative">{`Margem Negativa (Resultado < 0)`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground ml-auto self-end">
            {filteredLines.length} de {allLines.length} linhas
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="module-card overflow-x-auto">
        <table className="analysis-table">
          <thead>
            <tr>
              <th className="sticky left-0 bg-muted z-10">Descrição</th>
              <th className="text-right">Meta de Vendas</th>
              <th className="text-right">Vendas Realizadas</th>
              <th className="text-right">Performance</th>
              <th className="text-right">Margem Realizada</th>
              <th className="text-center">Curva</th>
            </tr>
          </thead>
          <tbody>
            {filteredLines.map((line, idx) => {
              const perf = calculatePerformance(line.salesRealized, line.salesTarget);
              const curve = getCurve(line.participationTarget);
              const marginResult = line.marginRealized - line.marginTarget;
              const curveClass = curve === 'A' ? 'curve-a' : curve === 'B' ? 'curve-b' : 'curve-c';
              // Semáforo: performance vs % dias úteis percorridos
              const perfOnTrack = perf >= workingDaysPct;

              return (
                <tr key={idx} className={curveClass}>
                  <td className="sticky left-0 bg-card z-10 font-sans font-medium text-sm">{line.name}</td>
                  <td className="text-right">{formatCurrency(line.salesTarget)}</td>
                  <td className="text-right font-semibold">{formatCurrency(line.salesRealized)}</td>
                  <td className={`text-right font-semibold ${perfOnTrack ? 'value-positive text-emerald-600' : 'value-negative text-rose-600'}`}>
                    {formatPercent(perf)}
                  </td>
                  <td className={`text-right ${marginResult >= 0 ? 'value-positive' : 'value-negative'}`}>
                    {formatPercent(marginResult)}
                  </td>
                  <td className="text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      curve === 'A' ? 'bg-primary/20 text-primary' :
                      curve === 'B' ? 'bg-warning/20 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>{curve}</span>
                  </td>
                </tr>
              );
            })}
            {filteredLines.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-6">
                  Nenhuma linha corresponde aos filtros selecionados.
                </td>
              </tr>
            )}
            <tr className="font-bold border-t-2 border-primary">
              <td className="sticky left-0 bg-card z-10 font-sans">TOTAL</td>
              <td className="text-right">{formatCurrency(visibleTotals.totalTarget)}</td>
              <td className="text-right">{formatCurrency(visibleTotals.totalRealized)}</td>
              <td className={`text-right ${visibleTotals.performance >= workingDaysPct ? 'value-positive text-emerald-600' : 'value-negative text-rose-600'}`}>
                {formatPercent(visibleTotals.performance)}
              </td>
              <td className="text-right value-positive">{formatPercent(visibleTotals.marginPercent)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Curve Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="module-card">
          <div className="module-header">
            <h3 className="text-sm font-semibold">Faturamento por Curva</h3>
          </div>
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Curva</th>
                <th className="text-right">Previsto</th>
                <th className="text-right">Realizado</th>
                <th className="text-right">Alcance</th>
              </tr>
            </thead>
            <tbody>
              {(['A', 'B', 'C'] as const).map((c) => (
                <tr key={c}>
                  <td className="font-sans font-medium">Curva {c}</td>
                  <td className="text-right">{formatCurrency(curveTotals[c].target)}</td>
                  <td className="text-right">{formatCurrency(curveTotals[c].realized)}</td>
                  <td className="text-right">
                    {curveTotals[c].target > 0
                      ? formatPercent((curveTotals[c].realized / curveTotals[c].target) * 100)
                      : '0.00%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="module-card">
          <div className="module-header">
            <h3 className="text-sm font-semibold">Margem por Curva</h3>
          </div>
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Curva</th>
                <th className="text-right">Acima Meta</th>
                <th className="text-right">Abaixo Meta</th>
              </tr>
            </thead>
            <tbody>
              {(['A', 'B', 'C'] as const).map((c) => (
                <tr key={c}>
                  <td className="font-sans font-medium">Curva {c}</td>
                  <td className="text-right value-positive">{marginByCurve[c].above}</td>
                  <td className="text-right value-negative">{marginByCurve[c].below}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="module-card p-4">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Legenda</h3>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-primary/20 border border-primary" /> Curva A — Produtos de maior participação
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-warning/20 border border-warning" /> Curva B — Participação intermediária
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-muted border border-muted-foreground/30" /> Curva C — Menor participação
          </span>
        </div>
        <div className="flex gap-4 text-xs mt-2">
          <span>Meta: <strong className="value-negative">{totals.belowMeta}</strong> abaixo | <strong className="value-positive">{totals.aboveMeta}</strong> acima</span>
          <span className="ml-4">Semáforo Performance: verde ≥ {formatPercent(workingDaysPct, 1)} (dias úteis)</span>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalysis;
