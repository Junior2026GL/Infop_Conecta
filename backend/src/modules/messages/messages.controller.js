import * as service from './messages.service.js';

export async function list(req, res, next) {
  try {
    res.json({ ok: true, data: await service.list(req.user, req.query) });
  } catch (error) {
    next(error);
  }
}

export async function sendTemplate(req, res, next) {
  try {
    const data = await service.sendTemplate(req.body, req.user?.sub);
    res.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function sendText(req, res, next) {
  try {
    const data = await service.sendText(req.body, req.user?.sub);
    res.status(201).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}
