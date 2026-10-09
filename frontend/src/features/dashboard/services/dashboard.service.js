import { api } from '../../../services/api.js';

export async function getStats() {
  const { data } = await api.get('/dashboard/stats');
  return data.data;
}
