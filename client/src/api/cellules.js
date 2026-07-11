import { request } from './client';

function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function listCellules() {
  return request('/api/cellules');
}

export function getCellule(id) {
  return request(`/api/cellules/${id}`);
}

export function createCellule(payload) {
  return request('/api/cellules', { method: 'POST', body: payload });
}

export function updateCellule(id, payload) {
  return request(`/api/cellules/${id}`, { method: 'PUT', body: payload });
}

export function deactivateCellule(id) {
  return request(`/api/cellules/${id}`, { method: 'DELETE' });
}

export function getFicheCellule(celluleId, params) {
  return request(`/api/cellules/${celluleId}/fiche${toQuery(params)}`);
}

export function submitFicheCellule(celluleId, payload) {
  return request(`/api/cellules/${celluleId}/fiche`, { method: 'POST', body: payload });
}

export function validateFicheCellule(celluleId, ficheId) {
  return request(`/api/cellules/${celluleId}/fiche/${ficheId}/validate`, { method: 'POST' });
}