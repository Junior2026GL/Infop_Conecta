import { AppError } from '../../shared/errors/AppError.js';
import * as repository from './wallet.repository.js';

export function listSaldos() {
  return repository.listSaldos();
}

export async function getMySaldo(usuarioId) {
  const saldo = await repository.getSaldo(usuarioId);
  return { saldo };
}

export function getMovimientos(usuarioId) {
  return repository.listMovimientos(usuarioId);
}

export async function recharge({ usuarioId, monto, referencia }, creadoPor) {
  if (!usuarioId) throw new AppError('Selecciona un usuario');

  const cantidad = Number(monto);
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new AppError('El monto debe ser mayor a 0');
  }

  const saldo = await repository.recharge({
    usuarioId,
    monto: cantidad,
    referencia: referencia?.trim() || null,
    creadoPor,
  });

  return { saldo };
}
