import { getStats } from './dashboard.repository.js';
import { ROLES } from '../../shared/constants/roles.js';

export async function stats(req, res, next) {
  try {
    // Un tutor (rol NORMAL) solo ve sus propios envíos, igual que en Campañas e Historial.
    const enviadoPor = req.user?.rol === ROLES.NORMAL ? req.user.sub : undefined;
    res.json({ ok: true, data: await getStats({ enviadoPor }) });
  } catch (error) {
    next(error);
  }
}
