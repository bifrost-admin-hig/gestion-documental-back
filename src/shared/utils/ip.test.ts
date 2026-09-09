import { describe, expect, it } from 'bun:test';
import { extractClientIp, normalizeIpAddress } from './ip';

describe('IP utils', () => {
  describe('normalizeIpAddress', () => {
    it('should normalize IPv6 localhost to IPv4 localhost', () => {
      expect(normalizeIpAddress('::1')).toBe('127.0.0.1');
    });

    it('should normalize IPv4 mapped IPv6', () => {
      expect(normalizeIpAddress('::ffff:191.114.74.92')).toBe('191.114.74.92');
    });

    it('should return default for empty values', () => {
      expect(normalizeIpAddress(undefined)).toBe('0.0.0.0');
      expect(normalizeIpAddress('')).toBe('0.0.0.0');
    });
  });

  describe('extractClientIp', () => {
    it('should prioritize x-forwarded-for and take first IP', () => {
      const req = {
        headers: {
          'x-forwarded-for': '191.114.74.92, 10.0.0.1',
        },
        socket: {
          remoteAddress: '::1',
        },
        ip: '::1',
      } as any;

      expect(extractClientIp(req)).toBe('191.114.74.92');
    });

    it('should fallback to remoteAddress and normalize localhost', () => {
      const req = {
        headers: {},
        socket: {
          remoteAddress: '::1',
        },
        ip: '::1',
      } as any;

      expect(extractClientIp(req)).toBe('127.0.0.1');
    });
  });
});
