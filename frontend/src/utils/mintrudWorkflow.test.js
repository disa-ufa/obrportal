import assert from "node:assert/strict";
import test from "node:test";
import { formatMintrudError, prepareAndDownloadMintrudBatch } from "./mintrudWorkflow.js";

for (const [message, expected] of [
  ["missing_snapshot", "снимок"], ["missing_fingerprint", "контрольная сумма"],
  ["Registry approval is stale", "Повторно утвердить"], ["XSD validation failed: private-canary", "ЕИСОТ 1.0.9"],
  ["artifact file is missing", "История сохранена"], ["checksum mismatch", "Скачивание остановлено"],
  ["storage is unavailable", "из истории"], ["Failed to fetch", "из истории"],
]) {
  test(`operator message: ${message}`, () => {
    const result = formatMintrudError({ payload: { detail: message } });
    assert.ok(result.includes(expected));
    assert.ok(!result.includes("private-canary"));
  });
}
test("unknown errors and readiness data never expose raw values", () => {
  assert.ok(!formatMintrudError(new Error("private-canary")).includes("private-canary"));
  const error = { payload: { detail: { issues: [{ code: "unknown", message: "private-canary" }] } } };
  assert.ok(!formatMintrudError(error).includes("private-canary"));
});
test("known readiness issue explains missing program", () => {
  const error = { payload: { detail: { issues: [{ code: "mintrud.learn_program_missing" }] } } };
  assert.equal(formatMintrudError(error, { "mintrud.learn_program_missing": "Выберите программу" }), "Выберите программу");
});
test("successful create followed by failed download still updates history and clears selection", async () => {
  const calls = [];
  await assert.rejects(prepareAndDownloadMintrudBatch({
    ids: ["synthetic"], create: async () => { calls.push("create"); return { id: "batch" }; },
    download: async (id) => { assert.equal(id, "batch"); calls.push("download"); throw new Error("download"); },
    reload: async () => { calls.push("history"); }, clearSelection: () => { calls.push("clear"); },
  }), /download/);
  assert.deepEqual(calls, ["create", "clear", "download", "history"]);
});
test("failed create never attempts a download or clears selection", async () => {
  await assert.rejects(prepareAndDownloadMintrudBatch({
    ids: [], create: async () => { throw new Error("stale"); },
    download: assert.fail, reload: assert.fail, clearSelection: assert.fail,
  }), /stale/);
});
