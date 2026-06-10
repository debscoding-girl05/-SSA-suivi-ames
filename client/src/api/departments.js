import { request } from './client';

export function listDepartments() {
  return request('/api/departments');
}

export function departmentsOverview() {
  return request('/api/departments/overview');
}
