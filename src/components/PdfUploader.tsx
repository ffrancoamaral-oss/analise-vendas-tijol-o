import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parsePdfFile } from '@/utils/pdfParser';
import type { PdfExtractedData } from '@/types/analysis';

interface PdfUploaderProps {
  onDataExtracted: (data: PdfExtractedData[]) => void;
}

const PdfUploader: React.FC<PdfUploaderProps> = ({ onDataExtracted }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
        setErrorMsg('Nenhum dado de produto encontrado no PDF. Verifique o formato.');
        return;
      }
      setStatus('success');
      onDataExtracted(data);
    } catch (err) {
      console.error('PDF parse error:', err);
      setStatus('error');
      setErrorMsg('Erro ao processar o PDF. Verifique se é um relatório de rentabilidade válido.');
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

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
        isDragging
          ? 'border-primary bg-accent'
          : status === 'success'
          ? 'border-success bg-success/5'
          : status === 'error'
          ? 'border-destructive bg-destructive/5'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('pdf-input')?.click()}
    >
      <input
        id="pdf-input"
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleInputChange}
      />
      
      {status === 'loading' ? (
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Processando {fileName}...</p>
        </div>
      ) : status === 'success' ? (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <p className="text-sm font-medium">PDF carregado com sucesso!</p>
          <p className="text-xs text-muted-foreground">{fileName} — Clique para carregar outro</p>
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
  );
};

export default PdfUploader;
