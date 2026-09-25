import { ShieldCheck, Users, BellRing } from 'lucide-react';

// Coquille commune aux pages hors session (connexion, invitation, mot de passe
// oublié / réinitialisé), aux couleurs du logo de la Cathédrale : nuit bleu
// marine et or.
//
// Mobile : bandeau marine avec l'emblème, puis la carte du formulaire qui
// remonte par-dessus. ≥ lg : deux colonnes, panneau de marque à gauche.
const NAVY = '#0b1130';
const GOLD = '#e2b95a';

const FEATURES = [
  { icon: Users, text: 'Leaders, encadreurs et membres, par département' },
  { icon: BellRing, text: 'Fiches hebdomadaires, rapports et relances' },
  { icon: ShieldCheck, text: 'Accès sécurisé, adapté à chaque rôle' },
];

function Emblem({ size }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Halo doré discret derrière l'emblème, comme la lumière du logo. */}
      <div aria-hidden className="absolute -inset-[18%] rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}33 0%, transparent 68%)` }} />
      <div aria-hidden className="absolute -inset-1.5 rounded-full border" style={{ borderColor: `${GOLD}55` }} />
      <img
        src="/logo-csp.jpg"
        alt="Cathédrale des Signes et Prodiges"
        width={size}
        height={size}
        className="relative size-full rounded-full bg-black object-cover"
      />
    </div>
  );
}

function ChurchName({ className = '' }) {
  return (
    <p className={`font-bold uppercase leading-tight tracking-[0.12em] ${className}`} style={{ color: GOLD, fontFamily: 'Cinzel, "Trajan Pro", Georgia, serif' }}>
      Cathédrale des Signes<br />et Prodiges
    </p>
  );
}

export default function AuthLayout({ children, footer }) {
  return (
    <main className="min-h-screen bg-app lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Panneau de marque — ordinateur */}
      <aside className="relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12" style={{ backgroundColor: NAVY }}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 45% at 50% 38%, ${GOLD}14 0%, transparent 70%)` }} />

        <div className="relative flex items-center gap-2 text-sm font-semibold tracking-wide text-white/80">
          <span style={{ color: GOLD }}>CSP-SSA</span>
          <span className="text-white/35">·</span>
          <span>Suivi des Âmes</span>
        </div>

        <div className="relative flex flex-col items-center text-center">
          <Emblem size={208} />
          <ChurchName className="mt-9 text-[26px]" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
            Miracles · Signes · Puissance · Gloire
          </p>
          <div aria-hidden className="my-8 flex w-48 items-center gap-3">
            <span className="h-px flex-1" style={{ backgroundColor: `${GOLD}66` }} />
            <span className="size-1.5 rotate-45" style={{ backgroundColor: GOLD }} />
            <span className="h-px flex-1" style={{ backgroundColor: `${GOLD}66` }} />
          </div>
          <h2 className="max-w-md text-2xl font-semibold leading-snug text-balance">
            Suivez chaque âme.<br />Ne perdez personne de vue.
          </h2>
          <ul className="mt-6 flex flex-col gap-3 text-left text-sm text-white/80">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full border" style={{ borderColor: `${GOLD}55`, color: GOLD }}>
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-center text-xs text-white/45">Yaoundé · Cameroun</p>
      </aside>

      {/* Colonne formulaire (et bandeau mobile) */}
      <div className="flex min-h-screen flex-col lg:min-h-0 lg:items-center lg:justify-center lg:px-10 lg:py-12">
        {/* Bandeau mobile */}
        <header
          className="relative flex flex-col items-center overflow-hidden px-6 pb-14 pt-[max(2.25rem,env(safe-area-inset-top))] text-center text-white lg:hidden"
          style={{ backgroundColor: NAVY }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% 35%, ${GOLD}1f 0%, transparent 70%)` }} />
          <div className="relative flex flex-col items-center">
            <Emblem size={104} />
            <ChurchName className="mt-5 text-lg" />
            <p className="mt-1.5 text-xs font-medium text-white/65">CSP-SSA · Suivi des Âmes</p>
          </div>
        </header>

        <div className="-mt-7 flex flex-1 justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] lg:mt-0 lg:flex-none lg:px-0 lg:pb-0">
          <div className="w-full max-w-[420px]">
            <div className="relative rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8 lg:rounded-2xl lg:p-9 lg:shadow-none">
              {children}
            </div>
            {footer}
            <p className="mt-8 hidden text-center text-xs text-muted-foreground lg:block">
              © Cathédrale des Signes et Prodiges
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
