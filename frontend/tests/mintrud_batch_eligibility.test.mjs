import test from "node:test";
import assert from "node:assert/strict";
import { mintrudBatchEligibilityResult as eligibility } from "../src/utils/mintrudBatchEligibility.js";

const id = "11111111-1111-4111-8111-111111111111";
const event = "22222222-2222-4222-8222-222222222222";
const base = {
  obligation_id: id,
  approval_event_id: event,
  batch_eligible: true,
  read_only: true,
  not_authorization_for_export: true,
};

function inspect(review, extra = {}) {
  return eligibility({ obligationId: id, review, ...extra });
}

test("server-verified approval event is selectable but only with all response fences", () => {
  assert.equal(inspect(base).approvalEventId, event);
  for (const candidate of [
    { ...base, obligation_id: "different" },
    { ...base, read_only: false },
    { ...base, not_authorization_for_export: false },
    { ...base, approval_event_id: null },
    { ...base, approval_event_id: "invalid" },
  ]) {
    assert.equal(inspect(candidate).approvalEventId, null);
  }
});

test("historical approved without applicability stays blocked with actionable message", () => {
  const result = inspect({
    ...base, batch_eligible: false,
    approval_event_id: null,
    block_reason: "registry.applicability_missing",
  });
  assert.equal(result.approvalEventId, null);
  assert.equal(result.reasonCode, "registry.applicability_missing");
  assert.match(result.reason, /контролируемая сверка/);
  assert.match(result.reason, /повторное утверждение проблему не устранит/);
});

test("already exported or uncertain history never unlocks checkbox", () => {
  for (const code of [
    "registry.approval_already_exported",
    "registry.approval_history_unverified",
  ]) {
    const result = inspect({
      ...base, batch_eligible: false,
      approval_event_id: null,
      block_reason: code,
    });
    assert.equal(result.approvalEventId, null);
    assert.ok(result.reason);
  }
});

test("401, 403 and unavailable readiness are explained without granting access", () => {
  for (const [status, phrase] of [[401, /Войдите повторно/], [403, /Нет права/], [503, /не выполнена/]]) {
    const result = eligibility({ obligationId: id, error: { status } });
    assert.equal(result.approvalEventId, null);
    assert.match(result.reason, phrase);
  }
});

test("missing XML data yields specific actionable reason when known", () => {
  const result = inspect({
    ...base, batch_eligible: false,
    block_reason: "mintrud.data_not_ready",
    issue_codes: ["mintrud.protocol_number_missing"],
  }, { issueLabels: { "mintrud.protocol_number_missing": "Укажите номер протокола." } });
  assert.equal(result.approvalEventId, null);
  assert.equal(result.reason, "Укажите номер протокола.");
});

test("unknown error, missing response and mismatched data fail closed", () => {
  for (const candidate of [null, undefined, { batch_eligible: true }, {
    ...base, batch_eligible: false, block_reason: "unknown.reason"
  }]) {
    const result = inspect(candidate);
    assert.equal(result.approvalEventId, null);
    assert.ok(result.reason);
  }
});
