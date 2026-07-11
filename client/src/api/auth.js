import { request } from './client';

export function login(identifier, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { identifier, password },
    auth: false,
  });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function me() {
  return request('/api/auth/me', { method: 'GET' });
}

export function changePassword(currentPassword, newPassword) {
  return request('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}