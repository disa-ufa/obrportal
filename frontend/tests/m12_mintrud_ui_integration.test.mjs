import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyMintrudExportSelection,
  createMintrudBatchWithDefiniteRejection,
} from "../src/utils/mintrudWorkflow.js";
import {
  createMintrudBatchCreateJournal,
  withMintrudBatchCreateLock,
} from "../src/utils/mintrudBatchCreateJournal.js";

const id = "11111111-1111-4111-8111-111111111111";
const event = "22222222-2222-4222-8222-222222222222";
const nextEvent = "33333333-3333-4333-8333-333333333333";

const storage = () => {
  const map = new Map();
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: k => map.delete(k),
  };
};

const journal = store => createMintrudBatchCreateJournal({
  storage: store,
  randomUUID: () => "44444444-4444-4444-8444-444444444444",
});

const api = approval_event_id => ({
  getAdminMintrudExportStatus: async () => ({
    enabled: true, read_only: true,
  }),
  getAdminMintrudExportReadiness: async obligation_id => ({
    obligation_id, approval_event_id,
    batch_eligible: true, read_only: true,
    not_authorization_for_export: true,
  }),
});

test("readiness returns valid event", async () => {
  const result = await verifyMintrudExportSelection(
    api(event), [id], { requireApprovalEvents: true }
  );
  assert.equal(result.gate.enabled, true);
  assert.deepEqual(result.targets, [
    { obligation_id: id, approval_event_id: event },
  ]);
});

test("invalid events block before create", async () => {
  for (const value of [
    null, "not-uuid", "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA",
  ]) {
    await assert.rejects(verifyMintrudExportSelection(
      api(value), [id], { requireApprovalEvents: true }
    ));
  }
});

test("unknown outcome remains blocked after reload", async () => {
  const store = storage();
  const targets = [{ obligation_id: id, approval_event_id: event }];
  let posts = 0;

  await assert.rejects(createMintrudBatchWithDefiniteRejection({
    ids: [id], targets, journal: journal(store),
    create: async () => { posts++; throw Error("timeout"); },
  }));
  await assert.rejects(createMintrudBatchWithDefiniteRejection({
    ids: [id], targets, journal: journal(store),
    create: async () => { posts++; },
  }));
  assert.equal(posts, 1);
});

test("new approval is a new journal identity", async () => {
  const store = storage();
  let posts = 0;

  await assert.rejects(createMintrudBatchWithDefiniteRejection({
    ids: [id],
    targets: [{ obligation_id: id, approval_event_id: event }],
    journal: journal(store),
    create: async () => { posts++; throw Error("timeout"); },
  }));

  await createMintrudBatchWithDefiniteRejection({
    ids: [id],
    targets: [{ obligation_id: id, approval_event_id: nextEvent }],
    journal: journal(store),
    create: async () => { posts++; return { id: "batch" }; },
  });
  assert.equal(posts, 2);
});

test("definite prewrite rejection clears reservation", async () => {
  const store = storage();
  const targets = [{ obligation_id: id, approval_event_id: event }];

  await assert.rejects(createMintrudBatchWithDefiniteRejection({
    ids: [id], targets, journal: journal(store),
    create: async () => {
      throw {
        status: 422,
        payload: {
          detail: [
            { loc: ["body", "obligation_ids"], type: "missing" },
          ],
        },
      };
    },
  }));
  assert.equal(journal(store).has(targets), false);
});

test("browser exclusive lock wraps operation", async () => {
  let called = false;
  await withMintrudBatchCreateLock(
    async () => { called = true; },
    {
      locks: {
        request: async (name, options, callback) => {
          assert.equal(options.mode, "exclusive");
          assert.equal(options.ifAvailable, true);
          return callback({ name });
        },
      },
    },
  );
  assert.equal(called, true);
});
