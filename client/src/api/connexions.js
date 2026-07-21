import { request } from './client';

export function listConnexions() {
  return request('/api/connexions');
}