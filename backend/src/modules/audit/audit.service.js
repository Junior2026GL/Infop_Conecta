import * as repository from './audit.repository.js';

export function logAudit(payload) {
  return repository.logAudit(payload);
}

/**
 * Registra un evento de auditoría a partir del request actual.
 * Nunca lanza: si falla el registro, solo se deja constancia en consola
 * para no interrumpir la acción real que está siendo auditada.
 */
export async function record(req, { accion, modulo, descripcion, userId }) {
  try {
    await repository.logAudit({
      userId: userId ?? req.user?.sub ?? null,
      accion,
      modulo,
      descripcion,
      ip: req.ip,
    });
  } catch (error) {
    console.error('No se pudo registrar auditoría:', error.message);
  }
}

export function list(query) {
  return repository.listAudit({
    modulo: query.modulo || null,
    accion: query.accion || null,
    usuarioId: query.usuarioId || null,
    desde: query.desde || null,
    hasta: query.hasta || null,
    q: query.q?.trim() || null,
    page: query.page,
    pageSize: query.pageSize,
  });
}
