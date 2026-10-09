import { db } from '../../infrastructure/database/mysql.js';

export async function getSetting(clave) {
  const [rows] = await db.query('SELECT valor FROM configuracion WHERE clave = ? LIMIT 1', [clave]);
  return rows[0]?.valor ?? null;
}

export async function getSettingMeta(clave) {
  const [rows] = await db.query(
    'SELECT valor, updated_at FROM configuracion WHERE clave = ? LIMIT 1',
    [clave]
  );
  return rows[0] || null;
}

export async function setSetting(clave, valor) {
  await db.query(
    `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
    [clave, valor]
  );
}
