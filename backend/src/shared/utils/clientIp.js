import net from 'node:net';

function limpiar(valor) {
  if (!valor) return null;
  let ip = String(valor).trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7); // IPv4 mapeada en IPv6
  // Quita el puerto de "1.2.3.4:5678"
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) ip = ip.split(':')[0];
  return net.isIP(ip) ? ip : null;
}

function esPrivada(ip) {
  return (
    /^(10\.|127\.|192\.168\.|169\.254\.)/.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip === '::1' ||
    /^f[cd][0-9a-f]{2}:/i.test(ip) ||
    /^fe80:/i.test(ip)
  );
}

/**
 * IP real del cliente aunque el backend esté detrás de CDN / balanceadores / proxies.
 * Orden: CF-Connecting-IP (Cloudflare) -> True-Client-IP -> X-Real-IP ->
 * primera IP pública de X-Forwarded-For -> IP de la conexión.
 */
export function getClientIp(req) {
  const h = req.headers || {};

  for (const nombre of ['cf-connecting-ip', 'true-client-ip', 'x-real-ip']) {
    const ip = limpiar(h[nombre]);
    if (ip && !esPrivada(ip)) return ip;
  }

  const xff = String(h['x-forwarded-for'] || '')
    .split(',')
    .map(limpiar)
    .filter(Boolean);
  const publica = xff.find((ip) => !esPrivada(ip));
  if (publica) return publica;
  if (xff.length) return xff[0];

  return limpiar(req.ip) || limpiar(req.socket?.remoteAddress) || null;
}
