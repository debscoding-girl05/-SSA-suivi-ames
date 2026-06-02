import { request } from './client';

export function listDepartments() {
  return request('/api/departments');
}
