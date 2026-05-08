import type { Etapa } from './types';

// 14 consultores da equipe
export const CONSULTORES = [
  'Bacco', 'Bottoni', 'Danilo', 'Davi', 'Duarte', 'Eric', 'Faria',
  'Júlio', 'Mel', 'Pedro', 'PH', 'Rafael', 'Salgado', 'Shoji'
] as const;

// Consultores que entraram recentemente (badge "NOVO")
export const CONSULTORES_NOVOS = ['Pedro', 'Mel', 'Rafael', 'Bacco', 'Bottoni'] as const;

// 11 etapas do funil consultivo DDM
export const ETAPAS: Etapa[] = [
  'AA', 'CA', 'SA', 'EA',
  'AF', 'CF', 'SF', 'EF',
  'AP', 'PP', 'REC'
];

// Etapas que entram no cálculo do índice
export const ETAPAS_INDICE: Etapa[] = ['AA', 'AF', 'AP', 'REC'];
export const PESOS_INDICE: Record<string, number> = {
  AA: 0.25, AF: 0.25, AP: 0.25, REC: 0.25
};

// As 4 métricas-chave do dashboard
export const METRICAS_4 = [
  { key: 'AA→AF',  label: 'Execução de agendados',  desc: 'das análises agendadas viraram análises feitas' },
  { key: 'AF→AP',  label: 'Conversão em pagas',     desc: 'das análises feitas foram pagas' },
  { key: 'AA→AP',  label: 'Funil end-to-end',       desc: 'das análises agendadas chegaram a paga' },
  { key: 'AF→REC', label: 'Geração de recomendação', desc: 'das análises feitas geraram recomendação' },
] as const;

// Significado das siglas (tooltip)
export const SIGNIFICADOS: Record<string, string> = {
  AA:  'Análise Agendada',
  CA:  'Consultoria Agendada',
  SA:  'Serviço Agendado',
  EA:  'Entrevista Agendada',
  AF:  'Análise Feita',
  CF:  'Consultoria Feita',
  SF:  'Serviço Feito',
  EF:  'Entrevista Feita',
  AP:  'Análise Paga',
  PP:  'Pontos de Produção',
  REC: 'Recomendação'
};

// Tipos de bloqueio (dropdown do form)
export const TIPOS_BLOQUEIO = [
  'Sem bloqueio',
  'Cliente não responde',
  'Falta documento',
  'Falta retorno interno',
  'Dúvida técnica',
  'Preciso do gestor',
  'Proposta travada',
  'Reunião remarcada',
  'Outro'
] as const;

// Ações sugeridas para cada tipo de bloqueio
export const ACOES_BLOQUEIO: Record<string, string> = {
  'Cliente não responde': 'Definir tentativa final + plano B',
  'Falta documento': 'Gestor entra em contato com cliente',
  'Falta retorno interno': 'Escalar internamente e cobrar prazo',
  'Dúvida técnica': 'Agendar 15min com pré-vendas',
  'Preciso do gestor': 'Avaliar e responder em até 24h',
  'Proposta travada': 'Ligar para decisor e desarmar objeção',
  'Reunião remarcada': 'Definir prazo limite e abordagem alternativa',
  'Outro': 'Reunião 1:1 para entender contexto'
};

// Helper de "consultor é novo?"
export const isNovo = (nome: string): boolean =>
  (CONSULTORES_NOVOS as readonly string[]).includes(nome);
