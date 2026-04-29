export type EvaluationType = 'dia10' | 'dia20' | 'mesCompleto';

export interface DateConfig {
  startDate: string;
  endDate: string;
  workingDaysUsed: number;
  totalWorkingDays: number;
  totalMonthDays: number;
}

export interface ProductLineData {
  name: string;
  salesTarget: number; // META DE VENDAS
  salesRealized: number; // VENDAS REALIZADAS (from PDF - Total Receita Liquida)
  marginTarget: number; // MARGEM PREVISTA (editable)
  participationTarget: number; // PART. PREVISTA (editable)
  marginRealized: number; // MARGEM REALIZADA (from PDF - %Margem Liquida)
  participationRealized: number; // PART. REALIZADA (from PDF - % Participação)
  lucroLiquido?: number; // LUCRO LÍQUIDO R$ (from PDF - Lucro Lqd $)
}

export interface AnalysisData {
  id: string;
  evaluationType: EvaluationType;
  month: string; // e.g. "2026-02"
  dateConfig: DateConfig;
  grossRevenue: number; // FATURAMENTO BRUTO TOTAL (editable)
  productLines: ProductLineData[];
  createdAt: string;
}

export interface PdfExtractedData {
  productName: string;
  totalReceitaLiquida: number;
  lucroLiquido: number; // R$ Lucro Líquido (Lucro Lqd $)
  margemLiquida: number; // percentage
  participacao: number; // percentage
}

export const EVALUATION_LABELS: Record<EvaluationType, string> = {
  dia10: 'Avaliação Dia 10',
  dia20: 'Avaliação Dia 20',
  mesCompleto: 'Mês Completo',
};
