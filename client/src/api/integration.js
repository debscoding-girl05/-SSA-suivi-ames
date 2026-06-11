import { request } from './client';

export function listNouveauxVenus() {
  return request('/api/integration/nouveaux');
}

export function getNouveauVenu(id) {
  return request(`/api/integration/nouveaux/${id}`);
}

export function registerNouveauVenu(payload) {
  return request('/api/integration/nouveaux', { method: 'POST', body: payload });
}

export function validerLecon(id, lecon) {
  return request(`/api/integration/nouveaux/${id}/valider`, { method: 'POST', body: { lecon } });
}

export function promouvoir(id) {
  return request(`/api/integration/nouveaux/${id}/promouvoir`, { method: 'POST' });
}
