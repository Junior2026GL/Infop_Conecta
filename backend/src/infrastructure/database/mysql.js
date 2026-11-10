import mysql from 'mysql2/promise';
import { env } from '../../config/env.js';

export const db = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// Todas las conexiones trabajan en hora de Honduras (UTC-6, sin horario de verano),
// para que NOW() y CURRENT_TIMESTAMP usen la hora local sin importar la zona del servidor.
db.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '-06:00'");
});
