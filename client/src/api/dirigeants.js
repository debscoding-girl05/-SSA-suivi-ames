import { request } from './client';

function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function listDirigeants(filters) {
  return request(`/api/dirigeants${toQuery(filters)}`);
}

export function createDirigeant(payload) {
  return request('/api/dirigeants', { method: 'POST', body: payload });
}

export function getDirigeant(id) {
  return request(`/api/dirigeants/${id}`);
}

export function updateDirigeant(id, payload) {
  return request(`/api/dirigeants/${id}`, { method: 'PUT', body: payload });
}

export function deactivateDirigeant(id) {
  return request(`/api/dirigeants/${id}/deactivate`, { method: 'POST' });
}

export function reactivateDirigeant(id) {
  return request(`/api/dirigeants/${id}/reactivate`, { method: 'POST' });
}

// Assignés (nested under a dirigeant)
export function listAssignes(dirigeantId) {
  return request(`/api/dirigeants/${dirigeantId}/assignes`);
}

export function createAssigne(dirigeantId, payload) {
  return request(`/api/dirigeants/${dirigeantId}/assignes`, { method: 'POST', body: payload });
}

// Rattache un assigné déjà existant (trouvé via l'annuaire ou une détection
// de doublon) à ce dirigeant, sans ressaisir ses informations.
export function attachAssigne(dirigeantId, assigneId) {
  return request(`/api/dirigeants/${dirigeantId}/assignes/attach`, { method: 'POST', body: { assigneId } });
}

export function updateAssigne(dirigeantId, assigneId, payload) {
  return request(`/api/dirigeants/${dirigeantId}/assignes/${assigneId}`, { method: 'PUT', body: payload });
}

export function deleteAssigne(dirigeantId, assigneId) {
  return request(`/api/dirigeants/${dirigeantId}/assignes/${assigneId}`, { method: 'DELETE' });
}