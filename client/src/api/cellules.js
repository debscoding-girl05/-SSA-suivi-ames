import { request } from './client';

export function listCellules() {
  return request('/api/cellules');
}
export function getCellule(id) {
  return request(`/api/cellules/${id}`);
}
export function celluleLeaders() {
  return request('/api/cellules/leaders');
}
export function createCelluleLeader(payload) {
  return request('/api/cellules/leaders', { method: 'POST', body: payload });
}
export function createCellule(payload) {
  return request('/api/cellules', { method: 'POST', body: payload });
}
export function updateCellule(id, payload) {
  return request(`/api/cellules/${id}`, { method: 'PUT', body: payload });
}
export function addMembreCellule(id, payload) {
  return request(`/api/cellules/${id}/membres`, { method: 'POST', body: payload });
}
export function updateMembreCellule(id, membreId, payload) {
  return request(`/api/cellules/${id}/membres/${membreId}`, { method: 'PUT', body: payload });
}
export function removeMembreCellule(id, membreId) {
  return request(`/api/cellules/${id}/membres/${membreId}`, { method: 'DELETE' });
}
export function submitFicheCellule(id, payload) {
  return request(`/api/cellules/${id}/fiche`, { method: 'POST', body: payload });
}
