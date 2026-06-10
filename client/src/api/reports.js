import { request } from './client';

function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function listReports() {
  return request('/api/reports');
}

export function getReport(id) {
  return request(`/api/reports/${id}`);
}

export function createReport(payload) {
  return request('/api/reports', { method: 'POST', body: payload });
}

export function updateReport(id, payload) {
  return request(`/api/reports/${id}`, { method: 'PUT', body: payload });
}

export function transmitReport(id) {
  return request(`/api/reports/${id}/transmit`, { method: 'POST' });
}

export function deleteReport(id) {
  return request(`/api/reports/${id}`, { method: 'DELETE' });
}

export function aggregateReport(params) {
  return request(`/api/reports/aggregate${toQuery(params)}`);
}
