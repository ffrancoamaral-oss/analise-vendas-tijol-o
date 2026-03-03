import type { PdfExtractedData } from '@/types/analysis';
import { matchPdfNameToProductLine } from '@/data/productLines';

function parseBrNumber(str: string): number {
  if (!str) return 0;
  // Remove R$, spaces, dots (thousands), replace comma with dot
  const clean = str.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function parsePercentage(str: string): number {
  if (!str) return 0;
  const clean = str.replace('%', '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export async function parsePdfFile(file: File): Promise<PdfExtractedData[]> {
  const pdfjsLib = await import('pdfjs-dist');
  
  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const allText: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string; transform: number[] }>;
    
    // Group by Y position to reconstruct rows
    const rows: Map<number, Array<{ x: number; text: string }>> = new Map();
    
    for (const item of items) {
      const y = Math.round(item.transform[5]); // Y position
      const x = item.transform[4]; // X position
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, text: item.str });
    }
    
    // Sort rows by Y (descending since PDF Y goes up)
    const sortedRows = Array.from(rows.entries())
      .sort(([a], [b]) => b - a)
      .map(([, cols]) => cols.sort((a, b) => a.x - b.x).map(c => c.text).join('\t'));
    
    allText.push(...sortedRows);
  }
  
  return extractDataFromLines(allText);
}

function extractDataFromLines(lines: string[]): PdfExtractedData[] {
  const results: PdfExtractedData[] = [];
  
  // Known product names from our system
  const knownProducts = [
    'PISOS', 'CIMENTO', 'ARGAMASSAS', 'TELHAS DE FIBROCIMENTO', 'AREIA E BRITA',
    'TIJOLOS', 'FERRAGENS', 'REJUNTES', 'FERRAGISTA', 'LOUCAS', 'ESQUADRIAS',
    'TINTAS', 'MATERIAL DE ACABAMENTO', 'TORNEIRAS E REGISTROS', 'CUBAS',
    'GABINETES ARMARIOS', 'IMPERMEABILIZANTES', 'TELHAS DE BARRO', 'PIAS E TANQUES',
    'TUBOS', 'HIDRAULICA', 'ASSENTOS SANITARIOS', 'DUCHA E CHUVEIROS',
    'CHURRASQUEIRAS', 'ACESSORIOS DE BANHEIROS', 'PU/SILICONES/MASSA PLASTICA',
    'ARAMES', 'CAIXA AGUA', 'PARAFUSOS', 'REFRATARIOS', 'ELETRIC TOMADAS E INTERRUPT',
    'FIO/CABO', 'ACESSORIOS PARA PINTURA', 'MANGUEIRAS', 'PREGOS', 'LAMPADAS',
    'LUMINARIAS', 'PRODUTOS USO', 'CADEADO', 'FECHADURAS', 'TELHAS ACRILICAS'
  ];
  
  for (const line of lines) {
    const upperLine = line.toUpperCase();
    
    // Check if this line contains a product name
    for (const product of knownProducts) {
      if (upperLine.includes(product)) {
        // Try to extract numbers from this line
        // Look for patterns: R$ amounts and percentages
        const amounts = line.match(/R\$\s*[\d.,]+/g) || [];
        const percentages = line.match(/[\d.,]+%/g) || [];
        
        if (amounts.length >= 4 && percentages.length >= 3) {
          // Expected order: Total Custo, Total Receita Bruta, Lucro Bruto, ... Total Receita Liquida, Lucro Lqd, %Margem Liquida, % Participação
          const totalReceitaLiquida = parseBrNumber(amounts[4] || amounts[3] || '0');
          const margemLiquida = parsePercentage(percentages[percentages.length - 2] || '0');
          const participacao = parsePercentage(percentages[percentages.length - 1] || '0');
          
          // Extract clean product name
          const productNameMatch = line.match(/([A-ZÁÉÍÓÚÃÕÇ\/\s]+?)(?:\s*\(\d+\))?(?:\s+R\$)/i);
          const rawName = productNameMatch ? productNameMatch[1].trim() : product;
          const mappedName = matchPdfNameToProductLine(rawName);
          
          if (mappedName && !results.find(r => r.productName === mappedName)) {
            results.push({
              productName: mappedName,
              totalReceitaLiquida,
              margemLiquida,
              participacao,
            });
          }
        }
        break;
      }
    }
  }
  
  return results;
}

// Fallback: manual parsing from text content
export function parseManualPdfData(textContent: string): PdfExtractedData[] {
  const lines = textContent.split('\n');
  return extractDataFromLines(lines);
}
