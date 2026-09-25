// Lightweight fetch wrapper for the SSA API.
//
// Adresse de l'API :
//  - VITE_API_URL défini → on l'utilise (ex. http://localhost:3000 en dev) ;
//  - absent en production → même origine que le site (« /api/… »), relayé vers
//    l'API par une règle de réécriture de l'hébergeur (voir docs/DEPLOYMENT.md).
//    Sur données mobiles, un seul domaine = pas de requête CORS préalable ni de
//    filtrage anti-robots séparé sur le domaine de l'API.
// Ne plus jamais retomber sur localhost en production : un build sans la
// variable appelait http://localhost:3000 depuis les téléphones.
const RAW_API_URL = import.meta.env.VITE_API_URL;
export const BASE_URL = (RAW_API_URL !== undefined && RAW_API_URL !== ''
  ? RAW_API_URL
  : import.meta.env.DEV ? 'http://localhost:3000' : ''
).replace(/\/+$/, '');

const TOKEN_KEY = 'ssa.token';

// Safari iOS avec « Bloquer tous les cookies » (ou le mode navigation privée
// de certaines versions) fait *lever une exception* au simple accès à
// localStorage. Sans garde, le premier getToken() au montage cassait toute
// l'application — écran blanc. On retombe alors sur une mémoire de session.
let memoryToken = null;

function safeStorage() {
  try {
    const s = window.localStorage;
    const probe = '__ssa_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function getToken() {
  const s = safeStorage();
  if (!s) return memoryToken;
  try {
    return s.getItem(TOKEN_KEY);
  } catch {
    return memoryToken;
  }
}

export function setToken(token) {
  memoryToken = token || null;
  const s = safeStorage();
  if (!s) return;
  try {
    if (token) s.setItem(TOKEN_KEY, token);
    else s.removeItem(TOKEN_KEY);
  } catch {
    // Stockage indisponible — la session reste valable jusqu'à la fermeture.
  }
}

// Vrai quand la session ne survivra pas à un rechargement (cookies bloqués).
export function sessionIsEphemeral() {
  return safeStorage() === null;
}

// Error carrying the API's { code, message } shape and HTTP status.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Délai maximal d'un appel. Sur données mobiles une requête peut rester
// suspendue sans jamais échouer : sans limite, l'écran restait figé.
const TIMEOUT_MS = 45000;
// Les lectures (GET) sont rejouées après une coupure réseau passagère —
// fréquent en 3G/4G (changement d'antenne, réseau qui se réveille).
const GET_RETRIES = 2;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(url, init, timeoutMs) {
  // AbortSignal.timeout() n'existe qu'à partir de Safari 16 : on garde
  // AbortController + setTimeout, supporté depuis iOS 12.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  } finally {
    clearTimeout(timer);
  }
}

export async function request(path, { method = 'GET', body, auth = true, timeout = TIMEOUT_MS, retries } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const init = { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined };
  const maxRetries = retries ?? (method === 'GET' ? GET_RETRIES : 0);
  let response;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetchOnce(`${BASE_URL}${path}`, init, timeout);
      break;
    } catch (err) {
      if (err.code !== 'NETWORK_ERROR' || attempt >= maxRetries) throw err;
      await wait(1000 * (attempt + 1));
    }
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const code = data?.code || (data ? 'ERROR' : 'UNEXPECTED_RESPONSE');
    // Réponse non JSON (page HTML d'un proxy, d'un portail opérateur ou d'un
    // contrôle anti-robots) : on le dit, avec le code, au lieu d'un message vague.
    const message = data?.message || (data
      ? 'Une erreur est survenue.'
      : `Réponse inattendue du réseau (code ${response.status}). Réessayez dans un instant ou changez de connexion.`);
    const error = new ApiError(response.status, code, message);
    error.data = data; // full payload (e.g. duplicate detection → { existing })
    throw error;
  }

  return data;
}
