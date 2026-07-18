import { request } from './client';

export function getObjectif() {
  return request('/api/objectif');
}

export function setObjectif(target) {
  return request('/api/objectif', { method: 'PUT', body: { target } });
}
