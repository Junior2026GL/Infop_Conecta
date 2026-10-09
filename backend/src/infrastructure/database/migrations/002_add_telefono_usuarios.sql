USE infop_conecta;

ALTER TABLE usuarios
  ADD COLUMN telefono VARCHAR(30) NULL AFTER email;
