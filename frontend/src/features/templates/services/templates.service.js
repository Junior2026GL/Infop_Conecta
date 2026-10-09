import { api } from '../../../services/api.js';

export async function listTemplates() {
  const { data } = await api.get('/templates');
  return data.data;
}
