// FUNÇÃO DE CORREÇÃO DO PARSER PARA O LOVABLE
export function parseTijolaoPDFText(pdfText: string): any[] {
  const lines = pdfText.split("\n");
  const processedProducts: any[] = [];

  // Array temporário para acumular grupos que vêm empilhados sem valores na linha
  let stackedGroupNames: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i].trim();

    // 1. Ignorar cabeçalhos e linhas vazias
    if (!currentLine || currentLine.includes("PERÍODO") || currentLine.includes("Total Geral")) {
      continue;
    }

    // 2. Identificar se é uma linha apenas com nome de grupo/produto (sem o caractere separador '|')
    if (!currentLine.includes("|") && (currentLine.includes("(") || currentLine.match(/[A-Z]/))) {
      stackedGroupNames.push(currentLine);
      continue;
    }

    // 3. Processar linhas que contêm os dados (caractere '|')
    if (currentLine.includes("|")) {
      const columns = currentLine.split("|").map((col) => col.trim());

      // Se tivermos grupos empilhados acumulados (ex: TIJOLOS e TELHAS DE FIBROCIMENTO)
      if (stackedGroupNames.length > 0) {
        // Mapeia cada grupo acumulado para o seu respectivo valor que vem quebrado por \n dentro da coluna
        stackedGroupNames.forEach((groupName, index) => {
          // Função auxiliar para extrair o valor correto baseado no índice da quebra de linha
          const getValByRowIndex = (colText: string) => {
            if (!colText) return 0;
            // Divide os valores empilhados pela quebra de linha ou espaços duplos gerados pelo PDF
            const subRows = colText
              .split(/[\n\r]+|\s{2,}/)
              .map((s) => s.trim())
              .filter(Boolean);
            const rawValue = subRows[index] || subRows[0] || "0";
            return parseFloat(rawValue.replace("R$", "").replace(".", "").replace(",", ".").trim()) || 0;
          };

          const pTarget = columns[4] ? columns[4].split(/[\n\r]+|\s{2,}/)[index] : "0%";

          processedProducts.push({
            name: groupName,
            cost: getValByRowIndex(columns[1]), // Total Custo
            grossRevenue: getValByRowIndex(columns[2]), // Total Receita Bruta
            netRevenue: getValByRowIndex(columns[5]), // Total Receita Liquida
            netProfit: getValByRowIndex(columns[6]), // Lucro Lqd $
            marginRealized: parseFloat(pTarget) || 0, // %Margem Liquida
          });
        });

        // Limpa o acumulador para as próximas linhas comuns
        stackedGroupNames = [];
      } else {
        // Lógica normal para linhas onde o produto e os valores estão na mesma linha
        const groupName = columns[0] || "Grupo Desconhecido";
        const cleanVal = (val: string) =>
          parseFloat(val.replace("R$", "").replace(".", "").replace(",", ".").trim()) || 0;

        processedProducts.push({
          name: groupName,
          cost: cleanVal(columns[1]),
          grossRevenue: cleanVal(columns[2]),
          netRevenue: cleanVal(columns[5]),
          netProfit: cleanVal(columns[6]),
          marginRealized: parseFloat(columns[7]) || 0,
        });
      }
    }
  }

  return processedProducts;
}
