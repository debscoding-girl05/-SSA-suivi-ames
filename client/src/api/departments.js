import { request } from './client';

export function listDepartments() {
  return request('/api/departments');
}

export function departmentsOverview() {
  return request('/api/departments/overview');
}

export function createDepartment(payload) {
  return request('/api/departments', { method: 'POST', body: payload });
}

export function updateDepartment(id, payload) {
  return request(`/api/departments/${id}`, { method: 'PUT', body: payload });
}
