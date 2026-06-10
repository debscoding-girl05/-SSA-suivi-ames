import { request } from './client';

function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function listAnnuaire(filters) {
  return request(`/api/annuaire${toQuery(filters)}`);
}
