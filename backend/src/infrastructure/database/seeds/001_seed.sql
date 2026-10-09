USE infop_conecta;

INSERT IGNORE INTO roles (id, nombre, descripcion) VALUES
(1, 'SUPER_ADMIN', 'Control total: usuarios, roles y configuración del sistema'),
(2, 'ADMIN', 'Gestiona cursos, participantes, plantillas y campañas'),
(3, 'NORMAL', 'Tutor virtual: gestiona únicamente sus propios cursos y envíos');

-- Usuario Super Admin inicial. Cambia la contraseña luego de tu primer ingreso.
-- Usuario: superadmin / Contraseña: InfopConecta2026*
-- Hash generado con: node scripts/hash-password.js "InfopConecta2026*"
INSERT IGNORE INTO usuarios (id, rol_id, nombre, usuario, email, password_hash, activo) VALUES
(1, 1, 'Super Administrador', 'superadmin', 'superadmin@infop.hn', '$2a$12$gygpXZ.UMRQWtSvQ5Rvo4uTeGdJwKO8WC.eeJV1jZ3F/m06pRjauG', 1);

-- Plantillas aprobadas por Meta (contenido de referencia visual; el envío real lo controla
-- la plantilla configurada en Meta usando "meta_template_name"). "variables" define el orden
-- exacto de los parámetros del componente body en WhatsApp y si el valor viene del Excel
-- ("participante") o lo escribe el usuario al enviar ("fijo").
INSERT IGNORE INTO plantillas_mensaje
  (id, nombre, meta_template_name, categoria, idioma, contenido, variables, activo) VALUES
(1, 'Recordatorio de curso', 'recordatorio_nota_curso', 'UTILITY', 'es_HN',
 '*Recordatorio de curso*\nHola {{1}}, le informamos que su nota actual en el curso {{2}} es de {{3}}%.\n\nEl curso finaliza el {{4}}. Le recomendamos revisar sus actividades pendientes en la plataforma para completar el proceso de formación correspondiente.\n\nGracias.\nINFOP VIRTUAL',
 '[{"key":"nombre","origen":"participante","etiqueta":"Nombre"},{"key":"curso","origen":"fijo","etiqueta":"Curso"},{"key":"nota","origen":"participante","etiqueta":"Nota"},{"key":"fecha_fin","origen":"fijo","etiqueta":"Fecha de finalización"}]',
 1),
(2, 'Información del curso', 'notificacion_inicio_curso', 'UTILITY', 'es_HN',
 '*Información del curso*\nHola {{1}}, le informamos que ha sido matriculado(a) en el curso {{2}}.\n\n📅 El curso estará disponible del {{3}} al {{4}}.\n\n💻 Puede ingresar a la plataforma para revisar los contenidos, actividades y avisos del curso:\n👉 https://plataformavirtual.infop.hn/login/index.php\n\n📱 Grupo informativo del curso:\n👉 {{5}}\n\nPara consultas, puede comunicarse al correo {{6}} o al WhatsApp {{7}}.\n\nGracias.\nINFOP VIRTUAL- Notificación automática',
 '[{"key":"nombre","origen":"participante","etiqueta":"Nombre"},{"key":"curso","origen":"fijo","etiqueta":"Curso"},{"key":"fecha_inicio","origen":"fijo","etiqueta":"Fecha de inicio"},{"key":"fecha_fin","origen":"fijo","etiqueta":"Fecha de finalización"},{"key":"enlace_grupo","origen":"fijo","etiqueta":"Enlace del grupo"},{"key":"correo_consultas","origen":"fijo","etiqueta":"Correo de consultas"},{"key":"whatsapp_consultas","origen":"fijo","etiqueta":"WhatsApp de consultas"}]',
 1);

-- Costo de referencia por mensaje enviado (en Lempiras). Ajustable desde el módulo de Costos.
INSERT IGNORE INTO configuracion (clave, valor) VALUES ('costo_mensaje', '1.25');
