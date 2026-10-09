import { db } from '../../infrastructure/database/mysql.js';

export async function listTemplates() {
  const [rows] = await db.query(
    `SELECT id, nombre, meta_template_name, categoria, idioma, contenido, variables,
            activo, created_at
     FROM plantillas_mensaje
     ORDER BY id DESC`
  );
  return rows;
}
