import { api } from '../../../services/api.js';

export async function listSaldos() {
  const { data } = await api.get('/wallet');
  return data.data;
}

export async function getMySaldo() {
  const { data } = await api.get('/wallet/mi-saldo');
  return data.data.saldo;
}

export async function getMovimientos(usuarioId) {
  const { data } = await api.get(`/wallet/${usuarioId}/movimientos`);
  return data.data;
}

export async function getMisMovimientos() {
  const { data } = await api.get('/wallet/mis-movimientos');
  return data.data;
}

export async function rechargeSaldo(payload) {
  const { data } = await api.post('/wallet/recargar', payload);
  return data.data;
}
