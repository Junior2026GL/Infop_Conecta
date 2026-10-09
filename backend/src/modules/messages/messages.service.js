import { sendTemplateMessage, sendTextMessage } from '../../infrastructure/whatsapp/whatsapp.client.js';
import * as repository from './messages.repository.js';
import { normalizePhone } from '../../shared/utils/phone.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ROLES } from '../../shared/constants/roles.js';

export function list(requestUser) {
  const enviadoPor = requestUser?.rol === ROLES.NORMAL ? requestUser.sub : undefined;
  return repository.listMessages({ enviadoPor });
}

export async function sendTemplate(data, userId) {
  const telefono = normalizePhone(data.telefono);

  if (telefono.length < 8) throw new AppError('Número de teléfono inválido');
  if (!data.templateName) throw new AppError('La plantilla es obligatoria');

  try {
    const result = await sendTemplateMessage({
      to: telefono,
      templateName: data.templateName,
      languageCode: data.languageCode || 'es',
      components: data.components || [],
    });

    const metaMessageId = result?.messages?.[0]?.id || null;

    const id = await repository.createMessage({
      participante_id: data.participanteId,
      telefono,
      tipo: 'TEMPLATE',
      contenido: data.preview || null,
      template_name: data.templateName,
      meta_message_id: metaMessageId,
      estado: 'SENT',
      enviado_por: userId,
    });

    return { id, metaMessageId, meta: result };
  } catch (error) {
    await repository.createMessage({
      participante_id: data.participanteId,
      telefono,
      tipo: 'TEMPLATE',
      contenido: data.preview || null,
      template_name: data.templateName,
      estado: 'FAILED',
      error_mensaje: error.message,
      enviado_por: userId,
    });
    throw error;
  }
}

export async function sendText(data, userId) {
  const telefono = normalizePhone(data.telefono);
  if (telefono.length < 8) throw new AppError('Número de teléfono inválido');
  if (!data.body?.trim()) throw new AppError('El mensaje es obligatorio');

  const result = await sendTextMessage({ to: telefono, body: data.body });
  const metaMessageId = result?.messages?.[0]?.id || null;

  const id = await repository.createMessage({
    participante_id: data.participanteId,
    telefono,
    tipo: 'TEXT',
    contenido: data.body,
    meta_message_id: metaMessageId,
    estado: 'SENT',
    enviado_por: userId,
  });

  return { id, metaMessageId, meta: result };
}
