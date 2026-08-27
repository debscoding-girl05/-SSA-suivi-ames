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

// Statut actuel de l'abonnement sur CET appareil (pas au niveau du compte —
// chaque navigateur/téléphone a son propre abonnement).
export async function getPushStatus() {
  if (!pushSupported()) return 'unsupported';
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
