import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function extractPDFText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => {
          try {
            return (item.str || '').replace(/\r\n/g, '\n') + (item.hasEOL ? '\n' : '');
          } catch {
            return '';
          }
        })
        .join(' ');
      fullText += pageText + '\n';
    } catch (pageErr) {
      console.warn(`[pdfParser] Falha ao ler página ${i}, pulando:`, pageErr);
      fullText += '\n';
    }
  }

  return fullText.replace(/\r\n/g, '\n');
}

export async function parsePdfFile(file: File): Promise<any[]> {
  try {
    const text = await extractPDFText(file);
    return parseTijolaoPDFText(text);
  } catch (err) {
    console.error('[pdfParser] Erro ao extrair texto do PDF:', err);
    throw new Error('PDF_EXTRACTION_FAILED');
  }
}

export function parseTijolaoPDFText(pdfText: string): any[] {
  const lines = pdfText.split('\n');
  const items: any[] = [];
  let stackedGroups: string[] = [];

  const cleanVal = (val: string) =>
    parseFloat(
      (val || '')
        .replace('R$', '')
        .replace('RS', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim()
    ) || 0;
  const cleanPct = (val: string) =>
    parseFloat((val || '').replace('%', '').replace(',', '.').trim()) || 0;

  // Interceptador cirúrgico: separa um item cujo nome/colunas vêm fundidos por \n
  const pushSplitOrSingle = (name: string, cols: string[]) => {
    const namePieces = name.split('\n').map((s) => s.trim()).filter(Boolean);

    const hasTijolos = namePieces.some((n) => /TIJOLOS/i.test(n));
    const hasTelhas = namePieces.some((n) => /TELHAS\s+DE\s+FIBROCIMENTO/i.test(n));

    if (namePieces.length > 1 && hasTijolos && hasTelhas) {
      // Divide cada coluna pelo \n também
      const splitCols = cols.map((c) => (c || '').split('\n').map((s) => s.trim()));

      namePieces.forEach((groupName, idx) => {
        const pick = (colIdx: number) => splitCols[colIdx]?.[idx] ?? splitCols[colIdx]?.[0] ?? '';
        items.push({
          name: groupName,
          cost: cleanVal(pick(1)),
          grossRevenue: cleanVal(pick(2)),
          netRevenue: cleanVal(pick(5)),
          netProfit: cleanVal(pick(6)),
          marginRealized: cleanPct(pick(7)),
        });
      });
      return;
    }

    const flatName = namePieces.join(' ').trim() || name.trim();
    if (!flatName || flatName === 'GRUPOS') return;

    items.push({
      name: flatName,
      cost: cleanVal(cols[1]),
      grossRevenue: cleanVal(cols[2]),
      netRevenue: cleanVal(cols[5]),
      netProfit: cleanVal(cols[6]),
      marginRealized: cleanPct(cols[7]),
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line.includes('PERÍODO') || line.includes('Total Geral')) continue;

    // 1. Nomes de grupos sequenciais sem dados na mesma linha
    if (!line.includes('|') && (line.includes('(') || line.match(/[A-Z]{3,}/))) {
      stackedGroups.push(line);
      continue;
    }

    // 2. Linha com delimitadores de colunas
    if (line.includes('|')) {
      const rawCols = line.split('|').map((c) => c.trim());

      if (stackedGroups.length > 0) {
        stackedGroups.forEach((groupName, index) => {
          const extractValue = (colText: string) => {
            if (!colText) return 0;
            const parts = colText
              .split(/[\n\r]+|\s{2,}/)
              .map((p) => p.trim())
              .filter(Boolean);
            const target = parts[index] || parts[0] || '0';
            return cleanVal(target);
          };
          const extractPercent = (colText: string) => {
            if (!colText) return 0;
            const parts = colText
              .split(/[\n\r]+|\s{2,}/)
              .map((p) => p.trim())
              .filter(Boolean);
            const target = parts[index] || parts[0] || '0';
            return cleanPct(target);
          };

          items.push({
            name: groupName,
            cost: extractValue(rawCols[1]),
            grossRevenue: extractValue(rawCols[2]),
            netRevenue: extractValue(rawCols[5]),
            netProfit: extractValue(rawCols[6]),
            marginRealized: extractPercent(rawCols[7]),
          });
        });
        stackedGroups = [];
      } else {
        pushSplitOrSingle(rawCols[0], rawCols);
      }
    }
  }

  return items;
}
