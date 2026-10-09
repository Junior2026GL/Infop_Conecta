import { db } from '../../infrastructure/database/mysql.js';

/**
 * Totales de mensajes. Con `enviadoPor` solo cuenta los mensajes enviados por ese
 * usuario (tutores); sin él cuenta todos (Super Admin y Admin).
 */
export async function getStats({ enviadoPor } = {}) {
  const where = enviadoPor ? 'WHERE enviado_por = ?' : '';
  const params = enviadoPor ? [enviadoPor] : [];

  const [[messages]] = await db.query(
    `SELECT
      COUNT(*) total,
      SUM(estado = 'SENT') sent,
      SUM(estado = 'DELIVERED') delivered,
      SUM(estado = 'READ') read_count,
      SUM(estado = 'FAILED') failed
     FROM mensajes
     ${where}`,
    params
  );

  return {
    mensajes: {
      total: Number(messages.total || 0),
      enviados: Number(messages.sent || 0),
      entregados: Number(messages.delivered || 0),
      leidos: Number(messages.read_count || 0),
      fallidos: Number(messages.failed || 0),
    },
  };
}
