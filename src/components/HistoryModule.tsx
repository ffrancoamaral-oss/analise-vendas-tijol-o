import React from 'react';
import type { AnalysisData } from '@/types/analysis';
import { EVALUATION_LABELS } from '@/types/analysis';
import { formatCurrency, formatPercent, getTotals } from '@/utils/calculations';
import { Trash2, Eye } from 'lucide-react';

interface HistoryModuleProps {
  history: AnalysisData[];
  onDelete: (id: string) => void;
  onLoad: (analysis: AnalysisData) => void;
}

const HistoryModule: React.FC<HistoryModuleProps> = ({ history, onDelete, onLoad }) => {
  if (history.length === 0) {
    return (
      <div className="module-card p-12 text-center">
        <p className="text-muted-foreground">Nenhuma análise salva no histórico.</p>
        <p className="text-sm text-muted-foreground mt-1">Salve uma análise para vê-la aqui.</p>
      </div>
    );
  }

  // Group by month
  const grouped = history.reduce((acc, item) => {
    if (!acc[item.month]) acc[item.month] = [];
    acc[item.month].push(item);
    return acc;
  }, {} as Record<string, AnalysisData[]>);

  return (
    <div className="space-y-6">
      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, items]) => (
          <div key={month} className="module-card">
            <div className="module-header">
              <h3 className="text-sm font-semibold">
                {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <span className="text-xs text-muted-foreground">{items.length} avaliação(ões)</span>
            </div>
            <div className="divide-y divide-border">
              {items.sort((a, b) => {
                const order = { dia10: 0, dia20: 1, mesCompleto: 2 };
                return order[a.evaluationType] - order[b.evaluationType];
              }).map((item) => {
                const totals = getTotals(item);
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary">
                          {EVALUATION_LABELS[item.evaluationType]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.dateConfig.startDate} — {item.dateConfig.endDate}
                        </span>
                      </div>
                      <div className="flex gap-6 mt-2 text-sm font-mono">
                        <span>Fat. Bruto: <strong>{formatCurrency(item.grossRevenue)}</strong></span>
                        <span>Realizado: <strong>{formatCurrency(totals.totalRealized)}</strong></span>
                        <span>Performance: <strong className={totals.performance >= 100 ? 'value-positive' : 'value-negative'}>
                          {formatPercent(totals.performance)}
                        </strong></span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{item.dateConfig.workingDaysUsed} dias úteis / {item.dateConfig.totalWorkingDays} total</span>
                        <span>{item.dateConfig.totalMonthDays} dias no mês</span>
                        <span>Salvo em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onLoad(item)}
                        className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        title="Carregar análise"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};

export default HistoryModule;
