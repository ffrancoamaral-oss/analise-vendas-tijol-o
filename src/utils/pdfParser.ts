import type { PdfExtractedData } from '@/types/analysis';
import { matchPdfNameToProductLine } from '@/data/productLines';

function parseBrNumber(str: string): number {
  if (!str) return 0;
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

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

export async function parsePdfFile(file: File): Promise<PdfExtractedData[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const allItems: TextItem[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string; transform: number[]; width: number }>;
    
    for (const item of items) {
      if (item.str.trim()) {
        allItems.push({
          str: item.str.trim(),
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
          width: item.width || 0,
        });
      }
    }
  }
  
  // Group by Y position (rows) with tolerance
  const rows = groupByY(allItems, 3);
  
  // Find header row to identify column positions
  const headerInfo = findColumnPositions(rows);
  
  if (headerInfo) {
    return extractWithColumns(rows, headerInfo);
  }
  
  // Fallback: try line-by-line extraction
  return extractFallback(rows);
}

interface ColumnPositions {
  receitaLiquidaX: number;
  margemLiquidaX: number;
  participacaoX: number;
  headerY: number;
}

function groupByY(items: TextItem[], tolerance: number): Map<number, TextItem[]> {
  const rows = new Map<number, TextItem[]>();
  const sortedItems = [...items].sort((a, b) => b.y - a.y);
  
  for (const item of sortedItems) {
    let foundKey: number | null = null;
    for (const key of rows.keys()) {
      if (Math.abs(key - item.y) <= tolerance) {
        foundKey = key;
        break;
      }
    }
    
    if (foundKey !== null) {
      rows.get(foundKey)!.push(item);
    } else {
      rows.set(item.y, [item]);
    }
  }
  
  // Sort each row by X
  for (const [, items] of rows) {
    items.sort((a, b) => a.x - b.x);
  }
  
  return rows;
}

function findColumnPositions(rows: Map<number, TextItem[]>): ColumnPositions | null {
  for (const [y, items] of rows) {
    const fullText = items.map(i => i.str).join(' ');
    
    if (fullText.includes('Receita Liquida') || fullText.includes('Receita Líquida')) {
      // Find the X positions of our target columns
      let receitaLiquidaX = 0;
      let margemLiquidaX = 0;
      let participacaoX = 0;
      
      for (const item of items) {
        const lower = item.str.toLowerCase();
        if (lower.includes('receita') && lower.includes('liquid')) {
          // This could be "Total Receita Liquida" - we need the second one if there are two
          if (receitaLiquidaX === 0) {
            receitaLiquidaX = item.x;
          }
        }
        if (lower.includes('margem') && lower.includes('liquid')) {
          margemLiquidaX = item.x;
        }
        if (lower.includes('participa')) {
          participacaoX = item.x;
        }
      }
      
      // Check if we also see "Total Receita Liquida" as separate words
      for (let i = 0; i < items.length; i++) {
        if (items[i].str.toLowerCase() === 'total' && items[i + 1]?.str.toLowerCase().includes('receita')) {
          // Check if this is the second "Total Receita Liquida" column
          const combinedX = items[i].x;
          if (combinedX > receitaLiquidaX) {
            receitaLiquidaX = combinedX;
          }
        }
      }
      
      if (receitaLiquidaX > 0 || margemLiquidaX > 0 || participacaoX > 0) {
        return { receitaLiquidaX, margemLiquidaX, participacaoX, headerY: y };
      }
    }
  }
  return null;
}

function extractWithColumns(rows: Map<number, TextItem[]>, cols: ColumnPositions): PdfExtractedData[] {
  const results: PdfExtractedData[] = [];
  const tolerance = 60; // X tolerance for column matching
  
  const sortedRows = Array.from(rows.entries()).sort(([a], [b]) => b - a);
  
  let pastHeader = false;
  
  for (const [y, items] of sortedRows) {
    if (y >= cols.headerY) {
      pastHeader = true;
      continue;
    }
    if (!pastHeader) continue;
    
    const fullText = items.map(i => i.str).join(' ');
    if (fullText.includes('Total Geral') || fullText.includes('total geral')) break;
    
    // First item(s) should be the product name
    const nameItems = items.filter(i => !i.str.match(/^[R$\d%.,\s-]+$/) && !i.str.match(/^\d/));
    if (nameItems.length === 0) continue;
    
    const rawName = nameItems.map(i => i.str).join(' ').replace(/\s*\(\d+\)\s*$/, '').trim();
    const mappedName = matchPdfNameToProductLine(rawName);
    if (!mappedName) continue;
    if (results.find(r => r.productName === mappedName)) continue;
    
    // Find values by proximity to column headers
    const allValues = items.filter(i => i.str.match(/[R$\d%.,]/));
    
    // Extract R$ values and percentages
    const rValues: { x: number; value: number }[] = [];
    const pctValues: { x: number; value: number }[] = [];
    
    for (const item of allValues) {
      if (item.str.includes('R$') || (item.str.match(/^[\d.,]+$/) && !item.str.includes('%'))) {
        rValues.push({ x: item.x, value: parseBrNumber(item.str) });
      }
      if (item.str.includes('%')) {
        pctValues.push({ x: item.x, value: parsePercentage(item.str) });
      }
    }
    
    // Total Receita Liquida is usually the 5th R$ value (index 4)
    // %Margem Liquida is usually the 3rd percentage (index 2) 
    // % Participação is the last percentage
    
    const totalReceitaLiquida = rValues.length >= 5 ? rValues[4].value : 
                                rValues.length >= 4 ? rValues[3].value : 0;
    const margemLiquida = pctValues.length >= 3 ? pctValues[2].value :
                          pctValues.length >= 2 ? pctValues[1].value : 0;
    const participacao = pctValues.length >= 4 ? pctValues[3].value :
                         pctValues.length >= 3 ? pctValues[pctValues.length - 1].value : 0;
    
    if (totalReceitaLiquida > 0 || margemLiquida > 0) {
      results.push({
        productName: mappedName,
        totalReceitaLiquida,
        margemLiquida,
        participacao,
      });
    }
  }
  
  return results;
}

function extractFallback(rows: Map<number, TextItem[]>): PdfExtractedData[] {
  const results: PdfExtractedData[] = [];
  
  for (const [, items] of rows) {
    const fullText = items.map(i => i.str).join(' ');
    const rawName = fullText.replace(/\s*\(\d+\)\s*/, ' ').trim();
    const mappedName = matchPdfNameToProductLine(rawName);
    
    if (!mappedName || results.find(r => r.productName === mappedName)) continue;
    
    const amounts = fullText.match(/R\$\s*[\d.,]+/g) || [];
    const percentages = fullText.match(/[\d.,]+%/g) || [];
    
    if (amounts.length >= 4 && percentages.length >= 2) {
      results.push({
        productName: mappedName,
        totalReceitaLiquida: parseBrNumber(amounts[4] || amounts[3] || '0'),
        margemLiquida: parsePercentage(percentages[percentages.length - 2] || '0'),
        participacao: parsePercentage(percentages[percentages.length - 1] || '0'),
      });
    }
  }
  
  return results;
}

// Manual data entry - parse from a text table format
export function parseManualData(text: string): PdfExtractedData[] {
  const results: PdfExtractedData[] = [];
  const lines = text.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const parts = line.split(/[;\t|]/).map(p => p.trim());
    if (parts.length >= 4) {
      const name = matchPdfNameToProductLine(parts[0]);
      if (name) {
        results.push({
          productName: name,
          totalReceitaLiquida: parseBrNumber(parts[1]),
          margemLiquida: parsePercentage(parts[2]),
          participacao: parsePercentage(parts[3]),
        });
      }
    }
  }
  
  return results;
}
