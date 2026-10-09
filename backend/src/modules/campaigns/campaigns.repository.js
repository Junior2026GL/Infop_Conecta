import { db } from '../../infrastructure/database/mysql.js';

export async function createCampaign({ plantillaId, nombre, curso, valoresFijos, totalRegistros, costoUnitario, creadoPor }) {
  const [result] = await db.query(
    `INSERT INTO campanias (plantilla_id, nombre, curso, valores_fijos, total_registros, costo_unitario, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [plantillaId, nombre, curso, JSON.stringify(valoresFijos || {}), totalRegistros, costoUnitario || 0, creadoPor || null]
  );
  return result.insertId;
}

export async function insertDestinatarios(campaniaId, destinatarios) {
  if (!destinatarios.length) return;

  const values = destinatarios.map((d) => [
    campaniaId,
    d.nombre,
    d.telefono || '',
    d.nota || null,
    d.estado,
    d.error_mensaje || null,
  ]);

  await db.query(
    `INSERT INTO campania_destinatarios (campania_id, nombre, telefono, nota, estado, error_mensaje)
     VALUES ?`,
    [values]
  );
}

export async function findCampaignById(id) {
  const [rows] = await db.query(
    `SELECT c.*, p.nombre AS plantilla_nombre, p.meta_template_name, p.idioma, p.variables
     FROM campanias c
     JOIN plantillas_mensaje p ON p.id = c.plantilla_id
     WHERE c.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function listCampaigns({ creadoPor } = {}) {
  const where = creadoPor ? 'WHERE c.creado_por = ?' : '';
  const params = creadoPor ? [creadoPor] : [];

  const [rows] = await db.query(
    `SELECT c.id, c.nombre, c.curso, c.estado, c.total_registros, c.enviados, c.fallidos,
            c.costo_unitario, (c.enviados * c.costo_unitario) AS costo_total,
            p.nombre AS plantilla_nombre, c.created_at,
            COALESCE(cd.pendientes, 0) AS pendientes,
            (
              c.estado = 'BORRADOR'
              AND COALESCE(cd.pendientes, 0) * c.costo_unitario > COALESCE(s.saldo_actual, 0)
            ) AS saldo_insuficiente
     FROM campanias c
     JOIN plantillas_mensaje p ON p.id = c.plantilla_id
     LEFT JOIN (
       SELECT campania_id, COUNT(*) pendientes
       FROM campania_destinatarios
       WHERE estado = 'PENDIENTE'
       GROUP BY campania_id
     ) cd ON cd.campania_id = c.id
     LEFT JOIN saldos s ON s.usuario_id = c.creado_por
     ${where}
     ORDER BY c.id DESC`,
    params
  );
  return rows.map((row) => ({ ...row, saldo_insuficiente: Boolean(row.saldo_insuficiente) }));
}

export async function reportPorUsuario() {
  const [rows] = await db.query(
    `SELECT u.id AS usuario_id, u.nombre AS usuario_nombre, u.usuario AS usuario_login,
            r.nombre AS rol,
            COUNT(c.id) AS total_campanias,
            COALESCE(SUM(c.enviados), 0) AS total_enviados,
            COALESCE(SUM(c.fallidos), 0) AS total_fallidos,
            COALESCE(SUM(c.enviados * c.costo_unitario), 0) AS costo_total
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     LEFT JOIN campanias c ON c.creado_por = u.id
     GROUP BY u.id, u.nombre, u.usuario, r.nombre
     ORDER BY costo_total DESC`
  );
  return rows;
}

export async function listDestinatarios(campaniaId) {
  const [rows] = await db.query(
    `SELECT id, nombre, telefono, nota, estado, error_mensaje, mensaje_id
     FROM campania_destinatarios
     WHERE campania_id = ?
     ORDER BY id ASC`,
    [campaniaId]
  );
  return rows;
}

export async function listDestinatariosPendientes(campaniaId) {
  const [rows] = await db.query(
    `SELECT id, nombre, telefono, nota
     FROM campania_destinatarios
     WHERE campania_id = ? AND estado = 'PENDIENTE'
     ORDER BY id ASC`,
    [campaniaId]
  );
  return rows;
}

export async function updateCampaignEstado(id, estado) {
  await db.query('UPDATE campanias SET estado = ? WHERE id = ?', [estado, id]);
}

/**
 * Marca la campaña como ENVIANDO solo si sigue en BORRADOR, en una única
 * operación atómica. Evita que dos peticiones simultáneas (doble clic, dos
 * pestañas) inicien el mismo envío dos veces. Devuelve true si esta llamada
 * "ganó" la carrera y puede proceder a enviar.
 */
export async function markAsSending(id) {
  const [result] = await db.query(
    `UPDATE campanias SET estado = 'ENVIANDO' WHERE id = ? AND estado = 'BORRADOR'`,
    [id]
  );
  return result.affectedRows > 0;
}

/**
 * Indica si otro destinatario de la misma campaña ya usa ese teléfono y va a
 * recibir (o ya recibió) el mensaje. Evita enviar y cobrar dos veces al mismo número.
 */
export async function phoneInUse(campaniaId, telefono, excludeId = 0) {
  const [rows] = await db.query(
    `SELECT 1 FROM campania_destinatarios
     WHERE campania_id = ? AND telefono = ? AND estado IN ('PENDIENTE', 'ENVIADO') AND id <> ?
     LIMIT 1`,
    [campaniaId, telefono, excludeId]
  );
  return rows.length > 0;
}

/**
 * Reabre una campaña FINALIZADA como BORRADOR en una sola operación atómica,
 * para poder reenviar los mensajes que fallaron o quedaron pendientes.
 */
export async function reopenCampaign(id) {
  const [result] = await db.query(
    `UPDATE campanias SET estado = 'BORRADOR' WHERE id = ? AND estado = 'FINALIZADA'`,
    [id]
  );
  return result.affectedRows > 0;
}

export async function listDestinatariosFallidos(campaniaId) {
  const [rows] = await db.query(
    `SELECT id, nombre, telefono, nota
     FROM campania_destinatarios
     WHERE campania_id = ? AND estado = 'FALLIDO'
     ORDER BY id ASC`,
    [campaniaId]
  );
  return rows;
}

export async function decrementFallidos(id, cantidad = 1) {
  await db.query(
    'UPDATE campanias SET fallidos = GREATEST(fallidos - ?, 0) WHERE id = ?',
    [cantidad, id]
  );
}

export async function findDestinatarioById(id) {
  const [rows] = await db.query(
    `SELECT id, campania_id, estado FROM campania_destinatarios WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function deleteDestinatario(id) {
  await db.query('DELETE FROM campania_destinatarios WHERE id = ?', [id]);
}

export async function decrementTotalRegistros(campaniaId, cantidad = 1) {
  await db.query(
    'UPDATE campanias SET total_registros = GREATEST(total_registros - ?, 0) WHERE id = ?',
    [cantidad, campaniaId]
  );
}

export async function incrementTotalRegistros(campaniaId, cantidad = 1) {
  await db.query(
    'UPDATE campanias SET total_registros = total_registros + ? WHERE id = ?',
    [cantidad, campaniaId]
  );
}

export async function insertDestinatario(campaniaId, d) {
  const [result] = await db.query(
    `INSERT INTO campania_destinatarios (campania_id, nombre, telefono, nota, estado, error_mensaje)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [campaniaId, d.nombre, d.telefono || '', d.nota || null, d.estado, d.error_mensaje || null]
  );
  return result.insertId;
}

export async function updateDestinatarioDatos(id, { nombre, telefono, nota, estado, errorMensaje }) {
  await db.query(
    'UPDATE campania_destinatarios SET nombre = ?, telefono = ?, nota = ?, estado = ?, error_mensaje = ? WHERE id = ?',
    [nombre, telefono || '', nota || null, estado, errorMensaje || null, id]
  );
}

export async function updateDestinatario(id, { estado, mensajeId, errorMensaje }) {
  await db.query(
    'UPDATE campania_destinatarios SET estado = ?, mensaje_id = ?, error_mensaje = ? WHERE id = ?',
    [estado, mensajeId || null, errorMensaje || null, id]
  );
}

export async function incrementCounters(id, { enviados = 0, fallidos = 0 }) {
  await db.query(
    'UPDATE campanias SET enviados = enviados + ?, fallidos = fallidos + ? WHERE id = ?',
    [enviados, fallidos, id]
  );
}
