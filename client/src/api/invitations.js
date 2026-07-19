import { request } from './client';

export function createInvitation(payload) {
  return request('/api/invitations', { method: 'POST', body: payload });
}

export function listInvitations() {
  return request('/api/invitations');
}

export function revokeInvitation(id) {
  return request(`/api/invitations/${id}`, { method: 'DELETE' });
}

export function getInvitationByToken(token) {
  return request(`/api/invitations/token/${token}`, { auth: false });
}

export function acceptInvitation(token, payload) {
  return request(`/api/invitations/token/${token}/accept`, {
    method: 'POST',
    body: payload,
    auth: false,
  });
}