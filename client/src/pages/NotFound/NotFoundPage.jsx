import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-6xl font-bold text-violet-600">404</h1>
      <p className="text-neutral-500">Page introuvable.</p>
      <Link to="/" className="text-sm text-violet-600 underline hover:text-violet-800">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
