import { api } from '../../../services/api.js';

export async function listCampaigns() {
  const { data } = await api.get('/campaigns');
  return data.data;
}

export async function getCampaign(id) {
  const { data } = await api.get(`/campaigns/${id}`);
  return data.data;
}

export async function importCampaign(formData) {
  const { data } = await api.post('/campaigns/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function sendCampaign(id) {
  const { data } = await api.post(`/campaigns/${id}/enviar`);
  return data.data;
}

export async function removeDestinatario(campaignId, destinatarioId) {
  const { data } = await api.delete(`/campaigns/${campaignId}/destinatarios/${destinatarioId}`);
  return data.data;
}

export async function updateDestinatario(campaignId, destinatarioId, payload) {
  const { data } = await api.put(`/campaigns/${campaignId}/destinatarios/${destinatarioId}`, payload);
  return data.data;
}

export async function addDestinatario(campaignId, payload) {
  const { data } = await api.post(`/campaigns/${campaignId}/destinatarios`, payload);
  return data.data;
}
