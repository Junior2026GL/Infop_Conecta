import { api } from '../../../services/api.js';

export async function getCostoMensajeInfo() {
  const { data } = await api.get('/settings/costo-mensaje');
  return data.data;
}

export async function getCostoMensaje() {
  const info = await getCostoMensajeInfo();
  return info.costoMensaje;
}

export async function updateCostoMensaje(costoMensaje) {
  const { data } = await api.put('/settings/costo-mensaje', { costoMensaje });
  return data.data;
}

export async function getSoporte() {
  const { data } = await api.get('/settings/soporte');
  return data.data;
}

export async function updateSoporte(soporte) {
  const { data } = await api.put('/settings/soporte', soporte);
  return data.data;
}
