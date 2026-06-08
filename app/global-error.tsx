'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🪣</div>
          <h2 style={{ color: '#18222f', margin: '0 0 8px' }}>Algo deu errado</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>Já registramos o erro. Tente recarregar a página.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#3d82bd', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
