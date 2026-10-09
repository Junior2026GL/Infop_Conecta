import { api } from '../../../services/api.js';

export async function getUsageReport() {
  const { data } = await api.get('/campaigns/reportes/usuarios');
  return data.data;
}
