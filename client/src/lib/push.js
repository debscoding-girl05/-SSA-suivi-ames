import { request } from '../api/client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// iPhone / iPad : Safari n'expose PushManager QUE dans une PWA installée sur
// l'écran d'accueil (iOS 16.4+). Dans un onglet classique, l'API est absente —
// il ne s'agit donc pas d'un « non supporté » définitif, mais d'un « à
// installer ». On distingue les deux pour pouvoir guider l'utilisateur.
export function isIos() {
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ se déclare « Macintosh » mais expose le tactile.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // Propriété historique propre à Safari iOS.
    window.navigator.standalone === true
  );
}

// Statut actuel de l'abonnement sur CET appareil (pas au niveau du compte —
// chaque navigateur/téléphone a son propre abonnement).
export async function getPushStatus() {
  if (!pushSupported()) {
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'subscribed' : 'not-subscribed';
}

export async function subscribeToPush() {
  if (!pushSupported()) throw new Error("Ce navigateur ne prend pas en charge les notifications.");

  const { publicKey, configured } = await request('/api/push/public-key', { auth: false });
  if (!configured || !publicKey) {
    throw new Error("Les notifications push ne sont pas encore configurées côté serveur.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permission refusée.');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = sub.toJSON();
  await request('/api/push/subscribe', { method: 'POST', body: { endpoint: json.endpoint, keys: json.keys } });
  return sub;
}

export async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await request('/api/push/unsubscribe', { method: 'POST', body: { endpoint } });
}
