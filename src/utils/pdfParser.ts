import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = '';

async function extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useSystemFonts: true }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          try {
            return ((item as TextItem).str || '').replace(/\r\n/g, '\n');
          } catch (lineErr) {
            console.error(`[pdfParser] Falha ao ler item de texto na página ${i}:`, lineErr);
            return '';
          }
        })
        .join(' ');
      fullText += pageText + '\n';
    } catch (pageErr) {
      console.error(`[pdfParser] Falha ao processar página ${i}, continuando:`, pageErr);
      fullText += '\n';
    }
  }

  return fullText.replace(/\r\n/g, '\n');
}

export async function parsePdfFile(file: File): Promise<any[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const text = await extractPDFText(arrayBuffer);
    const normalized = text.replace(/\r\n/g, '\n');
    return parseTijolaoPDFText(normalized);
  } catch (err) {
    console.error('[pdfParser] Erro ao extrair texto do PDF:', err);
    throw new Error('PDF_EXTRACTION_FAILED');
  }
}


export function parseTijolaoPDFText(pdfText: string): any[] {
  const lines = pdfText.split("\n");
  const items: any[] = [];
  let stackedGroups: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line.includes("PERÍODO") || line.includes("Total Geral")) continue;

    // 1. Captura nomes de grupos sequenciais que não têm os dados na mesma linha
    if (!line.includes("|") && (line.includes("(") || line.match(/[A-Z]{3,}/))) {
      stackedGroups.push(line);
      continue;
    }

    // 2. Processa a linha quando ela contém os delimitadores de colunas
    if (line.includes("|")) {
      const rawCols = line.split("|").map((c) => c.trim());

      // Caso existam grupos acumulados na fila (Ex: TIJOLOS e TELHAS DE FIBROCIMENTO)
      if (stackedGroups.length > 0) {
        stackedGroups.forEach((groupName, index) => {
          const extractValue = (colText: string) => {
            if (!colText) return 0;
            // Divide os valores internos que vêm empilhados por quebra de linha ou espaços grandes
            const parts = colText
              .split(/[\n\r]+|\s{2,}/)
              .map((p) => p.trim())
              .filter(Boolean);
            const target = parts[index] || parts[0] || "0";
            return (
              parseFloat(target.replace("R$", "").replace("RS", "").replace(/\./g, "").replace(",", ".").trim()) || 0
            );
          };

          const extractPercent = (colText: string) => {
            if (!colText) return 0;
            const parts = colText
              .split(/[\n\r]+|\s{2,}/)
              .map((p) => p.trim())
              .filter(Boolean);
            const target = parts[index] || parts[0] || "0";
            return parseFloat(target.replace("%", "").replace(",", ".").trim()) || 0;
          };

          items.push({
            name: groupName,
            cost: extractValue(rawCols[1]), // Total Custo
            grossRevenue: extractValue(rawCols[2]), // Total Receita Bruta
            netRevenue: extractValue(rawCols[5]), // Total Receita Liquida
            netProfit: extractValue(rawCols[6]), // Lucro Lqd $
            marginRealized: extractPercent(rawCols[7]), // %Margem Liquida
          });
        });

        stackedGroups = []; // Limpa a fila acumuladora
      } else {
        // Lógica padrão para linhas comuns onde o nome e os valores estão juntos
        const groupName = rawCols[0];
        const cleanVal = (val: string) =>
          parseFloat(val.replace("R$", "").replace("RS", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
        const cleanPct = (val: string) => parseFloat(val.replace("%", "").replace(",", ".").trim()) || 0;

        if (groupName && groupName !== "GRUPOS") {
          items.push({
            name: groupName,
            cost: cleanVal(rawCols[1]),
            grossRevenue: cleanVal(rawCols[2]),
            netRevenue: cleanVal(rawCols[5]),
            netProfit: cleanVal(rawCols[6]),
            marginRealized: cleanPct(rawCols[7]),
          });
        }
      }
    }
  }

  return items;
}
