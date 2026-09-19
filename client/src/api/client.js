// Lightweight fetch wrapper for the SSA API.
// Base URL comes from VITE_API_URL (see .env), defaults to local backend.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

// L'API est hébergée sur une offre qui met le service en veille : le tout
// premier appel après une période d'inactivité peut demander ~60 s. Sans
// délai maximal, l'interface restait bloquée sur « Connexion… » indéfiniment.
const TIMEOUT_MS = 90000;

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // AbortSignal.timeout() n'existe qu'à partir de Safari 16 : on garde
  // AbortController + setTimeout, supporté depuis iOS 12.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'Le serveur met trop de temps à répondre. Réessayez dans un instant.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur. Vérifiez votre connexion.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const code = data?.code || 'ERROR';
    const message = data?.message || 'Une erreur est survenue.';
    const error = new ApiError(response.status, code, message);
    error.data = data; // full payload (e.g. duplicate detection → { existing })
    throw error;
  }

  return data;
}
