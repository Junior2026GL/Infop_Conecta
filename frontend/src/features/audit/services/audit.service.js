import { api } from '../../../services/api.js';

export async function listAudit(params) {
  const { data } = await api.get('/auditoria', { params });
  return data.data;
}
