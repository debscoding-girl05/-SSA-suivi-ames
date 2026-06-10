import { request } from './client';

function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function weekOverview(params) {
  return request(`/api/rapports${toQuery(params)}`);
}

export function myRapport(params) {
  return request(`/api/rapports/me${toQuery(params)}`);
}

export function getFiche(dirigeantId, params) {
  return request(`/api/rapports/fiche/${dirigeantId}${toQuery(params)}`);
}

export function submitRapport(payload) {
  return request('/api/rapports', { method: 'POST', body: payload });
}

export function validateFiche(id, comment) {
  return request(`/api/rapports/${id}/validate`, { method: 'POST', body: { comment } });
}

export function requestChanges(id, comment) {
  return request(`/api/rapports/${id}/request-changes`, { method: 'POST', body: { comment } });
}
