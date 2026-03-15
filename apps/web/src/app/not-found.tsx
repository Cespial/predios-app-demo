import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 gap-6">
      <MapPin size={64} className="text-zinc-600" />
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-zinc-200">404</h1>
        <p className="text-zinc-400 text-lg">Página no encontrada</p>
        <p className="text-zinc-500 text-sm max-w-md">
          La página que buscas no existe o fue movida.
        </p>
      </div>
      <Link
        href="/mapa"
        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Ir al mapa
      </Link>
    </div>
  );
}
