export interface ProductLineDefault {
  name: string;
  marginTarget: number; // MARGEM PREVISTA %
  participationTarget: number; // PART. PREVISTA %
}

export const DEFAULT_PRODUCT_LINES: ProductLineDefault[] = [
  { name: 'PISOS', marginTarget: 52.00, participationTarget: 38.50 },
  { name: 'CIMENTO', marginTarget: 22.50, participationTarget: 20.50 },
  { name: 'ARGAMASSAS', marginTarget: 49.00, participationTarget: 12.00 },
  { name: 'TELHAS DE FIBROCIMENTO', marginTarget: 36.00, participationTarget: 4.00 },
  { name: 'AREIA E BRITA', marginTarget: 43.00, participationTarget: 3.20 },
  { name: 'TIJOLOS', marginTarget: 26.00, participationTarget: 2.50 },
  { name: 'FERRAGENS', marginTarget: 36.50, participationTarget: 2.40 },
  { name: 'REJUNTES', marginTarget: 65.00, participationTarget: 2.50 },
  { name: 'FERRAGISTA', marginTarget: 49.00, participationTarget: 2.11 },
  { name: 'LOUCAS', marginTarget: 48.00, participationTarget: 2.00 },
  { name: 'ESQUADRIAS', marginTarget: 40.00, participationTarget: 1.50 },
  { name: 'TINTAS', marginTarget: 40.00, participationTarget: 1.00 },
  { name: 'MATERIAL DE ACABAMENTO', marginTarget: 55.00, participationTarget: 0.93 },
  { name: 'TORNEIRAS E REGISTROS', marginTarget: 51.00, participationTarget: 0.81 },
  { name: 'CUBAS', marginTarget: 49.00, participationTarget: 0.80 },
  { name: 'GABINETES ARMARIOS', marginTarget: 47.00, participationTarget: 0.62 },
  { name: 'IMPERMEABILIZANTES', marginTarget: 58.00, participationTarget: 0.60 },
  { name: 'TELHAS DE BARRO', marginTarget: 40.00, participationTarget: 0.60 },
  { name: 'PIAS E TANQUES', marginTarget: 48.00, participationTarget: 0.52 },
  { name: 'TUBOS', marginTarget: 47.00, participationTarget: 0.51 },
  { name: 'HIDRAULICA', marginTarget: 55.00, participationTarget: 0.43 },
  { name: 'ASSENTOS SANITARIOS', marginTarget: 52.00, participationTarget: 0.33 },
  { name: 'DUCHA E CHUVEIROS', marginTarget: 47.00, participationTarget: 0.31 },
  { name: 'CHURRASQUEIRAS', marginTarget: 45.00, participationTarget: 0.23 },
  { name: 'ACESSORIOS DE BANHEIROS', marginTarget: 46.00, participationTarget: 0.18 },
  { name: 'PU/SILICONES/MASSA PLASTICA', marginTarget: 64.00, participationTarget: 0.13 },
  { name: 'ARAMES', marginTarget: 60.00, participationTarget: 0.13 },
  { name: 'CAIXA AGUA', marginTarget: 36.00, participationTarget: 0.11 },
  { name: 'PARAFUSOS', marginTarget: 65.00, participationTarget: 0.10 },
  { name: 'REFRATARIOS', marginTarget: 55.00, participationTarget: 0.09 },
  { name: 'ELETRIC TOMADAS E INTERRUPT', marginTarget: 47.00, participationTarget: 0.09 },
  { name: 'FIO/CABO ELÉTRICO', marginTarget: 45.00, participationTarget: 0.09 },
  { name: 'ACESSORIOS PARA PINTURA', marginTarget: 55.00, participationTarget: 0.06 },
  { name: 'MANGUEIRAS JARDIM/MANGUEIRAS CORRUG', marginTarget: 56.00, participationTarget: 0.05 },
  { name: 'PREGOS', marginTarget: 21.00, participationTarget: 0.04 },
  { name: 'LAMPADAS', marginTarget: 62.00, participationTarget: 0.03 },
  { name: 'LUMINARIAS/PENDENTES', marginTarget: 0.00, participationTarget: 0.00 },
  { name: 'TELHAS ACRILICAS', marginTarget: 0.00, participationTarget: 0.00 },
  { name: 'PRODUTOS USO E CONSUMO', marginTarget: 0.00, participationTarget: 0.00 },
  { name: 'CADEADO', marginTarget: 0.00, participationTarget: 0.00 },
  { name: 'FECHADURAS', marginTarget: 0.00, participationTarget: 0.00 },
];

// Map from PDF names (which have codes) to our product line names
const PDF_NAME_MAP: Record<string, string> = {
  'PISOS': 'PISOS',
  'CIMENTO': 'CIMENTO',
  'ARGAMASSAS': 'ARGAMASSAS',
  'TELHAS DE FIBROCIMENTO': 'TELHAS DE FIBROCIMENTO',
  'AREIA E BRITA': 'AREIA E BRITA',
  'TIJOLOS': 'TIJOLOS',
  'FERRAGENS': 'FERRAGENS',
  'REJUNTES': 'REJUNTES',
  'FERRAGISTA': 'FERRAGISTA',
  'LOUCAS': 'LOUCAS',
  'ESQUADRIAS': 'ESQUADRIAS',
  'TINTAS': 'TINTAS',
  'MATERIAL DE ACABAMENTO': 'MATERIAL DE ACABAMENTO',
  'TORNEIRAS E REGISTROS': 'TORNEIRAS E REGISTROS',
  'CUBAS': 'CUBAS',
  'GABINETES ARMARIOS': 'GABINETES ARMARIOS',
  'IMPERMEABILIZANTES': 'IMPERMEABILIZANTES',
  'TELHAS DE BARRO': 'TELHAS DE BARRO',
  'PIAS E TANQUES': 'PIAS E TANQUES',
  'TUBOS': 'TUBOS',
  'HIDRAULICA': 'HIDRAULICA',
  'ASSENTOS SANITARIOS': 'ASSENTOS SANITARIOS',
  'DUCHA E CHUVEIROS': 'DUCHA E CHUVEIROS',
  'CHURRASQUEIRAS': 'CHURRASQUEIRAS',
  'ACESSORIOS DE BANHEIROS': 'ACESSORIOS DE BANHEIROS',
  'PU/SILICONES/MASSA PLASTICA': 'PU/SILICONES/MASSA PLASTICA',
  'ARAMES': 'ARAMES',
  'CAIXA AGUA': 'CAIXA AGUA',
  'PARAFUSOS': 'PARAFUSOS',
  'REFRATARIOS': 'REFRATARIOS',
  'ELETRIC TOMADAS E INTERRUPT': 'ELETRIC TOMADAS E INTERRUPT',
  'FIO/CABO ELÉTRICO': 'FIO/CABO ELÉTRICO',
  'ACESSORIOS PARA PINTURA': 'ACESSORIOS PARA PINTURA',
  'MANGUEIRAS JARDIM/MANGUEIRAS CORRUG': 'MANGUEIRAS JARDIM/MANGUEIRAS CORRUG',
  'PREGOS': 'PREGOS',
  'LAMPADAS': 'LAMPADAS',
  'LUMINARIAS/PENDENTES': 'LUMINARIAS/PENDENTES',
  'PRODUTOS USO E CONSUMO': 'PRODUTOS USO E CONSUMO',
  'CADEADO': 'CADEADO',
  'FECHADURAS': 'FECHADURAS',
  'TELHAS ACRILICAS': 'TELHAS ACRILICAS',
  'FIO/CABO ELETRICO': 'FIO/CABO ELÉTRICO',
};

export function matchPdfNameToProductLine(pdfName: string): string | null {
  // Remove code in parentheses like "(0006)" and normalize
  const cleanName = pdfName.replace(/\s*\(\d+\)\s*$/, '').trim().toUpperCase();

  // Strict exact match only — prevents string collisions
  // (e.g. "TELHAS ACRILICAS" must NOT match "TELHAS DE FIBROCIMENTO")
  if (Object.prototype.hasOwnProperty.call(PDF_NAME_MAP, cleanName)) {
    return PDF_NAME_MAP[cleanName];
  }

  return null;
}
