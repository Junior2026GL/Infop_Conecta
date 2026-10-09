import { Router } from 'express';
import * as controller from './wallet.controller.js';
import { requireRole } from '../../shared/middleware/auth.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.get('/mi-saldo', controller.mySaldo);
router.get('/mis-movimientos', controller.misMovimientos);
router.get('/', requireRole(ROLES.SUPER_ADMIN), controller.list);
router.get('/:usuarioId/movimientos', requireRole(ROLES.SUPER_ADMIN), controller.movimientos);
router.post('/recargar', requireRole(ROLES.SUPER_ADMIN), controller.recharge);

export default router;
