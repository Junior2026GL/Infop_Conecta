import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import templatesRoutes from '../modules/templates/templates.routes.js';
import messagesRoutes from '../modules/messages/messages.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import webhookRoutes from '../modules/webhooks/webhooks.routes.js';
import campaignsRoutes from '../modules/campaigns/campaigns.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import walletRoutes from '../modules/wallet/wallet.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import * as authController from '../modules/auth/auth.controller.js';
import { authRequired } from '../shared/middleware/auth.middleware.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'INFOP Conecta API' });
});

router.use('/auth', authRoutes);
router.use('/webhooks', webhookRoutes);

router.use(authRequired);
router.get('/auth/me', authController.me);
router.put('/auth/password', authController.changePassword);
router.use('/templates', templatesRoutes);
router.use('/messages', messagesRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/settings', settingsRoutes);
router.use('/wallet', walletRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', usersRoutes);
router.use('/auditoria', auditRoutes);

export default router;
