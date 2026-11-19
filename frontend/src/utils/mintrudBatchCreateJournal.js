export const MINTRUD_CREATE_JOURNAL_PREFIX =
  "obrportal:mintrud:create-pending:v1:";

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const EVENT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function normalize(targets) {
  if (!Array.isArray(targets) || !targets.length) return null;

  const result = [];
  const seen = new Set();

  for (const target of targets) {
    const id = target?.obligation_id;
    const event = target?.approval_event_id;

    if (!UUID.test(id || "") || !EVENT_UUID.test(event || "") ||
        seen.has(id)) {
      return null;
    }

    seen.add(id);
    result.push({ obligation_id: id, approval_event_id: event });
  }

  return result;
}

const keyOf = target =>
  MINTRUD_CREATE_JOURNAL_PREFIX +
  target.obligation_id + ":" + target.approval_event_id;

export function validMintrudApprovalEventId(value) {
  return typeof value === "string" && EVENT_UUID.test(value);
}

export function createMintrudBatchCreateJournal(options = {}) {
  const getStorage = () => options.storage ?? globalThis.localStorage;
  const getToken = () =>
    options.randomUUID?.() ?? globalThis.crypto.randomUUID();

  return {
    has(targets) {
      const normalized = normalize(targets);
      if (!normalized) return true;

      try {
        const storage = getStorage();
        return normalized.some(target =>
          storage.getItem(keyOf(target)) !== null
        );
      } catch {
        return true;
      }
    },

    begin(targets) {
      const normalized = normalize(targets);
      if (!normalized) return null;

      try {
        const storage = getStorage();

        // Check every target before reserving any of them.
        if (normalized.some(target =>
          storage.getItem(keyOf(target)) !== null
        )) {
          return null;
        }

        const token = getToken();
        if (!EVENT_UUID.test(token)) return null;

        const reservation = {
          version: 1,
          token,
          targets: normalized,
        };

        // Persist synchronously BEFORE the network POST.
        // Partial write failures remain blocked; never auto-clean.
        for (const target of normalized) {
          const record = JSON.stringify({
            version: 1,
            token,
            ...target,
          });

          storage.setItem(keyOf(target), record);

          if (storage.getItem(keyOf(target)) !== record) {
            return null;
          }
        }

        return reservation;
      } catch {
        return null;
      }
    },

    releaseDefiniteRejection(reservation) {
      const normalized = normalize(reservation?.targets);

      if (reservation?.version !== 1 ||
          !EVENT_UUID.test(reservation.token || "") ||
          !normalized) {
        return false;
      }

      try {
        const storage = getStorage();

        // Never delete a reservation belonging to another attempt.
        for (const target of normalized) {
          const raw = storage.getItem(keyOf(target));
          if (!raw) return false;
          const record = JSON.parse(raw);

          if (record.version !== 1 ||
              record.token !== reservation.token ||
              record.obligation_id !== target.obligation_id ||
              record.approval_event_id !== target.approval_event_id) {
            return false;
          }
        }

        for (const target of normalized) {
          storage.removeItem(keyOf(target));
        }

        return normalized.every(target =>
          storage.getItem(keyOf(target)) === null
        );
      } catch {
        return false;
      }
    },
  };
}

// A browser-level lock serializes cooperating tabs for this origin.
// Never substitute a non-atomic localStorage check for an exclusive lock.
// Server-side transaction locks and uniqueness remain authoritative.
export async function withMintrudBatchCreateLock(callback, options = {}) {
  const locks = options.locks ?? globalThis.navigator?.locks;

  if (typeof locks?.request !== "function") {
    throw new Error("Безопасная блокировка вкладок недоступна. Создание XML запрещено.");
  }

  return locks.request(
    "obrportal:mintrud:batch-create:v1",
    { mode: "exclusive", ifAvailable: true },
    lock => {
      if (!lock) {
        throw new Error("Создание XML уже выполняется в другой вкладке.");
      }

      return callback();
    },
  );
}