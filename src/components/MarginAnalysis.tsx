import React from 'react';
import type { AnalysisData } from '@/types/analysis';
import {
  calculateWeightedAverage,
  formatPercent,
  getAverageMargin,
} from '@/utils/calculations';

interface MarginAnalysisProps {
  data: AnalysisData;
  onMarginTargetChange: (index: number, value: number) => void;
  onParticipationTargetChange: (index: number, value: number) => void;
}

const MarginAnalysis: React.FC<MarginAnalysisProps> = ({
  data,
  onMarginTargetChange,
  onParticipationTargetChange,
}) => {
  const avgMarginTarget = getAverageMargin(data, 'target');
  const avgMarginRealized = getAverageMargin(data, 'realized');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Margem Média Prevista</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatPercent(avgMarginTarget)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">CMV Médio Previsto</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatPercent(100 - avgMarginTarget)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Margem Média Realizada</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatPercent(avgMarginRealized)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">CMV Médio Realizado</p>
          <p className="text-2xl font-bold font-mono mt-1">{formatPercent(100 - avgMarginRealized)}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="module-card overflow-x-auto">
        <div className="module-header">
          <h2 className="text-lg font-bold">Indicadores de Margem e Participação</h2>
        </div>
        <table className="analysis-table">
          <thead>
            <tr>
              <th className="sticky left-0 bg-muted z-10" rowSpan={2}>Descrição</th>
              <th className="text-center border-r border-border" colSpan={3}>Previsto</th>
              <th className="text-center border-r border-border" colSpan={3}>Realizado</th>
              <th className="text-center" colSpan={2}>Resultado</th>
            </tr>
            <tr>
              <th className="text-right">Margem</th>
              <th className="text-right">Participação</th>
              <th className="text-right border-r border-border">Média Pond.</th>
              <th className="text-right">Margem</th>
              <th className="text-right">Participação</th>
              <th className="text-right border-r border-border">Média Pond.</th>
              <th className="text-right">Margem</th>
              <th className="text-right">Participação</th>
            </tr>
          </thead>
          <tbody>
            {data.productLines.map((line, idx) => {
              const wpTarget = calculateWeightedAverage(line.marginTarget, line.participationTarget);
              const wpRealized = calculateWeightedAverage(line.marginRealized, line.participationRealized);
              const marginResult = line.marginRealized - line.marginTarget;
              const partResult = line.participationRealized - line.participationTarget;

              return (
                <tr key={idx}>
                  <td className="sticky left-0 bg-card z-10 font-sans font-medium text-sm">{line.name}</td>
                  <td className="text-right">
                    <input
                      type="text"
                      className="editable-cell w-20 text-right font-mono text-sm"
                      defaultValue={line.marginTarget.toFixed(2)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(v)) onMarginTargetChange(idx, v);
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td className="text-right">
                    <input
                      type="text"
                      className="editable-cell w-20 text-right font-mono text-sm"
                      defaultValue={line.participationTarget.toFixed(2)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(v)) onParticipationTargetChange(idx, v);
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td className="text-right border-r border-border">{formatPercent(wpTarget)}</td>
                  <td className="text-right font-semibold">{formatPercent(line.marginRealized)}</td>
                  <td className="text-right font-semibold">{formatPercent(line.participationRealized)}</td>
                  <td className="text-right border-r border-border">{formatPercent(wpRealized)}</td>
                  <td
                    className="text-right font-semibold"
                    style={{
                      backgroundColor: marginResult >= 0 ? 'hsl(217 91% 60% / 0.25)' : 'hsl(0 84% 60% / 0.25)',
                      color: '#000',
                    }}
                  >
                    {formatPercent(marginResult)}
                  </td>
                  <td
                    className="text-right font-semibold"
                    style={{
                      backgroundColor: partResult >= 0 ? 'hsl(142 71% 45% / 0.25)' : 'hsl(48 96% 53% / 0.25)',
                      color: '#000',
                    }}
                  >
                    {formatPercent(partResult)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarginAnalysis;
