import { Request } from 'express';

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.find(Boolean)?.trim();
  }
  return value.trim();
}

export function normalizeIpAddress(rawIp: string | undefined | null): string {
  const ip = rawIp?.trim();
  if (!ip) return '0.0.0.0';

  // Localhost in IPv6 format.
  if (ip === '::1') return '127.0.0.1';

  // IPv4 mapped in IPv6, e.g. ::ffff:192.168.1.10
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }

  // Remove zone index in local addresses, e.g. fe80::1%lo0
  const zoneIndex = ip.indexOf('%');
  if (zoneIndex > -1) {
    return ip.slice(0, zoneIndex);
  }

  return ip;
}

export function extractClientIp(req: Request): string {
  const forwardedFor = normalizeHeaderValue(req.headers['x-forwarded-for']);
  const realIp = normalizeHeaderValue(req.headers['x-real-ip']);

  const candidate = forwardedFor?.split(',')[0]?.trim() || realIp || req.socket.remoteAddress || req.ip;

  return normalizeIpAddress(candidate);
}
