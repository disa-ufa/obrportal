import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

function readLearnerComponent(filename) {
  return readFileSync(new URL(`../src/components/learner/${filename}`, import.meta.url), "utf8");
}

test("completion panel enforces server readiness, replay safety and conflict recovery", () => {
  const source = readLearnerComponent("LearnerCourseCompletionPanel.jsx");
  const required = [
    "getAccountCompletionReadiness(enrollmentId)",
    "const ready = canFinalizeCourse(readiness);",
    "const canSubmit = ready && !checking && !readinessError && !completionError;",
    "if (!canSubmit || submitting.current) return;",
    "completeAccountCourse(enrollmentId)",
    'if (result?.status !== "completed") throw new Error("Unexpected completion status");',
    "onCompleted(result);",
    'error.status === 409 && detail?.code === "completion.profile_incomplete"',
    "setCompletionConflict(true);",
    "refreshReadiness();",
    'data-testid="learner-course-finalize-button"',
    "if (formDirty && !window.confirm(",
  ];
  for (const contract of required) {
    assert.ok(source.includes(contract), `Completion panel contract missing: ${contract}`);
  }
});

test("employment editor submits only changed fields and preserves failed edits", () => {
  const source = readLearnerComponent("LearnerCourseEmployment.jsx");
  const required = [
    "getAccountEnrollmentEmployment(enrollmentId)",
    "if (!details?.can_edit || saving || changed.length === 0) return;",
    "updateAccountEnrollmentEmployment(",
    "Object.fromEntries(changed.map(",
    "setDetails(saved);",
    "setForm(toForm(saved));",
    "onDirtyChange?.(hasChanges);",
    'setError(formatApiError(cause, "Не удалось сохранить сведения."));',
    "disabled={!details.can_edit || saving}",
    "onSaved();",
  ];
  for (const contract of required) {
    assert.ok(source.includes(contract), `Employment editor contract missing: ${contract}`);
  }
  assert.match(source, /catch \(cause\) \{\s*setError\(formatApiError\(cause, "Не удалось сохранить сведения\."\)\);\s*\} finally/);
});
