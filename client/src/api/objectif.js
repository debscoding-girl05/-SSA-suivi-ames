import { request } from './client';

export function getObjectif() {
  return request('/api/objectif');
}

// { target, debut?, fin? } — dates AAAA-MM-JJ (vide = pas de borne).
export function setObjectif({ target, debut, fin }) {
  return request('/api/objectif', { method: 'PUT', body: { target, debut, fin } });
}
