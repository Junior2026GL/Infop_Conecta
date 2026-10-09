import { Router } from 'express';
import * as controller from './webhooks.controller.js';

const router = Router();

router.get('/whatsapp', controller.verify);
router.post('/whatsapp', controller.receive);

export default router;
