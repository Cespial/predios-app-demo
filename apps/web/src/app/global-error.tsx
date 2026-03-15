'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-zinc-950 text-zinc-100 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-2xl font-bold">Algo salió mal</h2>
          <p className="text-zinc-400 text-sm max-w-md">
            Ocurrió un error inesperado. Nuestro equipo ha sido notificado.
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
