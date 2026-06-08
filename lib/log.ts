import * as Sentry from '@sentry/nextjs';

/**
 * Log de erro centralizado. Sempre escreve no console (capturado pela Vercel)
 * e, se o Sentry estiver configurado (SENTRY_DSN), envia o evento.
 */
export function reportError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, msg, extra ? JSON.stringify(extra) : '');
  try {
    Sentry.captureException(error instanceof Error ? error : new Error(`${context}: ${msg}`), {
      tags: { context },
      extra,
    });
  } catch {
    /* Sentry não inicializado — ignora */
  }
}
