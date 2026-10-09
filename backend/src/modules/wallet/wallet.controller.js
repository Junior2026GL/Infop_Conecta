import * as service from './wallet.service.js';
import { record as recordAudit } from '../audit/audit.service.js';

export async function list(req, res, next) {
  try {
    res.json({ ok: true, data: await service.listSaldos() });
  } catch (error) {
    next(error);
  }
}

export async function mySaldo(req, res, next) {
  try {
    res.json({ ok: true, data: await service.getMySaldo(req.user.sub) });
  } catch (error) {
    next(error);
  }
}

export async function misMovimientos(req, res, next) {
  try {
    res.json({ ok: true, data: await service.getMovimientos(req.user.sub) });
  } catch (error) {
    next(error);
  }
}

export async function movimientos(req, res, next) {
  try {
    res.json({ ok: true, data: await service.getMovimientos(req.params.usuarioId) });
  } catch (error) {
    next(error);
  }
}

export async function recharge(req, res, next) {
  try {
    const data = await service.recharge(req.body, req.user.sub);
    await recordAudit(req, {
      accion: 'RECARGA',
      modulo: 'SALDOS',
      descripcion: `Recarga de L. ${req.body.monto} al usuario #${req.body.usuarioId}${req.body.referencia ? ` (${req.body.referencia})` : ''}`,
    });
    res.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}
