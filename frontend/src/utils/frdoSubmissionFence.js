import { validBatchId } from "./registryBatchNavigation.js";
export const FRDO_SUBMISSION_PREFIX = "obrportal:frdo:submit-pending:v1:";
export const canConfirmFrdoSubmission = batch => batch?.registry === "frdo" && validBatchId(batch.id) && batch.status === "exported" && !batch.submitted_at && !batch.submitted_by_user_id;
export const confirmedFrdoSubmission = (id, detail) => validBatchId(id) && detail?.id === id && detail.registry === "frdo" && detail.status === "submitted" && typeof detail.submitted_at === "string" && Number.isFinite(Date.parse(detail.submitted_at)) && typeof detail.submitted_by_user_id === "string" && detail.submitted_by_user_id.trim().length > 0;
export function createFrdoSubmissionFence(options = {}) {
  const store = () => options.storage ?? globalThis.localStorage;
  const key = id => FRDO_SUBMISSION_PREFIX + id;
  function read(id) { try { const raw = store().getItem(key(id)); return raw ? JSON.parse(raw) : null; } catch { return { blocked: true }; } }
  const api = {
    has: id => Boolean(read(id)),
    snapshot() {
      const result = {};
      try { const s = store(); for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k?.startsWith(FRDO_SUBMISSION_PREFIX)) result[k.slice(FRDO_SUBMISSION_PREFIX.length)] = true; } } catch { /* begin fails closed */ }
      return result;
    },
    begin(batch) {
      if (!canConfirmFrdoSubmission(batch) || api.has(batch.id)) return false;
      try {
        const record = { version: 1, id: batch.id, token: globalThis.crypto.randomUUID() };
        const raw = JSON.stringify(record); store().setItem(key(batch.id), raw);
        return store().getItem(key(batch.id)) === raw;
      } catch { return false; }
    },
    readback(id, detail) {
      const record = read(id);
      if (record?.version !== 1 || record.id !== id || !validBatchId(record.token) || !confirmedFrdoSubmission(id, detail)) return false;
      try { if (read(id)?.token !== record.token) return false; store().removeItem(key(id)); return !api.has(id); } catch { return false; }
    },
  };
  return api;
}
