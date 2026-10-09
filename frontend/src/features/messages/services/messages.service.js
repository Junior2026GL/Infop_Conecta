import { api } from '../../../services/api.js';

export async function sendTemplateMessage(payload) {
  const { data } = await api.post('/messages/template', payload);
  return data.data;
}

export async function listMessages() {
  const { data } = await api.get('/messages');
  return data.data;
}
