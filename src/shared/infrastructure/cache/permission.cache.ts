type CacheEntry = { permissions: Set<string>; expiresAt: number };

export class PermissionCache {
  private ttlMs: number;
  private store = new Map<string, CacheEntry>();

  constructor(ttlSeconds = 60) {
    this.ttlMs = ttlSeconds * 1000;
  }

  get(userId: string): Set<string> | null {
    const entry = this.store.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(userId);
      return null;
    }
    return entry.permissions;
  }

  set(userId: string, permissions: Set<string>): void {
    this.store.set(userId, {
      permissions,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(userId?: string): void {
    if (userId) this.store.delete(userId);
    else this.store.clear();
  }
}
