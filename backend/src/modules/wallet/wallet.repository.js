import { db } from '../../infrastructure/database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';

export async function ensureSaldo(usuarioId) {
  await db.query('INSERT IGNORE INTO saldos (usuario_id, saldo_actual) VALUES (?, 0)', [usuarioId]);
}

export async function getSaldo(usuarioId) {
  await ensureSaldo(usuarioId);
  const [rows] = await db.query('SELECT saldo_actual FROM saldos WHERE usuario_id = ?', [usuarioId]);
  return Number(rows[0]?.saldo_actual ?? 0);
}

export async function listSaldos() {
  const [rows] = await db.query(
    `SELECT u.id AS usuario_id, u.nombre, u.usuario, r.nombre AS rol,
            COALESCE(s.saldo_actual, 0) AS saldo_actual
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     LEFT JOIN saldos s ON s.usuario_id = u.id
     WHERE u.activo = 1
     ORDER BY u.nombre ASC`
  );
  return rows;
}

/**
 * Recarga y consumo de saldo se hacen dentro de una transacción con
 * SELECT ... FOR UPDATE: esto bloquea la fila de saldo de ese usuario hasta
 * que termine la operación, así que si dos envíos (o una recarga y un envío)
 * intentan tocar el mismo saldo al mismo tiempo, uno espera a que el otro
 * termine en vez de pisarse mutuamente. Antes cada operación era una
 * consulta suelta sin esta protección.
 */
export async function recharge({ usuarioId, monto, referencia, creadoPor }) {
  await ensureSaldo(usuarioId);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT saldo_actual FROM saldos WHERE usuario_id = ? FOR UPDATE',
      [usuarioId]
    );
    const saldoResultante = Number(rows[0].saldo_actual) + Number(monto);

    await conn.query('UPDATE saldos SET saldo_actual = ? WHERE usuario_id = ?', [saldoResultante, usuarioId]);
    await conn.query(
      `INSERT INTO movimientos_saldo (usuario_id, tipo, monto, saldo_resultante, referencia, creado_por)
       VALUES (?, 'RECARGA', ?, ?, ?, ?)`,
      [usuarioId, monto, saldoResultante, referencia || null, creadoPor || null]
    );

    await conn.commit();
    return saldoResultante;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function consume({ usuarioId, monto, campaniaId }) {
  await ensureSaldo(usuarioId);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT saldo_actual FROM saldos WHERE usuario_id = ? FOR UPDATE',
      [usuarioId]
    );
    const saldoActual = Number(rows[0].saldo_actual);
    const saldoResultante = saldoActual - Number(monto);

    if (saldoResultante < 0) {
      throw new AppError('Saldo insuficiente para completar este envío');
    }

    await conn.query('UPDATE saldos SET saldo_actual = ? WHERE usuario_id = ?', [saldoResultante, usuarioId]);
    await conn.query(
      `INSERT INTO movimientos_saldo (usuario_id, tipo, monto, saldo_resultante, campania_id)
       VALUES (?, 'CONSUMO', ?, ?, ?)`,
      [usuarioId, monto, saldoResultante, campaniaId || null]
    );

    await conn.commit();
    return saldoResultante;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function listMovimientos(usuarioId) {
  const [rows] = await db.query(
    `SELECT m.id, m.tipo, m.monto, m.saldo_resultante, m.referencia, m.campania_id, m.created_at,
            c.nombre AS campania_nombre, u.nombre AS creado_por_nombre
     FROM movimientos_saldo m
     LEFT JOIN campanias c ON c.id = m.campania_id
     LEFT JOIN usuarios u ON u.id = m.creado_por
     WHERE m.usuario_id = ?
     ORDER BY m.id DESC
     LIMIT 200`,
    [usuarioId]
  );
  return rows;
}
