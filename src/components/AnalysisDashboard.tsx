import React, { useState, useCallback, useEffect } from 'react';
import { BarChart3, PieChart, History, Save, Calendar } from 'lucide-react';
import type { AnalysisData, EvaluationType, PdfExtractedData, DateConfig } from '@/types/analysis';
import { EVALUATION_LABELS } from '@/types/analysis';
import { DEFAULT_PRODUCT_LINES } from '@/data/productLines';
import { calculateSalesTarget } from '@/utils/calculations';
import PdfUploader from './PdfUploader';
import SalesAnalysis from './SalesAnalysis';
import MarginAnalysis from './MarginAnalysis';
import HistoryModule from './HistoryModule';
import { toast } from 'sonner';

type TabType = 'sales' | 'margins' | 'history';

const STORAGE_KEY = 'tijolao_analysis_history';

function loadHistory(): AnalysisData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(history: AnalysisData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function createDefaultAnalysis(grossRevenue: number = 1250000): AnalysisData {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  return {
    id: crypto.randomUUID(),
    evaluationType: 'dia10',
    month,
    dateConfig: {
      startDate: '',
      endDate: '',
      workingDaysUsed: 0,
      totalWorkingDays: 23,
      totalMonthDays: 28,
    },
    grossRevenue,
    productLines: DEFAULT_PRODUCT_LINES.map((pl) => ({
      name: pl.name,
      salesTarget: calculateSalesTarget(grossRevenue, pl.participationTarget),
      salesRealized: 0,
      marginTarget: pl.marginTarget,
      participationTarget: pl.participationTarget,
      marginRealized: 0,
      participationRealized: 0,
    })),
    createdAt: new Date().toISOString(),
  };
}

const AnalysisDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [data, setData] = useState<AnalysisData>(() => createDefaultAnalysis());
  const [history, setHistory] = useState<AnalysisData[]>(() => loadHistory());

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const handleEvalTypeChange = useCallback((type: EvaluationType) => {
    setData((prev) => ({ ...prev, evaluationType: type }));
  }, []);

  const handleDateConfigChange = useCallback((key: keyof DateConfig, value: string | number) => {
    setData((prev) => ({
      ...prev,
      dateConfig: { ...prev.dateConfig, [key]: value },
    }));
  }, []);

  const handleMonthChange = useCallback((month: string) => {
    setData((prev) => ({ ...prev, month }));
  }, []);

  const handleGrossRevenueChange = useCallback((value: number) => {
    setData((prev) => ({
      ...prev,
      grossRevenue: value,
      productLines: prev.productLines.map((pl) => ({
        ...pl,
        salesTarget: calculateSalesTarget(value, pl.participationTarget),
      })),
    }));
  }, []);

  const handlePdfData = useCallback((pdfData: PdfExtractedData[]) => {
    setData((prev) => {
      const newLines = prev.productLines.map((pl) => {
        const pdfLine = pdfData.find((p) => p.productName === pl.name);
        if (pdfLine) {
          return {
            ...pl,
            salesRealized: pdfLine.totalReceitaLiquida,
            marginRealized: pdfLine.margemLiquida,
            participationRealized: pdfLine.participacao,
          };
        }
        return pl;
      });
      return { ...prev, productLines: newLines };
    });
    toast.success(`${pdfData.length} linhas de produto atualizadas do PDF`);
  }, []);

  const handleMarginTargetChange = useCallback((index: number, value: number) => {
    setData((prev) => {
      const newLines = [...prev.productLines];
      newLines[index] = { ...newLines[index], marginTarget: value };
      return { ...prev, productLines: newLines };
    });
  }, []);

  const handleParticipationTargetChange = useCallback((index: number, value: number) => {
    setData((prev) => {
      const newLines = [...prev.productLines];
      newLines[index] = {
        ...newLines[index],
        participationTarget: value,
        salesTarget: calculateSalesTarget(prev.grossRevenue, value),
      };
      return { ...prev, productLines: newLines };
    });
  }, []);

  const handleSave = useCallback(() => {
    const toSave = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setHistory((prev) => [toSave, ...prev]);
    toast.success('Análise salva no histórico!');
  }, [data]);

  const handleDeleteHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    toast.success('Análise removida do histórico.');
  }, []);

  const handleLoadHistory = useCallback((analysis: AnalysisData) => {
    setData(analysis);
    setActiveTab('sales');
    toast.success('Análise carregada.');
  }, []);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'sales', label: 'Análise de Vendas', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'margins', label: 'Análise de Margens', icon: <PieChart className="h-4 w-4" /> },
    { id: 'history', label: 'Histórico', icon: <History className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">TIJOLÃO</h1>
            <p className="text-xs text-muted-foreground">Análise de Vendas e Margens por Linha de Produto</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            Salvar Análise
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        {/* Config Row */}
        <div className="module-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            {/* Evaluation Type */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Tipo de Avaliação</label>
              <select
                className="editable-cell w-full py-2 text-sm font-medium"
                value={data.evaluationType}
                onChange={(e) => handleEvalTypeChange(e.target.value as EvaluationType)}
              >
                {Object.entries(EVALUATION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            {/* Month */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Mês de Análise</label>
              <input
                type="month"
                className="editable-cell w-full py-2 text-sm"
                value={data.month}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
            </div>
            {/* Start Date */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Data Inicial</label>
              <input
                type="date"
                className="editable-cell w-full py-2 text-sm"
                value={data.dateConfig.startDate}
                onChange={(e) => handleDateConfigChange('startDate', e.target.value)}
              />
            </div>
            {/* End Date */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Data Final</label>
              <input
                type="date"
                className="editable-cell w-full py-2 text-sm"
                value={data.dateConfig.endDate}
                onChange={(e) => handleDateConfigChange('endDate', e.target.value)}
              />
            </div>
            {/* Working Days */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Dias Úteis</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="editable-cell w-full py-2 text-sm text-center"
                  value={data.dateConfig.workingDaysUsed}
                  onChange={(e) => handleDateConfigChange('workingDaysUsed', parseInt(e.target.value) || 0)}
                  placeholder="Usados"
                />
                <input
                  type="number"
                  className="editable-cell w-full py-2 text-sm text-center"
                  value={data.dateConfig.totalWorkingDays}
                  onChange={(e) => handleDateConfigChange('totalWorkingDays', parseInt(e.target.value) || 0)}
                  placeholder="Total"
                />
              </div>
            </div>
            {/* Month Days */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Dias do Mês</label>
              <input
                type="number"
                className="editable-cell w-full py-2 text-sm text-center"
                value={data.dateConfig.totalMonthDays}
                onChange={(e) => handleDateConfigChange('totalMonthDays', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* PDF Upload */}
        <PdfUploader onDataExtracted={handlePdfData} />

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'sales' && (
          <SalesAnalysis data={data} onGrossRevenueChange={handleGrossRevenueChange} />
        )}
        {activeTab === 'margins' && (
          <MarginAnalysis
            data={data}
            onMarginTargetChange={handleMarginTargetChange}
            onParticipationTargetChange={handleParticipationTargetChange}
          />
        )}
        {activeTab === 'history' && (
          <HistoryModule
            history={history}
            onDelete={handleDeleteHistory}
            onLoad={handleLoadHistory}
          />
        )}
      </div>
    </div>
  );
};

export default AnalysisDashboard;
