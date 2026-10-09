import * as XLSX from 'xlsx';
import { AppError } from '../../shared/errors/AppError.js';
import { toWhatsAppPhone } from '../../shared/utils/phone.js';
import { ROLES } from '../../shared/constants/roles.js';
import * as repository from './campaigns.repository.js';
import * as templatesRepository from '../templates/templates.repository.js';
import { getSetting } from '../settings/settings.repository.js';
import * as walletRepository from '../wallet/wallet.repository.js';
import { sendTemplateMessage } from '../../infrastructure/whatsapp/whatsapp.client.js';
import { createMessage } from '../messages/messages.repository.js';

const SEND_DELAY_MS = 5000;

function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/**
 * Genera el Excel modelo para importar participantes. Solo lleva los encabezados
 * (sin filas de ejemplo) para que nadie envíe mensajes a datos ficticios por error.
 * La importación lee únicamente la primera hoja, así que las instrucciones van en la segunda.
 */
export function buildParticipantsTemplate() {
  const participantes = XLSX.utils.aoa_to_sheet([['nombre', 'telefono', 'nota']]);
  participantes['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 10 }];

  const instrucciones = XLSX.utils.aoa_to_sheet([
    ['Cómo llenar la hoja «Participantes»'],
    [''],
    ['nombre', 'Obligatorio. Nombre del participante tal como se mostrará en el mensaje.'],
    ['telefono', 'Obligatorio. 8 dígitos (98765432) o 11 con código de país (50498765432).'],
    ['nota', 'Solo si la plantilla incluye la nota del participante; si no, déjala vacía.'],
    [''],
    ['No cambies los encabezados de la primera fila. Borra esta hoja si lo prefieres.'],
  ]);
  instrucciones['!cols'] = [{ wch: 12 }, { wch: 80 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, participantes, 'Participantes');
  XLSX.utils.book_append_sheet(workbook, instrucciones, 'Instrucciones');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase();
}

function extractRows(rawRows) {
  return rawRows.map((row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeKey(key)] = value;
    }

    return {
      nombre: String(normalized.nombre || '').trim(),
      telefono: String(normalized.telefono || '').trim(),
      nota: normalized.nota !== undefined && String(normalized.nota).trim() !== ''
        ? String(normalized.nota).trim()
        : null,
    };
  });
}

async function resolveTemplate(plantillaId) {
  const templates = await templatesRepository.listTemplates();
  const plantilla = templates.find((t) => Number(t.id) === Number(plantillaId));
  if (!plantilla) throw new AppError('Plantilla no encontrada');
  return plantilla;
}

function requiresNota(plantilla) {
  return (plantilla.variables || []).some((v) => v.key === 'nota');
}

function evaluateDestinatario(row, needsNota) {
  const nombre = String(row.nombre || '').trim();
  const nota = row.nota !== undefined && row.nota !== null && String(row.nota).trim() !== ''
    ? String(row.nota).trim()
    : null;

  if (!nombre) {
    return { nombre, telefono: String(row.telefono || '').trim(), nota, estado: 'FALLIDO', error_mensaje: 'Nombre vacío' };
  }

  const telefono = toWhatsAppPhone(row.telefono);
  if (!telefono) {
    return { nombre, telefono: String(row.telefono || '').trim(), nota, estado: 'FALLIDO', error_mensaje: 'Teléfono inválido' };
  }

  if (needsNota && !nota) {
    return { nombre, telefono, nota, estado: 'FALLIDO', error_mensaje: 'Nota vacía' };
  }

  return { nombre, telefono, nota, estado: 'PENDIENTE', error_mensaje: null };
}

// Igual que evaluateDestinatario, pero además marca como fallido el teléfono que
// ya está en la campaña (otro destinatario pendiente o ya enviado).
async function evaluateInCampaign(row, needsNota, campaignId, excludeId = 0) {
  const evaluado = evaluateDestinatario(row, needsNota);
  if (evaluado.estado === 'PENDIENTE' && await repository.phoneInUse(campaignId, evaluado.telefono, excludeId)) {
    return { ...evaluado, estado: 'FALLIDO', error_mensaje: 'Teléfono duplicado en la campaña' };
  }
  return evaluado;
}

export async function importFile({ file, plantillaId, nombre, curso, valoresFijos }, userId) {
  if (!file) throw new AppError('Debes adjuntar un archivo Excel o CSV');
  if (!curso?.trim()) throw new AppError('El nombre del curso es obligatorio');

  const plantilla = await resolveTemplate(plantillaId);
  const needsNota = requiresNota(plantilla);

  let rawRows;
  try {
    rawRows = parseExcelBuffer(file.buffer);
  } catch {
    throw new AppError('No se pudo leer el archivo. Verifica que sea .xlsx o .csv');
  }

  if (!rawRows.length) throw new AppError('El archivo no tiene registros');

  const rows = extractRows(rawRows);

  const telefonosVistos = new Set();
  const destinatarios = rows.map((row) => {
    const evaluado = evaluateDestinatario(row, needsNota);
    if (evaluado.estado !== 'PENDIENTE') return evaluado;

    if (telefonosVistos.has(evaluado.telefono)) {
      return { ...evaluado, estado: 'FALLIDO', error_mensaje: 'Teléfono duplicado en el archivo' };
    }
    telefonosVistos.add(evaluado.telefono);
    return evaluado;
  });

  const campaniaId = await repository.createCampaign({
    plantillaId: plantilla.id,
    nombre: nombre?.trim() || `${plantilla.nombre} - ${curso.trim()}`,
    curso: curso.trim(),
    valoresFijos: valoresFijos || {},
    totalRegistros: destinatarios.length,
    costoUnitario: Number((await getSetting('costo_mensaje')) ?? 0),
    creadoPor: userId,
  });

  await repository.insertDestinatarios(campaniaId, destinatarios);

  return getById(campaniaId);
}

function assertOwnership(campaign, requestUser) {
  const isTutor = requestUser?.rol === ROLES.NORMAL;
  if (isTutor && Number(campaign.creado_por) !== Number(requestUser.sub)) {
    throw new AppError('No tienes acceso a esta campaña', 403);
  }
}

export async function getById(id, requestUser) {
  const campaign = await repository.findCampaignById(id);
  if (!campaign) throw new AppError('Campaña no encontrada', 404);
  assertOwnership(campaign, requestUser);

  const destinatarios = await repository.listDestinatarios(id);
  return { ...campaign, destinatarios };
}

export function list(requestUser) {
  const creadoPor = requestUser?.rol === ROLES.NORMAL ? requestUser.sub : undefined;
  return repository.listCampaigns({ creadoPor });
}

export async function removeDestinatario(campaignId, destinatarioId, requestUser) {
  const campaign = await repository.findCampaignById(campaignId);
  if (!campaign) throw new AppError('Campaña no encontrada', 404);
  assertOwnership(campaign, requestUser);

  if (campaign.estado !== 'BORRADOR') {
    throw new AppError('Solo puedes editar la lista de destinatarios mientras la campaña está en borrador');
  }

  const destinatario = await repository.findDestinatarioById(destinatarioId);
  if (!destinatario || Number(destinatario.campania_id) !== Number(campaignId)) {
    throw new AppError('Destinatario no encontrado', 404);
  }

  if (destinatario.estado === 'ENVIADO') {
    throw new AppError('Este destinatario ya recibió el mensaje y no se puede quitar');
  }

  await repository.deleteDestinatario(destinatarioId);
  await repository.decrementTotalRegistros(campaignId, 1);

  return getById(campaignId, requestUser);
}

export async function updateDestinatario(campaignId, destinatarioId, { nombre, telefono, nota }, requestUser) {
  const campaign = await repository.findCampaignById(campaignId);
  if (!campaign) throw new AppError('Campaña no encontrada', 404);
  assertOwnership(campaign, requestUser);

  if (campaign.estado !== 'BORRADOR') {
    throw new AppError('Solo puedes editar la lista de destinatarios mientras la campaña está en borrador');
  }

  const destinatario = await repository.findDestinatarioById(destinatarioId);
  if (!destinatario || Number(destinatario.campania_id) !== Number(campaignId)) {
    throw new AppError('Destinatario no encontrado', 404);
  }

  if (destinatario.estado === 'ENVIADO') {
    throw new AppError('Este destinatario ya recibió el mensaje y no se puede editar');
  }

  const plantilla = await resolveTemplate(campaign.plantilla_id);
  const evaluado = await evaluateInCampaign(
    { nombre, telefono, nota },
    requiresNota(plantilla),
    campaignId,
    destinatarioId
  );

  await repository.updateDestinatarioDatos(destinatarioId, {
    nombre: evaluado.nombre,
    telefono: evaluado.telefono,
    nota: evaluado.nota,
    estado: evaluado.estado,
    errorMensaje: evaluado.error_mensaje,
  });

  return getById(campaignId, requestUser);
}

export async function addDestinatario(campaignId, { nombre, telefono, nota }, requestUser) {
  const campaign = await repository.findCampaignById(campaignId);
  if (!campaign) throw new AppError('Campaña no encontrada', 404);
  assertOwnership(campaign, requestUser);

  if (campaign.estado !== 'BORRADOR') {
    throw new AppError('Solo puedes agregar destinatarios mientras la campaña está en borrador');
  }

  const plantilla = await resolveTemplate(campaign.plantilla_id);
  const evaluado = await evaluateInCampaign({ nombre, telefono, nota }, requiresNota(plantilla), campaignId);

  await repository.insertDestinatario(campaignId, evaluado);
  await repository.incrementTotalRegistros(campaignId, 1);

  return getById(campaignId, requestUser);
}

/**
 * Reabre una campaña finalizada para reenviar lo que no llegó: los destinatarios
 * que fallaron al enviarse y los que quedaron pendientes (por ejemplo, porque el
 * saldo se acabó a mitad del envío). Los que fallaron por datos inválidos solo
 * se recuperan si ya fueron corregidos. Después el usuario envía como siempre.
 */
export async function retryFailed(id, requestUser) {
  const campaign = await repository.findCampaignById(id);
  if (!campaign) throw new AppError('Campaña no encontrada', 404);
  assertOwnership(campaign, requestUser);

  const reabierta = await repository.reopenCampaign(id);
  if (!reabierta) {
    throw new AppError('Solo puedes reintentar una campaña que ya terminó de enviarse');
  }

  const plantilla = await resolveTemplate(campaign.plantilla_id);
  const needsNota = requiresNota(plantilla);

  const fallidos = await repository.listDestinatariosFallidos(id);
  let recuperados = 0;

  for (const destinatario of fallidos) {
    const evaluado = await evaluateInCampaign(destinatario, needsNota, id, destinatario.id);
    if (evaluado.estado !== 'PENDIENTE') continue;

    await repository.updateDestinatarioDatos(destinatario.id, {
      nombre: evaluado.nombre,
      telefono: evaluado.telefono,
      nota: evaluado.nota,
      estado: 'PENDIENTE',
      errorMensaje: null,
    });
    recuperados += 1;
  }

  if (recuperados > 0) await repository.decrementFallidos(id, recuperados);

  const pendientes = await repository.listDestinatariosPendientes(id);
  if (pendientes.length === 0) {
    await repository.updateCampaignEstado(id, 'FINALIZADA');
    throw new AppError('No hay mensajes para reenviar. Los fallidos restantes tienen datos inválidos: corrígelos o quítalos.');
  }

  return getById(id, requestUser);
}

export function reportUsuarios() {
  return repository.reportPorUsuario();
}

function buildComponents(plantilla, valoresFijos, curso, destinatario) {
  const values = {
    ...valoresFijos,
    curso,
    nombre: destinatario.nombre,
    nota: destinatario.nota,
  };

  const parameters = (plantilla.variables || []).map((variable) => ({
    type: 'text',
    text: String(values[variable.key] ?? ''),
  }));

  return [{ type: 'body', parameters }];
}

export async function send(id, userId, requestUser) {
  const campaign = await repository.findCampaignById(id);
  if (!campaign) throw new AppError('Campaña no encontrada', 404);
  assertOwnership(campaign, requestUser);

  const pendientes = await repository.listDestinatariosPendientes(id);
  const costoUnitario = Number(campaign.costo_unitario || 0);
  const costoEstimado = pendientes.length * costoUnitario;
  const beneficiario = campaign.creado_por;

  if (beneficiario && costoEstimado > 0) {
    const saldo = await walletRepository.getSaldo(beneficiario);
    if (saldo < costoEstimado) {
      throw new AppError(
        `Saldo insuficiente para enviar. Se necesitan L. ${costoEstimado.toFixed(2)} y el saldo disponible es L. ${saldo.toFixed(2)}. Solicita una recarga al Super Admin.`
      );
    }
  }

  // Cambio atómico de estado: si dos peticiones llegan casi al mismo tiempo
  // (doble clic, dos pestañas), solo una de ellas logra pasar de BORRADOR a
  // ENVIANDO. La otra recibe este error en vez de duplicar el envío.
  const started = await repository.markAsSending(id);
  if (!started) {
    throw new AppError('La campaña ya se está enviando o ya fue procesada');
  }

  processCampaign(id, userId).catch((error) => {
    console.error(`Error procesando campaña ${id}:`, error);
  });

  return { id: Number(id), estado: 'ENVIANDO' };
}

async function processCampaign(campaignId, userId) {
  const campaign = await repository.findCampaignById(campaignId);
  const plantilla = await resolveTemplate(campaign.plantilla_id);
  const pendientes = await repository.listDestinatariosPendientes(campaignId);

  for (const destinatario of pendientes) {
    const components = buildComponents(
      plantilla,
      campaign.valores_fijos || {},
      campaign.curso,
      destinatario
    );

    let sendSucceeded = false;

    try {
      const result = await sendTemplateMessage({
        to: destinatario.telefono,
        templateName: plantilla.meta_template_name,
        languageCode: plantilla.idioma || 'es',
        components,
      });

      const metaMessageId = result?.messages?.[0]?.id || null;

      const mensajeId = await createMessage({
        telefono: destinatario.telefono,
        tipo: 'TEMPLATE',
        template_name: plantilla.meta_template_name,
        meta_message_id: metaMessageId,
        estado: 'SENT',
        enviado_por: userId,
      });

      await repository.updateDestinatario(destinatario.id, {
        estado: 'ENVIADO',
        mensajeId,
        errorMensaje: null,
      });
      await repository.incrementCounters(campaignId, { enviados: 1 });
      sendSucceeded = true;
    } catch (error) {
      await repository.updateDestinatario(destinatario.id, {
        estado: 'FALLIDO',
        mensajeId: null,
        errorMensaje: error.message,
      });
      await repository.incrementCounters(campaignId, { fallidos: 1 });
    }

    // El descuento de saldo se maneja aparte: si el mensaje ya se envió pero
    // el saldo no alcanza para cobrarlo (por ejemplo, dos campañas del mismo
    // usuario enviándose a la vez), no queremos sobreescribir un envío
    // exitoso como "fallido". Simplemente detenemos la cola.
    if (sendSucceeded) {
      const costoUnitario = Number(campaign.costo_unitario || 0);
      if (campaign.creado_por && costoUnitario > 0) {
        try {
          await walletRepository.consume({
            usuarioId: campaign.creado_por,
            monto: costoUnitario,
            campaniaId: campaignId,
          });
        } catch (walletError) {
          console.error(
            `Saldo insuficiente al procesar la campaña ${campaignId}, se detiene el envío restante:`,
            walletError.message
          );
          break;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
  }

  await repository.updateCampaignEstado(campaignId, 'FINALIZADA');
}
