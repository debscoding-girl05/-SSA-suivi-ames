import { cn } from '@/lib/utils';

// Logo officiel de la Cathédrale des Signes et Prodiges (public/logo-csp.jpg).
// L'emblème est rond sur fond noir : on le recadre en cercle.
export default function BrandLogo({ className }) {
  return (
    <img
      src="/logo-csp.jpg"
      alt="Cathédrale des Signes et Prodiges"
      width="40"
      height="40"
      className={cn('size-10 shrink-0 rounded-full bg-black object-cover', className)}
    />
  );
}
