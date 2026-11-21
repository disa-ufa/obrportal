import test from "node:test";
import assert from "node:assert/strict";
import {
  registryLearnerProfileSaveError as message,
  registryProfileMayAffectApprovals as impacts,
} from "../src/utils/registryLearnerProfileSave.js";

test("known SNILS conflict tells operator to reconcile, never replace with random data", () => {
  const result = message({
    status: 409,
    payload: { detail: "Learner profile with this SNILS already exists" },
  });
  assert.match(result, /СНИЛС/);
  assert.match(result, /другим профилем/);
  assert.match(result, /Не подставляйте случайный СНИЛС/);
});

test("unknown 409 does not falsely classify it as SNILS conflict", () => {
  const result = message({ status: 409, payload: { detail: "Another constraint failed" } });
  assert.doesNotMatch(result, /уже закреплён/);
  assert.match(result, /конфликт сохранения/);
});

test("validation, authentication and permission failures produce actionable messages", () => {
  assert.match(message({ status: 422 }), /контрольную сумму/);
  assert.match(message({ status: 401 }), /Войдите повторно/);
  assert.match(message({ status: 403 }), /Нет прав/);
  assert.match(message({ status: 503 }), /соединение/);
});

test("malformed server detail never leaks a sensitive error message to the UI", () => {
  const secret = "profile owner internal email secret@example.invalid";
  const result = message({ status: 500, payload: { detail: secret }, message: secret });
  assert.doesNotMatch(result, /secret@example.invalid/);
});

test("approved identity inputs receive a warning, unrelated profile properties do not", () => {
  for (const field of [
    "last_name", "first_name", "middle_name", "birth_date", "sex",
    "citizenship_country_code", "snils",
  ]) {
    assert.equal(impacts({ [field]: "changed" }), true, field);
  }
  assert.equal(impacts({ phone: "changed", notes: "changed" }), false);
  assert.equal(impacts({}), false);
});

test("helper uses only own keys, not inherited values", () => {
  assert.equal(impacts(Object.create({ snils: "malicious" })), false);
});
