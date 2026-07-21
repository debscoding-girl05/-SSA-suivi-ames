import { request, getToken } from './client';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function listRapportsHebdo(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  }
  const s = qs.toString();
  return request(`/api/rapports-hebdo${s ? `?${s}` : ''}`);
}

export function getRapportHebdo(id) {
  return request(`/api/rapports-hebdo/${id}`);
}

export function createRapportHebdo(payload) {
  return request('/api/rapports-hebdo', { method: 'POST', body: payload });
}

export function updateRapportHebdo(id, payload) {
  return request(`/api/rapports-hebdo/${id}`, { method: 'PUT', body: payload });
}

export function deleteRapportHebdo(id) {
  return request(`/api/rapports-hebdo/${id}`, { method: 'DELETE' });
}

// Télécharge le PDF (endpoint protégé → fetch avec token puis download blob).
export async function downloadRapportHebdoPdf(id, filenameHint = 'rapport') {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/rapports-hebdo/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Le téléchargement du PDF a échoué.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameHint}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}