import { env } from '../../config/env.js';
import { updateStatusByMetaId } from '../messages/messages.repository.js';

const statusMap = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

export function verifyWebhook({ mode, token, challenge }) {
  if (mode === 'subscribe' && token === env.meta.verifyToken) {
    return challenge;
  }
  return null;
}

export async function processWebhook(body) {
  const changes = body?.entry?.flatMap((entry) => entry.changes || []) || [];

  for (const change of changes) {
    const statuses = change?.value?.statuses || [];

    for (const item of statuses) {
      const normalizedStatus = statusMap[item.status] || String(item.status || '').toUpperCase();

      const firstError = item?.errors?.[0];
      await updateStatusByMetaId(
        item.id,
        normalizedStatus,
        firstError?.code ? String(firstError.code) : null,
        firstError?.message || firstError?.title || null
      );
    }
  }

  return true;
}
