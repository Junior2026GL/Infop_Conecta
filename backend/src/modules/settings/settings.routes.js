import { Router } from 'express';
import * as controller from './settings.controller.js';
import { requireRole } from '../../shared/middleware/auth.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.get('/costo-mensaje', controller.getCostoMensaje);
router.put('/costo-mensaje', requireRole(ROLES.SUPER_ADMIN), controller.setCostoMensaje);

router.get('/soporte', controller.getSoporte);
router.put('/soporte', requireRole(ROLES.SUPER_ADMIN), controller.setSoporte);

export default router;
