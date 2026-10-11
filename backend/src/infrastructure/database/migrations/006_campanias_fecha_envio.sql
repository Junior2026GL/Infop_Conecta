USE infop_conecta;

ALTER TABLE campanias
  ADD COLUMN fecha_envio DATETIME NULL AFTER fallidos;

-- Campañas ya finalizadas: se usa la fecha de creación como aproximación.
UPDATE campanias SET fecha_envio = created_at WHERE id > 0 AND estado = 'FINALIZADA' AND fecha_envio IS NULL;
