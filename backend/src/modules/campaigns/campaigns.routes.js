import { Router } from 'express';
import multer from 'multer';
import * as controller from './campaigns.controller.js';
import { requireRole } from '../../shared/middleware/auth.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.get('/', controller.list);
router.get('/reportes/usuarios', requireRole(ROLES.SUPER_ADMIN), controller.reportUsuarios);
router.get('/:id', controller.getById);
router.post('/importar', upload.single('archivo'), controller.importFile);
router.post('/:id/destinatarios', controller.addDestinatario);
router.put('/:id/destinatarios/:destinatarioId', controller.updateDestinatario);
router.delete('/:id/destinatarios/:destinatarioId', controller.removeDestinatario);
router.post('/:id/enviar', controller.send);
router.post('/:id/reintentar', controller.retryFailed);

export default router;
