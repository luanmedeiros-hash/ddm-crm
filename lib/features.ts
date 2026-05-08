/**
 * Feature flags do CRM Baldada.
 *
 * Centraliza ligar/desligar funcionalidades sem precisar mexer em
 * vários arquivos. Quando uma flag é alterada aqui, todos os pontos
 * que dependem dela mudam de comportamento.
 */

export const FEATURES = {
  /**
   * Integração com Google Calendar (read-only).
   *
   * Suspensa enquanto o time todo for @gmail.com e o app estiver em
   * "Testing" no Google Cloud. Para reativar:
   *   1. Migrar usuários para domínio próprio (Workspace Internal), OU
   *   2. Publicar app como External + passar pela verificação Google
   *      (4-6 semanas, exige domínio próprio com privacy policy).
   *   3. Adicionar de volta o scope 'calendar.readonly' no
   *      app/login/page.tsx
   *   4. Trocar esta flag para true.
   *
   * Quando false:
   *   - Aba "Agenda" some da sidebar do dashboard
   *   - Bloco de agenda some do /daily
   *   - Bloco embutido some do perfil individual
   *   - /api/calendar/week retorna 503 'feature_disabled'
   *   - Login pede só email/profile/openid (scope não-sensível)
   *
   * Quando true, requer:
   *   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET nas env vars
   *   - Tabela google_tokens no Supabase (migration 003)
   *   - Calendar API habilitada no Google Cloud
   *   - Scope calendar.readonly no OAuth consent screen
   *   - Cada consultor compartilhar calendar com os líderes
   */
  GOOGLE_CALENDAR: false,
} as const;
