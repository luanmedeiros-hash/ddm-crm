// ─── Perfis Comportamentais DISC ───────────────────────────────────────────
// Apenas o líder tem acesso a essas informações

export type PerfilDisc = 'D' | 'I' | 'S' | 'C';
export type PerfilPragmatico = 'Pragmático' | 'Expressivo' | 'Afável' | 'Analítico';

export interface PerfilComportamental {
  disc: PerfilDisc;
  pragmatico: PerfilPragmatico;
  /** Descrição curta do perfil */
  descricao: string;
  /** Pontos fortes comportamentais */
  fortes: string[];
  /** Pontos de atenção */
  atencao: string[];
  /** Como o líder deve conduzir o daily com esse perfil */
  conduta_daily: string[];
  /** Como apoiar em momentos de bloqueio */
  apoio_bloqueio: string[];
  /** Como dar feedback para esse perfil */
  feedback: string[];
  /** Motivadores principais */
  motivadores: string[];
}

// Mapa fixo: consultor → perfil
// Estes são perfis sugeridos e podem ser editados futuramente via Supabase
export const PERFIS_DISC: Record<string, PerfilComportamental> = {};

// Cores e rótulos por perfil DISC
export const DISC_CONFIG: Record<PerfilDisc, { cor: string; corBg: string; emoji: string; titulo: string; tagline: string }> = {
  D: { cor: '#ef4444', corBg: 'rgba(239,68,68,0.1)', emoji: '🔴', titulo: 'Dominante', tagline: 'Direto · Decisivo · Orientado a resultado' },
  I: { cor: '#f59e0b', corBg: 'rgba(245,158,11,0.1)', emoji: '🟡', titulo: 'Influente', tagline: 'Comunicativo · Entusiasta · Persuasivo' },
  S: { cor: '#22c55e', corBg: 'rgba(34,197,94,0.1)', emoji: '🟢', titulo: 'Estável', tagline: 'Paciente · Confiável · Orientado ao time' },
  C: { cor: '#3b82f6', corBg: 'rgba(59,130,246,0.1)', emoji: '🔵', titulo: 'Consciencioso', tagline: 'Analítico · Preciso · Orientado a processos' },
};

export const PRAGMATICO_CONFIG: Record<PerfilPragmatico, { cor: string; corBg: string; emoji: string }> = {
  'Pragmático':  { cor: '#ef4444', corBg: 'rgba(239,68,68,0.08)',  emoji: '⚡' },
  'Expressivo':  { cor: '#f59e0b', corBg: 'rgba(245,158,11,0.08)', emoji: '✨' },
  'Afável':      { cor: '#22c55e', corBg: 'rgba(34,197,94,0.08)',  emoji: '🤝' },
  'Analítico':   { cor: '#3b82f6', corBg: 'rgba(59,130,246,0.08)', emoji: '🔍' },
};
