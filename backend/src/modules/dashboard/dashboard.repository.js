import { db } from '../../infrastructure/database/mysql.js';

export async function getStats() {
  const [[messages]] = await db.query(
    `SELECT
      COUNT(*) total,
      SUM(estado = 'SENT') sent,
      SUM(estado = 'DELIVERED') delivered,
      SUM(estado = 'READ') read_count,
      SUM(estado = 'FAILED') failed
     FROM mensajes`
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
