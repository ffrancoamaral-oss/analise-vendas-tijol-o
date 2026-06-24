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
        const name = rawCols[0];
        if (!name || name === 'GRUPOS') continue;

        items.push({
          name,
          cost: cleanVal(rawCols[1]),
          grossRevenue: cleanVal(rawCols[2]),
          netRevenue: cleanVal(rawCols[5]),
          netProfit: cleanVal(rawCols[6]),
          marginRealized: cleanPct(rawCols[7]),
        });
      }
    }
  }

  // Correção cirúrgica: se um item tiver "TIJOLOS (0568)" e "TELHAS DE FIBROCIMENTO (0055)"
  // fundidos na descrição, dividir os valores (1º = Tijolos, 2º = Telhas).
  const splitNumbers = (raw: any): number[] => {
    if (typeof raw === 'number') return [raw];
    const matches = String(raw ?? '')
      .match(/-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?/g);
    if (!matches) return [];
    return matches.map((m) => cleanVal(m));
  };

  const result: any[] = [];
  for (const item of items) {
    const hasTijolos = /TIJOLOS\s*\(?0?568\)?/i.test(item.name);
    const hasTelhas = /TELHAS\s+DE\s+FIBROCIMENTO\s*\(?0?055\)?/i.test(item.name);

    if (hasTijolos && hasTelhas) {
      const pick = (n: number[], idx: number) => n[idx] ?? n[0] ?? 0;
      const cost = splitNumbers(item.cost);
      const gross = splitNumbers(item.grossRevenue);
      const net = splitNumbers(item.netRevenue);
      const profit = splitNumbers(item.netProfit);
      const margin = splitNumbers(item.marginRealized);

      result.push({
        name: 'TIJOLOS (0568)',
        cost: pick(cost, 0),
        grossRevenue: pick(gross, 0),
        netRevenue: pick(net, 0),
        netProfit: pick(profit, 0),
        marginRealized: pick(margin, 0),
      });
      result.push({
        name: 'TELHAS DE FIBROCIMENTO (0055)',
        cost: pick(cost, 1),
        grossRevenue: pick(gross, 1),
        netRevenue: pick(net, 1),
        netProfit: pick(profit, 1),
        marginRealized: pick(margin, 1),
      });
    } else {
      result.push(item);
    }
  }

  return result;
}
