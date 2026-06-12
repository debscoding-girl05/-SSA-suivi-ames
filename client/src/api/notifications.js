import { request } from './client';

export function listNotifications() {
  return request('/api/notifications');
}

export function markNotificationRead(id) {
  return request(`/api/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return request('/api/notifications/read-all', { method: 'POST' });
}
