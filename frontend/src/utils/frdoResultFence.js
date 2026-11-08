// Same-origin, same-browser journal. This is not server idempotency.
export const FRDO_FENCE_PREFIX = "obrportal:frdo:result-pending:v1:";
const digest = async value => Array.from(new Uint8Array(await globalThis.crypto.subtle.digest(
  "SHA-256", new TextEncoder().encode(JSON.stringify(value))
))).map(byte => byte.toString(16).padStart(2, "0")).join("");
const normalized = item => [item.result_status, item.external_id ?? null, item.errors ?? item.errors_json ?? []];
export function createFrdoResultFence(options = {}) {
  const storage = () => options.storage ?? globalThis.localStorage;
  const key = id => FRDO_FENCE_PREFIX + id;
  function read(id) {
    try { const raw = storage().getItem(key(id)); return raw ? JSON.parse(raw) : null; }
    catch { return { blocked: true }; }
  }
  function write(id, record) {
    const raw = JSON.stringify(record);
    storage().setItem(key(id), raw);
    if (storage().getItem(key(id)) !== raw) throw new Error("Journal unavailable");
  }
  const api = {
    has: id => Boolean(read(id)),
    snapshot() {
      const entries = {};
      try {
        const store = storage();
        for (let i = 0; i < store.length; i++) {
          const name = store.key(i);
          if (name?.startsWith(FRDO_FENCE_PREFIX)) entries[name.slice(FRDO_FENCE_PREFIX.length)] = true;
        }
      } catch { /* begin fails closed when storage cannot be used */ }
      return entries;
    },
    async begin(id, items) {
      if (api.has(id) || !items.length) return false;
      const token = globalThis.crypto.randomUUID();
      try {
        // Reserve synchronously before hashing; a crash here remains blocked.
        write(id, { version: 1, token });
        const targets = await Promise.all(items.map(async item => ({ id: item.obligation_id, hash: await digest(normalized(item)) })));
        if (read(id)?.token !== token) return false;
        write(id, { version: 1, token, targets });
        return true;
      } catch { return false; }
    },
    async readback(id, detail) {
      const record = read(id);
      if (!record?.targets?.length || detail?.id !== id || detail.registry !== "frdo" || !Array.isArray(detail.items)) return false;
      try {
        for (const target of record.targets) {
          const matches = detail.items.filter(item => item.obligation_id === target.id);
          if (matches.length !== 1 || !matches[0].result_recorded_at || await digest(normalized(matches[0])) !== target.hash) return false;
        }
        if (read(id)?.token !== record.token) return false;
        storage().removeItem(key(id));
        return !api.has(id);
      } catch { return false; }
    },
  };
  return api;
}
