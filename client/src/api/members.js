import { request } from './client';

// Build a query string from a filters object, skipping empty values.
function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function listMembers(filters) {
  return request(`/api/members${toQuery(filters)}`);
}

export function getMember(id) {
  return request(`/api/members/${id}`);
}

export function createMember(payload) {
  return request('/api/members', { method: 'POST', body: payload });
}

export function updateMember(id, payload) {
  return request(`/api/members/${id}`, { method: 'PUT', body: payload });
}

export function deleteMember(id) {
  return request(`/api/members/${id}`, { method: 'DELETE' });
}
