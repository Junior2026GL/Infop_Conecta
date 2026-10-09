import { api } from '../../../services/api.js';

export async function login(credentials) {
  const { data } = await api.post('/auth/login', credentials);
  return data.data;
}

export async function changeMyPassword({ currentPassword, newPassword }) {
  const { data } = await api.put('/auth/password', { currentPassword, newPassword });
  return data.data;
}

export async function forgotPassword(usuario) {
  const { data } = await api.post('/auth/forgot-password', { usuario });
  return data.data;
}

export async function resetPassword({ usuario, code, newPassword }) {
  const { data } = await api.post('/auth/reset-password', { usuario, code, newPassword });
  return data.data;
}
