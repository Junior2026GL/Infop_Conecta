import * as service from './templates.service.js';

export async function list(req, res, next) {
  try {
    res.json({ ok: true, data: await service.list() });
  } catch (error) {
    next(error);
  }
}
