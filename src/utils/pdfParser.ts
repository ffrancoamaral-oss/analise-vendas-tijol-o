import type { PdfExtractedData } from '@/types/analysis';
import { matchPdfNameToProductLine } from '@/data/productLines';

/**
 * Parse Brazilian number format: R$ 238.066,97 → 238066.97
 */
function parseBrCurrency(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse Brazilian percentage format: 48,47% → 48.47
 */
function parseBrPercent(str: string): number {
  if (!str) return 0;
  const clean = str.replace('%', '').replace(',', '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
}

/**
 * Main PDF parser - extracts product line data from Rentabilidade PDF
 * 
 * PDF Column Order:
 * GRUPOS | Total Custo | Total Receita Bruta | Lucro Bruto $ | % Margem Bruta | Total Receita Liquida | Lucro Lqd $ | %Margem. Liquida | % Participação
 * 
 * We extract: Total Receita Liquida (R$ index 3), %Margem Liquida (% index 1), % Participação (% index 2)
 */
export async function parsePdfFile(file: File): Promise<PdfExtractedData[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const allItems: TextItem[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string; transform: number[] }>;
    
    for (const item of items) {
      if (item.str.trim()) {
        allItems.push({
          str: item.str.trim(),
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
        });
      }
    }
  }
  
  // Group items into rows by Y position (tolerance of 4px)
  const rows = groupIntoRows(allItems, 4);
  
  // Reconstruct each row as a single text line
  const textLines: string[] = [];
  const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a); // top to bottom
  
  for (const y of sortedYs) {
    const items = rows.get(y)!;
    items.sort((a, b) => a.x - b.x);
    // Join with spaces, preserving separation
    const line = items.map(i => i.str).join('  ');
    textLines.push(line);
  }
  
  return extractProductData(textLines);
}

function groupIntoRows(items: TextItem[], tolerance: number): Map<number, TextItem[]> {
  const rows = new Map<number, TextItem[]>();
  
  for (const item of items) {
    let matchedY: number | null = null;
    for (const key of rows.keys()) {
      if (Math.abs(key - item.y) <= tolerance) {
        matchedY = key;
        break;
      }
    }
    
    if (matchedY !== null) {
      rows.get(matchedY)!.push(item);
    } else {
      rows.set(item.y, [item]);
    }
  }
  
  return rows;
}

/**
 * Extract product data from reconstructed text lines.
 * 
 * Strategy: For each line, check if it contains a known product name.
 * Then extract all R$ values and % values from the line.
 * 
 * Column mapping (0-indexed):
 * R$ values: [0]=Total Custo, [1]=Total Receita Bruta, [2]=Lucro Bruto, [3]=Total Receita Liquida, [4]=Lucro Lqd
 * % values: [0]=% Margem Bruta, [1]=%Margem Liquida, [2]=% Participação
 */
function extractProductData(lines: string[]): PdfExtractedData[] {
  const results: PdfExtractedData[] = [];

  for (const line of lines) {
    // Skip header/total lines
    const upper = line.toUpperCase();
    if (upper.includes('TOTAL GERAL') || upper.includes('GRUPOS') || upper.includes('TOTAL CUSTO')) continue;

    // Capture the full name section before any R$ value (preserves possible stacked names)
    const nameSection = line.split(/R\$/)[0].trim();
    if (!nameSection || !nameSection.match(/[A-Z]/i)) continue;

    const rawNames = nameSection.includes('\n')
      ? nameSection.split('\n').map((n) => n.trim()).filter(Boolean)
      : [nameSection];

    // Extract all R$ amounts and percentages from the line
    const currencyMatches = line.match(/R\$\s*[\d.,]+/g) || [];
    const currencyValues = currencyMatches.map(parseBrCurrency);

    const percentMatches = line.match(/[\d]+[.,][\d]+%/g) || [];
    const percentValues = percentMatches.map(parseBrPercent);

    // When names are stacked on the same line, split the values evenly between them
    const groupCount = rawNames.length;
    const currencyGroupSize = Math.max(1, Math.ceil(currencyValues.length / groupCount));
    const percentGroupSize = Math.max(1, Math.ceil(percentValues.length / groupCount));

    for (let idx = 0; idx < rawNames.length; idx++) {
      const rawName = rawNames[idx];
      const mappedName = matchPdfNameToProductLine(rawName);
      if (!mappedName || results.find((r) => r.productName === mappedName)) continue;

      const cSlice = currencyValues.slice(idx * currencyGroupSize, (idx + 1) * currencyGroupSize);
      const pSlice = percentValues.slice(idx * percentGroupSize, (idx + 1) * percentGroupSize);

      // Column mapping (0-indexed):
      // R$ values: [0]=Total Custo, [1]=Total Receita Bruta, [2]=Lucro Bruto, [3]=Total Receita Liquida, [4]=Lucro Lqd
      // % values: [0]=% Margem Bruta, [1]=%Margem Liquida, [2]=% Participação
      const totalReceitaLiquida = cSlice.length >= 4 ? cSlice[3] :
                                   cSlice.length >= 3 ? cSlice[2] : 0;
      const lucroLiquido = cSlice.length >= 5 ? cSlice[4] :
                           cSlice.length >= 4 ? cSlice[3] - (cSlice[0] || 0) : 0;
      const margemLiquida = pSlice.length >= 2 ? pSlice[1] :
                            pSlice.length >= 1 ? pSlice[0] : 0;
      const participacao = pSlice.length >= 3 ? pSlice[2] :
                           pSlice.length >= 2 ? pSlice[pSlice.length - 1] : 0;

      if (totalReceitaLiquida > 0) {
        results.push({
          productName: mappedName,
          totalReceitaLiquida,
          lucroLiquido,
          margemLiquida,
          participacao,
        });
      }
    }
  }

  return results;
}
