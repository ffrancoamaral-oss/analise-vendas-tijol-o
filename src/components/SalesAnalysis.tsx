import React from 'react';
import type { AnalysisData } from '@/types/analysis';
import {
  calculatePerformance,
  getCurve,
  getCurveTotals,
  getMarginByCurve,
  getTotals,
  formatCurrency,
  formatPercent,
} from '@/utils/calculations';

interface SalesAnalysisProps {
  data: AnalysisData;
  onGrossRevenueChange: (value: number) => void;
}

const SalesAnalysis: React.FC<SalesAnalysisProps> = ({ data, onGrossRevenueChange }) => {
  const totals = getTotals(data);
  const curveTotals = getCurveTotals(data);
  const marginByCurve = getMarginByCurve(data);
  const workingDaysPct = data.dateConfig.totalWorkingDays > 0
    ? ((data.dateConfig.workingDaysUsed / data.dateConfig.totalWorkingDays) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="module-card">
        <div className="module-header">
          <h2 className="text-lg font-bold">Relatório de Performance de Vendas por Linha de Produto</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Faturamento Bruto Total</p>
            <input
              type="text"
              className="editable-cell w-full text-xl font-bold font-mono mt-1"
              value={formatCurrency(data.grossRevenue)}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d,.-]/g, '').replace(',', '.');
                const num = parseFloat(val);
                if (!isNaN(num)) onGrossRevenueChange(num);
              }}
              onFocus={(e) => {
                e.target.value = data.grossRevenue.toString();
                e.target.select();
              }}
              onBlur={(e) => {
                const num = parseFloat(e.target.value);
                if (!isNaN(num)) onGrossRevenueChange(num);
              }}
            />
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Margem Líquida Total</p>
            <p className="text-2xl font-bold font-mono mt-1 value-positive">{formatPercent(totals.marginPercent)}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totals.totalLucroLiquido)} / {formatCurrency(totals.totalRealized)}</p>
          </div>
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
            {data.productLines.map((line, idx) => {
              const perf = calculatePerformance(line.salesRealized, line.salesTarget);
              const curve = getCurve(line.participationTarget);
              const marginResult = line.marginRealized - line.marginTarget;
              const curveClass = curve === 'A' ? 'curve-a' : curve === 'B' ? 'curve-b' : 'curve-c';
              
              return (
                <tr key={idx} className={curveClass}>
                  <td className="sticky left-0 bg-card z-10 font-sans font-medium text-sm">{line.name}</td>
                  <td className="text-right">{formatCurrency(line.salesTarget)}</td>
                  <td className="text-right font-semibold">{formatCurrency(line.salesRealized)}</td>
                  <td className={`text-right font-semibold ${perf >= 100 ? 'value-positive' : perf > 0 ? 'value-negative' : ''}`}>
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
            <tr className="font-bold border-t-2 border-primary">
              <td className="sticky left-0 bg-card z-10 font-sans">TOTAL</td>
              <td className="text-right">{formatCurrency(totals.totalTarget)}</td>
              <td className="text-right">{formatCurrency(totals.totalRealized)}</td>
              <td className={`text-right ${totals.performance >= 100 ? 'value-positive' : 'value-negative'}`}>
                {formatPercent(totals.performance)}
              </td>
              <td></td>
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
        </div>
      </div>
    </div>
  );
};

export default SalesAnalysis;
