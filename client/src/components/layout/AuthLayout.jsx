import { HeartHandshake, ShieldCheck, Users, BellRing } from 'lucide-react';

// Coquille commune aux pages hors session (connexion, invitation, mot de passe
// oublié / réinitialisé). Auparavant seule la page de connexion portait le
// panneau de marque : les autres pages tombaient sur un écran nu et l'ensemble
// paraissait dépareillé. Tout passe désormais par ce composant.
//
// Mobile : une seule colonne, en-tête logo compact, safe-area respectée.
// ≥ lg : deux colonnes, panneau de marque à gauche, formulaire à droite.
export default function AuthLayout({ children, footer }) {
  return (
    <main className="min-h-screen bg-app lg:grid lg:grid-cols-2">
      {/* Panneau de marque — masqué sur mobile pour laisser la place au formulaire */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary-gradient p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 size-80 rounded-full bg-black/10 blur-2xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <HeartHandshake className="size-5" />
          </div>
          <span className="font-semibold">Suivi des Âmes</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Suivez chaque âme.<br />Ne perdez personne de vue.
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Le suivi pastoral de la Cathédrale des Signes et Prodiges, centralisé et en temps réel.
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-3"><Users className="size-4 text-white/80" /> Dirigeants, départements &amp; assignés</li>
            <li className="flex items-center gap-3"><BellRing className="size-4 text-white/80" /> Rapports hebdomadaires &amp; relances</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-white/80" /> Accès sécurisé par rôle</li>
          </ul>
        </div>

        <p className="relative text-xs text-white/60">Cathédrale des Signes et Prodiges · Yaoundé</p>
      </div>

      {/* Colonne formulaire */}
      <div className="flex min-h-screen items-center justify-center px-6 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-primary">
              <HeartHandshake className="size-7" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Suivi des Âmes</h1>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-7">
            {children}
          </div>

          {footer}
        </div>
      </div>
    </main>
  );
}
