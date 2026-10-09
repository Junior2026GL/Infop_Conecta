import { Router } from 'express';
import * as controller from './messages.controller.js';

const router = Router();

router.get('/', controller.list);
router.post('/template', controller.sendTemplate);
router.post('/text', controller.sendText);

export default router;
