// Tipos compartilhados — espelham as colunas de registros_daily

export type Etapa =
  | 'AA' | 'CA' | 'SA' | 'EA'
  | 'AF' | 'CF' | 'SF' | 'EF'
  | 'AP' | 'PP' | 'REC';

export interface RegistroDaily {
  id: string;
  user_id: string;
  data: string; // 'YYYY-MM-DD'
  consultor_nome: string;

  // Etapas (meta + real para cada)
  AA_meta: number; AA_real: number;
  CA_meta: number; CA_real: number;
  SA_meta: number; SA_real: number;
  EA_meta: number; EA_real: number;
  AF_meta: number; AF_real: number;
  CF_meta: number; CF_real: number;
  SF_meta: number; SF_real: number;
  EF_meta: number; EF_real: number;
  AP_meta: number; AP_real: number;
  PP_meta: number; PP_real: number;
  REC_meta: number; REC_real: number;

  ctt_quente: number;
  bloqueio: string;
  bloqueio_desc: string;
  ajuda: string;
  confianca: number;
  avanco: string;
  prioridade: string;
  big_points: string[];
  observacoes: string;

  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  nome: string | null;
  role: 'lider' | 'liderado';
  consultor_nome: string | null;
}

// Estrutura interna usada nos componentes (formato {meta, real} por etapa)
// Convertido a partir de RegistroDaily via lib/calculos
export interface RegInterno {
  data: string;
  consultor: string;
  AA: { meta: number; real: number };
  CA: { meta: number; real: number };
  SA: { meta: number; real: number };
  EA: { meta: number; real: number };
  AF: { meta: number; real: number };
  CF: { meta: number; real: number };
  SF: { meta: number; real: number };
  EF: { meta: number; real: number };
  AP: { meta: number; real: number };
  PP: { meta: number; real: number };
  REC: { meta: number; real: number };
  cttQuente: number;
  bloqueio: string;
  bloqueioDesc: string;
  ajuda: string;
  confianca: number;
  avanco: string;
  prioridade: string;
  bigPoints: string[];
  observacoes: string;
  tipoDia: 'util' | 'fds';
}

export type Status = 'Normal' | 'Atenção' | 'Crítico' | 'Sem dados';

export interface Conversoes {
  'AA→AF': number;
  'AF→AP': number;
  'AA→AP': number;
  'AF→REC': number;
  raw: { aa: number; af: number; ap: number; rec: number };
}

export interface Tendencia {
  dir: 'up' | 'down' | 'flat';
  delta: number;
}

// ─── Google Calendar ──────────────────────────────────────────────────────────

export interface CalendarEventDB {
  id: string;
  user_id: string;
  google_id: string;
  summary: string;
  description?: string | null;
  start_at: string;        // ISO 8601
  end_at: string;
  location?: string | null;
  hangout_link?: string | null;
  organizer_email?: string | null;
  attendees: CalendarAttendee[];
  status: string;
  is_all_day: boolean;
  synced_at: string;
  // Vinculação a lead
  lead_id?: string | null;
  lead_nome?: string | null;
  lead_notas?: string | null;
  // Flags de features futuras
  briefing_gerado: boolean;
  transcricao_url?: string | null;
  relatorio_gerado: boolean;
  followup_gerado: boolean;
}

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  self?: boolean;
  organizer?: boolean;
}

export interface SyncResult {
  ok: boolean;
  upserted: number;
  range: { from: string; to: string };
  error?: string;
}
