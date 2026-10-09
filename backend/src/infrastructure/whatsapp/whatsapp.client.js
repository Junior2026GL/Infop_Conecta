import { env } from '../../config/env.js';

function assertWhatsAppConfig() {
  const { graphApiVersion, accessToken, phoneNumberId } = env.meta;

  if (!graphApiVersion || !accessToken || !phoneNumberId) {
    const error = new Error(
      'Falta configurar META_GRAPH_API_VERSION, WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID'
    );
    error.statusCode = 500;
    throw error;
  }
}

export async function sendTemplateMessage({
  to,
  templateName,
  languageCode = 'es',
  components = [],
}) {
  assertWhatsAppConfig();

  const url = `https://graph.facebook.com/${env.meta.graphApiVersion}/${env.meta.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length ? { components } : {}),
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.meta.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Error enviando mensaje a Meta');
    error.statusCode = 502;
    error.meta = data;
    throw error;
  }

  return data;
}

export async function sendTextMessage({ to, body }) {
  assertWhatsAppConfig();

  const url = `https://graph.facebook.com/${env.meta.graphApiVersion}/${env.meta.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.meta.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Error enviando mensaje a Meta');
    error.statusCode = 502;
    error.meta = data;
    throw error;
  }

  return data;
}
