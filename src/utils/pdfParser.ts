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
  const pendingNames: string[] = []; // names found on rows without values (stacked layout)

  const productRegex = /([A-ZÁÉÍÓÚÃÕÇ\s\/]+?)\s*\(\d+\)/gi;

  const pushResult = (mappedName: string, currencyValues: number[], percentValues: number[]) => {
    if (results.find(r => r.productName === mappedName)) return;
    const totalReceitaLiquida = currencyValues.length >= 4 ? currencyValues[3] :
                                 currencyValues.length >= 3 ? currencyValues[2] : 0;
    const lucroLiquido = currencyValues.length >= 5 ? currencyValues[4] :
                         currencyValues.length >= 4 ? currencyValues[3] - (currencyValues[0] || 0) : 0;
    const margemLiquida = percentValues.length >= 2 ? percentValues[1] :
                          percentValues.length >= 1 ? percentValues[0] : 0;
    const participacao = percentValues.length >= 3 ? percentValues[2] :
                         percentValues.length >= 2 ? percentValues[percentValues.length - 1] : 0;
    if (totalReceitaLiquida > 0) {
      results.push({ productName: mappedName, totalReceitaLiquida, lucroLiquido, margemLiquida, participacao });
    }
  };

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.includes('TOTAL GERAL') || upper.includes('GRUPOS') || upper.includes('TOTAL CUSTO')) continue;

    // Collect ALL product names in this row (stacked headers can have multiple)
    const namesInLine: string[] = [];
    let m: RegExpExecArray | null;
    productRegex.lastIndex = 0;
    while ((m = productRegex.exec(line)) !== null) {
      const mapped = matchPdfNameToProductLine(m[1].trim());
      if (mapped) namesInLine.push(mapped);
    }

    const currencyMatches = line.match(/R\$\s*[\d.,]+/g) || [];
    const percentMatches = line.match(/[\d]+[.,][\d]+%/g) || [];
    const hasValues = currencyMatches.length >= 3;

    if (namesInLine.length > 0 && !hasValues) {
      // Stacked header rows — defer until values arrive
      pendingNames.push(...namesInLine);
      continue;
    }

    if (hasValues) {
      // How many product value-blocks fit in this row? Each block = ~5 currency values
      const valueGroups = Math.max(1, Math.floor(currencyMatches.length / 5));
      const currencyValues = currencyMatches.map(parseBrCurrency);
      const percentValues = percentMatches.map(parseBrPercent);

      // Build the ordered list of names to assign to value groups in this row
      const namesQueue: string[] = [];
      // First, drain pending names that belong above this values row
      while (pendingNames.length > 0 && namesQueue.length < valueGroups) {
        namesQueue.push(pendingNames.shift()!);
      }
      // Then any names embedded in this same line
      for (const n of namesInLine) {
        if (namesQueue.length < valueGroups) namesQueue.push(n);
        else pendingNames.push(n);
      }

      for (let i = 0; i < namesQueue.length; i++) {
        const slice = currencyValues.slice(i * 5, i * 5 + 5);
        const pSlice = percentValues.slice(i * 3, i * 3 + 3);
        pushResult(namesQueue[i], slice, pSlice);
      }
    }
  }

  return results;
}
