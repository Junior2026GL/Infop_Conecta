import { AppError } from '../../shared/errors/AppError.js';
import * as repository from './settings.repository.js';

export async function getCostoMensaje() {
  const row = await repository.getSettingMeta('costo_mensaje');
  return {
    costoMensaje: Number(row?.valor ?? 0),
    actualizadoEn: row?.updated_at ?? null,
  };
}

export async function setCostoMensaje(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new AppError('El costo debe ser un número mayor o igual a 0');
  }

  await repository.setSetting('costo_mensaje', numero.toString());
  return getCostoMensaje();
}

const SOPORTE_DEFAULT = { telefono: '', whatsapp: '', correo: '', horario: '' };

export async function getSoporte() {
  const row = await repository.getSettingMeta('soporte_info');
  if (!row) return { ...SOPORTE_DEFAULT, actualizadoEn: null };

  return { ...SOPORTE_DEFAULT, ...JSON.parse(row.valor), actualizadoEn: row.updated_at };
}

export async function setSoporte({ telefono, whatsapp, correo, horario }) {
  const data = {
    telefono: (telefono || '').trim(),
    whatsapp: (whatsapp || '').trim(),
    correo: (correo || '').trim(),
    horario: (horario || '').trim(),
  };

  const json = JSON.stringify(data);
  if (json.length > 255) {
    throw new AppError('La información de soporte es demasiado larga');
  }

  await repository.setSetting('soporte_info', json);
  return getSoporte();
}
