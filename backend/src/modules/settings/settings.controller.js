import * as service from './settings.service.js';
import { record as recordAudit } from '../audit/audit.service.js';

export async function getCostoMensaje(req, res, next) {
  try {
    res.json({ ok: true, data: await service.getCostoMensaje() });
  } catch (error) {
    next(error);
  }
}

export async function setCostoMensaje(req, res, next) {
  try {
    const data = await service.setCostoMensaje(req.body.costoMensaje);
    await recordAudit(req, {
      accion: 'ACTUALIZAR',
      modulo: 'CONFIGURACION',
      descripcion: `Costo por mensaje actualizado a L. ${req.body.costoMensaje}`,
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSoporte(req, res, next) {
  try {
    res.json({ ok: true, data: await service.getSoporte() });
  } catch (error) {
    next(error);
  }
}

export async function setSoporte(req, res, next) {
  try {
    const data = await service.setSoporte(req.body);
    await recordAudit(req, {
      accion: 'ACTUALIZAR',
      modulo: 'CONFIGURACION',
      descripcion: 'Información de soporte actualizada',
    });
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}
