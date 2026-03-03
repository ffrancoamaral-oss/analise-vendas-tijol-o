import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Edit3 } from 'lucide-react';
import { parsePdfFile, parseManualData } from '@/utils/pdfParser';
import type { PdfExtractedData } from '@/types/analysis';

interface PdfUploaderProps {
  onDataExtracted: (data: PdfExtractedData[]) => void;
}

const PdfUploader: React.FC<PdfUploaderProps> = ({ onDataExtracted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState('');
  const [extractedCount, setExtractedCount] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setStatus('error');
      setErrorMsg('Apenas arquivos PDF são aceitos.');
      return;
    }
    setFileName(file.name);
    setStatus('loading');
    try {
      const data = await parsePdfFile(file);
      if (data.length === 0) {
        setStatus('error');
        setErrorMsg('Nenhum dado encontrado. Tente a entrada manual clicando no ícone abaixo.');
        return;
      }
      setExtractedCount(data.length);
      setStatus('success');
      onDataExtracted(data);
    } catch (err) {
      console.error('PDF parse error:', err);
      setStatus('error');
      setErrorMsg('Erro ao processar o PDF. Tente a entrada manual.');
    }
  }, [onDataExtracted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleManualSubmit = useCallback(() => {
    const data = parseManualData(manualText);
    if (data.length > 0) {
      setExtractedCount(data.length);
      setStatus('success');
      onDataExtracted(data);
      setShowManual(false);
    } else {
      setErrorMsg('Formato inválido. Use: NOME;RECEITA_LIQUIDA;MARGEM%;PARTICIPACAO%');
    }
  }, [manualText, onDataExtracted]);

  return (
    <div className="space-y-3">
      <div
        className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
          isDragging ? 'border-primary bg-accent'
          : status === 'success' ? 'border-success bg-success/5'
          : status === 'error' ? 'border-destructive bg-destructive/5'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('pdf-input')?.click()}
      >
        <input id="pdf-input" type="file" accept=".pdf" className="hidden" onChange={handleInputChange} />
        
        {status === 'loading' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Processando {fileName}...</p>
          </div>
        ) : status === 'success' ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm font-medium">{extractedCount} linhas de produto carregadas!</p>
            <p className="text-xs text-muted-foreground">{fileName || 'Entrada manual'} — Clique para carregar outro</p>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">{errorMsg}</p>
            <p className="text-xs text-muted-foreground">Clique para tentar novamente</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Arraste o PDF de Rentabilidade aqui</p>
            <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>Relatório de Rentabilidade por Grupo de Produtos</span>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Toggle */}
      <div className="flex justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); setShowManual(!showManual); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit3 className="h-3 w-3" />
          {showManual ? 'Ocultar entrada manual' : 'Entrada manual de dados'}
        </button>
      </div>

      {showManual && (
        <div className="module-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Cole os dados no formato: <code className="bg-muted px-1 rounded">NOME;RECEITA_LIQUIDA;MARGEM%;PARTICIPACAO%</code>
          </p>
          <textarea
            className="w-full h-40 bg-muted rounded-lg p-3 text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-primary/50"
            placeholder={`PISOS;468735.22;49.21;52.75\nCIMENTO;72797.87;14.13;8.19\nARGAMASSAS;117406.53;43.83;13.21`}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
          />
          <button
            onClick={handleManualSubmit}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Importar Dados
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfUploader;
