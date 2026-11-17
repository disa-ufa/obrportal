import assert from "node:assert/strict";
import { test } from "node:test";

import { canFinalizeCourse, describeCompletionIssues, needsCourseFinalization } from "../src/utils/courseCompletion.js";

const ready = {
  is_ready: true, status: "ready", missing_fields: [], invalid_fields: [],
  requires_administrator_action: false, policy_unresolved: false,
};

test("finalization uses active enrollment status and the server's effective lesson counts", () => {
  const course = { status: "active", required_lessons_total: 2, required_lessons_completed: 2 };
  assert.equal(needsCourseFinalization(course), true);
  assert.equal(needsCourseFinalization({ ...course, required_lessons_completed: 1, required_progress_percent: 100 }), false);
  assert.equal(needsCourseFinalization({ ...course, status: "completed" }), false);
  assert.equal(needsCourseFinalization({ status: "active" }), false);
});

test("the completion action fails closed until all readiness facts are confirmed", () => {
  assert.equal(canFinalizeCourse(ready), true);
  for (const difference of [
    { is_ready: false }, { status: "already_completed" }, { missing_fields: [{}] }, { invalid_fields: [{}] },
    { policy_unresolved: true }, { requires_administrator_action: true }, { missing_fields: null },
  ]) {
    assert.equal(canFinalizeCourse({ ...ready, ...difference }), false);
  }
  assert.equal(canFinalizeCourse(null), false);
});

test("diagnostics link only editable fields and never copy API message values", () => {
  const issues = describeCompletionIssues({
    missing_fields: [
      { field: "learner_profile.middle_name", resolvable_by: "learner" },
      { field: "employer.reporting_scenario", resolvable_by: "administrator" },
    ],
    invalid_fields: [
      { field: "employer.employer_inn", resolvable_by: "learner", message: "PRIVATE_FIXTURE_VALUE" },
      { field: "learner_profile.unknown", resolvable_by: "learner" },
    ],
  });
  assert.deepEqual(issues.map(({ label, section }) => [label, section]), [
    ["Отчество", "profile"], ["Сценарий обучения для Минтруда", null],
    ["ИНН работодателя", "employment"], ["Сведения для оформления", null],
  ]);
  assert.match(issues[0].instruction, /отметьте его отсутствие/);
  assert.match(issues[2].instruction, /исправьте/);
  assert.doesNotMatch(JSON.stringify(issues), /PRIVATE_FIXTURE_VALUE/);
});
