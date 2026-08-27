import { Phone, MessageCircle } from 'lucide-react';

// One-tap "relance" (Appeler / WhatsApp) for a dirigeant en retard — plutôt
// que d'obliger le Pasteur/Leader à ouvrir sa fiche pour trouver son numéro.
// Rendu à côté (jamais imbriqué dans) un élément cliquable parent : les <a>
// tel:/wa.me sont des liens navigables, pas des enfants d'un <button>.
export default function RelanceActions({ phone, name, message, size = 'sm' }) {
  const tel = (phone || '').replace(/\s/g, '');
  if (!tel) return null;

  const digits = tel.replace(/\D/g, '');
  // wa.me veut l'indicatif pays sans le 0 initial ; les numéros déjà au
  // format international (+237…) sont laissés tels quels.
  const waNumber = digits.startsWith('237') ? digits : digits.startsWith('0') ? `237${digits.slice(1)}` : digits;

  const firstName = (name || '').trim().split(/\s+/)[0] || '';
  const text = message || `Bonjour${firstName ? ' ' + firstName : ''}, un petit rappel pour la fiche de cette semaine sur Suivi des Âmes 🙏`;
  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4';
  const btnSize = size === 'sm' ? 'size-8' : 'size-9';

  return (
    <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <a
        href={`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Relancer ${name || ''} par WhatsApp`}
        title="Relancer par WhatsApp"
        className={`flex ${btnSize} items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-success-foreground-light`}
      >
        <MessageCircle className={iconSize} />
      </a>
      <a
        href={`tel:${tel}`}
        aria-label={`Appeler ${name || ''}`}
        title="Appeler"
        className={`flex ${btnSize} items-center justify-center rounded-lg bg-success text-success-foreground transition-opacity hover:opacity-90`}
      >
        <Phone className={iconSize} />
      </a>
    </div>
  );
}
