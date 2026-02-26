// src/utils/cache.js
export class SimpleCache {
  constructor(ttlMs = 120_000) { // 2 minutes default
    this.ttl = ttlMs;
    this.store = new Map(); // key → { value, expires }
  }

  _now() { return Date.now(); }

  set(key, value) {
    this.store.set(key, { value, expires: this._now() + this.ttl });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires < this._now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  delete(key) { this.store.delete(key); }
}
