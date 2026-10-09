import { db } from '../../infrastructure/database/mysql.js';

export async function createMessage(data) {
  const [result] = await db.query(
    `INSERT INTO mensajes
      (participante_id, telefono, tipo, contenido, template_name, meta_message_id,
       estado, error_codigo, error_mensaje, enviado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.participante_id || null,
      data.telefono,
      data.tipo,
      data.contenido || null,
      data.template_name || null,
      data.meta_message_id || null,
      data.estado || 'PENDIENTE',
      data.error_codigo || null,
      data.error_mensaje || null,
      data.enviado_por || null,
    ]
  );

  return result.insertId;
}

const MAX_MESSAGES = 10000;

export async function listMessages({ enviadoPor, estado, campaniaId, desde, hasta } = {}) {
  const conditions = [];
  const params = [];

  if (enviadoPor) {
    conditions.push('m.enviado_por = ?');
    params.push(enviadoPor);
  }
  if (estado) {
    conditions.push('m.estado = ?');
    params.push(estado);
  }
  if (campaniaId) {
    conditions.push('c.id = ?');
    params.push(campaniaId);
  }
  if (desde) {
    conditions.push('m.created_at >= ?');
    params.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    conditions.push('m.created_at <= ?');
    params.push(`${hasta} 23:59:59`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT m.id, m.telefono, m.tipo, m.contenido, m.template_name,
            m.meta_message_id, m.estado, m.error_mensaje, m.created_at,
            COALESCE(p.nombre_completo, cd.nombre) AS nombre_completo,
            c.id AS campania_id, c.nombre AS campania_nombre
     FROM mensajes m
     LEFT JOIN participantes p ON p.id = m.participante_id
     LEFT JOIN campania_destinatarios cd ON cd.mensaje_id = m.id
     LEFT JOIN campanias c ON c.id = cd.campania_id
     ${where}
     ORDER BY m.id DESC
     LIMIT ${MAX_MESSAGES}`,
    params
  );
  return rows;
}

export async function updateStatusByMetaId(metaId, status, errorCode = null, errorMessage = null) {
  await db.query(
    `UPDATE mensajes
     SET estado = ?, error_codigo = ?, error_mensaje = ?,
         delivered_at = CASE WHEN ? = 'DELIVERED' THEN NOW() ELSE delivered_at END,
         read_at = CASE WHEN ? = 'READ' THEN NOW() ELSE read_at END
     WHERE meta_message_id = ?`,
    [status, errorCode, errorMessage, status, status, metaId]
  );
}
