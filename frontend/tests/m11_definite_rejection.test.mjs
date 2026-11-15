import assert from "node:assert/strict";
import test from "node:test";
import {
  isDefiniteMintrudPrewriteRejection as classify,
  createMintrudBatchWithDefiniteRejection as create,
  prepareAndDownloadMintrudBatch,
} from "../src/utils/mintrudWorkflow.js";

const failure = (status, detail) => ({
  status,
  payload: { detail },
});

test("strict prewrite response classification", () => {
  assert.equal(classify(failure(422, [
    { loc: ["body", "obligation_ids"], type: "missing" },
  ])), true);
  assert.equal(classify(failure(403,
    "Permission required: mintrud.export")), true);
  assert.equal(classify(failure(409, {
    code: "registry.batch_export.disabled",
  })), true);
});

test("unknown responses never qualify as definite", () => {
  for (const error of [
    failure(409, "Registry approval validation failed"),
    failure(409, { code: "other" }),
    failure(422, "unknown"),
    failure(422, [{ loc: ["query"], type: "missing" }]),
    failure(403, "other"),
    failure(500, "failed"),
    failure(503, "unavailable"),
    { message: "Failed to fetch" },
    null,
  ]) {
    assert.equal(classify(error), false);
  }
});

test("definite prewrite refusal permits a later manual retry", async () => {
  const attemptedIds = new Set();
  const ids = ["synthetic-obligation"];
  let calls = 0;

  await assert.rejects(
    create({
      ids, attemptedIds,
      create: async () => {
        calls++;
        throw failure(422, [
          { loc: ["body", "obligation_ids"], type: "missing" },
        ]);
      },
    }),
  );

  assert.equal(attemptedIds.size, 0);

  const batch = await create({
    ids, attemptedIds,
    create: async () => {
      calls++;
      return { id: "synthetic-batch" };
    },
  });

  assert.equal(batch.id, "synthetic-batch");
  assert.equal(calls, 2);
  assert.equal(attemptedIds.has(ids[0]), true);
});

test("unknown outcome never triggers another POST", async () => {
  const attemptedIds = new Set();
  let calls = 0;
  const createPost = async () => {
    calls++;
    throw failure(503, "unknown");
  };

  await assert.rejects(create({
    ids: ["o1"],
    attemptedIds,
    create: createPost,
  }));

  await assert.rejects(create({
    ids: ["o1"],
    attemptedIds,
    create: createPost,
  }));

  assert.equal(calls, 1);
  assert.equal(attemptedIds.has("o1"), true);
});

test("successful creation remains reserved", async () => {
  const attemptedIds = new Set();
  let calls = 0;

  await create({
    ids: ["o2"],
    attemptedIds,
    create: async () => {
      calls++;
      return { id: "batch" };
    },
  });

  await assert.rejects(create({
    ids: ["o2"],
    attemptedIds,
    create: async () => {
      calls++;
      return { id: "duplicate" };
    },
  }));

  assert.equal(calls, 1);
});

test("failed download after successful create cannot cause new POST", async () => {
  const attemptedIds = new Set();
  let creates = 0;
  let reloads = 0;

  await assert.rejects(prepareAndDownloadMintrudBatch({
    ids: ["o3"],
    create: ids => create({
      ids,
      attemptedIds,
      create: async () => {
        creates++;
        return { id: "created-batch" };
      },
    }),
    download: async () => {
      throw Error("download failed");
    },
    reload: async () => {
      reloads++;
    },
    clearSelection: () => {},
  }));

  assert.equal(creates, 1);
  assert.equal(reloads, 1);
  assert.equal(attemptedIds.has("o3"), true);
});

test("duplicate selection is rejected before POST", async () => {
  let calls = 0;
  await assert.rejects(create({
    ids: ["o4", "o4"],
    attemptedIds: new Set(),
    create: async () => {
      calls++;
    },
  }));
  assert.equal(calls, 0);
});
