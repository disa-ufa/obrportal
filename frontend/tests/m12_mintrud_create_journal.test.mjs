import test from "node:test";
import assert from "node:assert/strict";
import {
  createMintrudBatchCreateJournal,
  MINTRUD_CREATE_JOURNAL_PREFIX,
  withMintrudBatchCreateLock,
} from "../src/utils/mintrudBatchCreateJournal.js";

const obligation = "11111111-1111-4111-8111-111111111111";
const event1 = "22222222-2222-4222-8222-222222222222";
const event2 = "33333333-3333-4333-8333-333333333333";
const journalFixtureIdentity = "44444444-4444-4444-8444-444444444444";

const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
};

const target = event => [{
  obligation_id: obligation,
  approval_event_id: event,
}];

const journal = storage =>
  createMintrudBatchCreateJournal({
    storage,
    randomUUID: () => journalFixtureIdentity,
  });

test("journal survives new instance and blocks the same approval event", () => {
  const storage = memoryStorage();
  const first = journal(storage);

  assert.ok(first.begin(target(event1)));
  assert.equal(journal(storage).has(target(event1)), true);
  assert.equal(journal(storage).begin(target(event1)), null);
  assert.equal(storage.getItem(
    MINTRUD_CREATE_JOURNAL_PREFIX + obligation + ":" + event1
  ) !== null, true);
});

test("a different lawful approval event has a separate identity", () => {
  const storage = memoryStorage();
  const first = journal(storage);

  assert.ok(first.begin(target(event1)));
  assert.equal(first.has(target(event2)), false);
  assert.ok(first.begin(target(event2)));
  assert.equal(first.has(target(event1)), true);
});

test("only matching reservation can be released", () => {
  const storage = memoryStorage();
  const first = journal(storage);
  const reservation = first.begin(target(event1));

  assert.ok(reservation);
  assert.equal(first.releaseDefiniteRejection({
    ...reservation,
    token: event2,
  }), false);

  assert.equal(first.has(target(event1)), true);
  assert.equal(first.releaseDefiniteRejection(reservation), true);
  assert.equal(first.has(target(event1)), false);
});

test("corrupted or inaccessible storage fails closed", () => {
  const storage = memoryStorage();
  storage.setItem(
    MINTRUD_CREATE_JOURNAL_PREFIX + obligation + ":" + event1,
    "{broken",
  );

  assert.equal(journal(storage).has(target(event1)), true);
  assert.equal(journal(storage).begin(target(event1)), null);

  const denied = {
    getItem() { throw Error("denied"); },
  };

  assert.equal(journal(denied).begin(target(event1)), null);
  assert.equal(journal(denied).has(target(event1)), true);
});

test("invalid identity and duplicate obligation are rejected", () => {
  const first = journal(memoryStorage());

  assert.equal(first.begin(target("invalid")), null);
  assert.equal(first.begin([...target(event1), ...target(event2)]), null);
  assert.equal(first.begin([]), null);
});

test("an unavailable browser lock refuses the operation", async () => {
  await assert.rejects(
    withMintrudBatchCreateLock(async () => true, { locks: {} })
  );
});

test("exclusive browser lock executes one allowed callback", async () => {
  let calls = 0;
  const locks = {
    request: async (name, options, callback) => {
      assert.equal(name, "obrportal:mintrud:batch-create:v1");
      assert.equal(options.ifAvailable, true);
      return callback({ name });
    },
  };

  assert.equal(
    await withMintrudBatchCreateLock(async () => {
      calls++;
      return "created";
    }, { locks }),
    "created"
  );

  assert.equal(calls, 1);
});

test("busy cross-tab lock fails before invoking callback", async () => {
  let calls = 0;
  const locks = {
    request: async (name, options, callback) => callback(null),
  };

  await assert.rejects(
    withMintrudBatchCreateLock(async () => {
      calls++;
    }, { locks })
  );

  assert.equal(calls, 0);
});