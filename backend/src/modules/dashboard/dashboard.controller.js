import { getStats } from './dashboard.repository.js';

export async function stats(req, res, next) {
  try {
    res.json({ ok: true, data: await getStats() });
  } catch (error) {
    next(error);
  }
}
