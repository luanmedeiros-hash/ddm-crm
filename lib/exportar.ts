// lib/exportar.ts
// Utilitários para exportação de dados em CSV

function escaparCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const s = Array.isArray(valor) ? valor.join(', ') : String(valor);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function gerarCsv(cabecalho: string[], linhas: unknown[][]): string {
  const rows = [
    cabecalho.map(escaparCsv).join(','),
    ...linhas.map(l => l.map(escaparCsv).join(',')),
  ];
  return rows.join('\n');
}

export function baixarCsv(conteudo: string, nomeArquivo: string) {
  const bom = '﻿'; // BOM para Excel reconhecer UTF-8
  const blob = new Blob([bom + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function fmtDataBrCsv(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}
