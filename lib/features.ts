/**
 * Feature flags do CRM Baldada.
 */

export const FEATURES = {
  /**
   * Integração com Google Calendar (read-only).
   *
   * MVP ativo: cada consultor sincroniza sua própria agenda via
   * POST /api/calendar/sync (botão na tela /daily).
   *
   * Requisitos para funcionar em produção:
   *   1. GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET nas env vars (Vercel)
   *   2. Migration 003 (google_tokens) + 004 (calendar_events) rodadas no Supabase
   *   3. Calendar API habilitada no Google Cloud Console
   *   4. Scope calendar.readonly no OAuth consent screen
   *   5. Cada usuário fazer login (o consent screen pede autorização)
   *
   * Para a sidebar do dashboard mostrar a aba Agenda, deixe true.
   * O botão "Sincronizar" em /daily funciona independente dessa flag.
   */
  GOOGLE_CALENDAR: true,

  /**
   * Bloco de agenda no /daily (AgendaConsultor).
   * Independe da flag acima — usa diretamente /api/calendar/sync + events.
   */
  CALENDAR_DAILY: true,
} as const;
