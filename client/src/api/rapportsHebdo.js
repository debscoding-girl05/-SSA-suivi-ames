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

// --- Pièces jointes (photo de la fiche papier) ------------------------------

export function listRapportAttachments(rapportId) {
  return request(`/api/rapports-hebdo/${rapportId}/attachments`);
}

export async function uploadRapportAttachment(rapportId, file) {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE_URL}/api/rapports-hebdo/${rapportId}/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "L'envoi de la photo a échoué.");
  return data;
}

export function deleteRapportAttachment(rapportId, attachmentId) {
  return request(`/api/rapports-hebdo/${rapportId}/attachments/${attachmentId}`, { method: 'DELETE' });
}

// Récupère l'image en tant que blob URL (l'endpoint est protégé par token,
// donc un simple <img src="..."> ne peut pas s'authentifier).
export async function fetchRapportAttachmentUrl(rapportId, attachmentId) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/rapports-hebdo/${rapportId}/attachments/${attachmentId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Impossible d'afficher la photo.");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}