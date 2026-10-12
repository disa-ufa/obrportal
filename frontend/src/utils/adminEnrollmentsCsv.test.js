import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminEnrollmentsCsvRows,
  getEnrollmentExportActionRequired,
} from "./adminEnrollmentsCsv.js";
import { buildCsvContent } from "./exportCsv.js";

const statusLabelFor = (status) => ({
  assigned: "Назначены",
  active: "Активные",
  completed: "Завершены",
  cancelled: "Отменены",
})[status] || status;

function completedEnrollment(overrides = {}) {
  return {
    id: "enrollment-1",
    user_id: "user-1",
    user_email: "learner@example.org",
    user_full_name: "Тестовый Слушатель",
    course_id: "course-1",
    course_title: "Оказание первой помощи",
    course_slug: "first-aid",
    organization_id: "org-1",
    learning_group_id: "group-1",
    status: "completed",
    completed_at: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

test("CSV builder retains all 76 completed enrollments and produces a header", () => {
  const enrollments = Array.from({ length: 76 }, (_, i) =>
    completedEnrollment({ id: `enrollment-${i + 1}`, user_id: `user-${i + 1}` })
  );
  const documentsById = Object.fromEntries(
    enrollments.map(({ id }) => [id, [{ status: "available" }]])
  );

  const rows = buildAdminEnrollmentsCsvRows(enrollments, documentsById, statusLabelFor);
  assert.equal(rows.length, 76);
  assert.equal(rows[0].status_label, "Завершены");
  assert.equal(rows[0].action_required, "no");
  assert.equal(rows[75].id, "enrollment-76");

  const csv = buildCsvContent(
    [{ key: "id", label: "ID" }, { key: "status_label", label: "Статус" }],
    rows
  );
  assert.equal(csv.split("\n").length, 77);
  assert.match(csv, /enrollment-76;Завершены/);
});

test("CSV builder includes document and course links and safely quotes special characters", () => {
  const enrollment = completedEnrollment({
    user_full_name: 'Слушатель "Тест"; пример',
  });
  const rows = buildAdminEnrollmentsCsvRows(
    [enrollment],
    { "enrollment-1": [{ status: "available" }] },
    statusLabelFor
  );
  assert.equal(rows[0].documents_url, "/admin/documents?enrollment_id=enrollment-1");
  assert.equal(rows[0].course_url, "/courses/first-aid");
  const csv = buildCsvContent(
    [{ key: "user_full_name", label: "ФИО" }],
    rows
  );
  assert.match(csv, /"Слушатель ""Тест""; пример"/);
});

test("CSV action-required value stays unknown until completed learner documents have loaded", () => {
  const enrollment = completedEnrollment();
  assert.equal(getEnrollmentExportActionRequired(enrollment, {}), "unknown");
  assert.equal(getEnrollmentExportActionRequired(enrollment, { "enrollment-1": [] }), "yes");
  assert.equal(
    getEnrollmentExportActionRequired(enrollment, {
      "enrollment-1": [{ status: "draft" }],
    }),
    "yes"
  );
  assert.equal(
    getEnrollmentExportActionRequired(enrollment, {
      "enrollment-1": [{ status: "available" }],
    }),
    "no"
  );
});

test("failed document loading remains unknown instead of signaling missing documents", () => {
  const enrollment = completedEnrollment();
  const documentsById = { "enrollment-1": null };

  assert.equal(getEnrollmentExportActionRequired(enrollment, documentsById), "unknown");
  const [row] = buildAdminEnrollmentsCsvRows([enrollment], documentsById, statusLabelFor);
  assert.equal(row.action_required, "unknown");
  assert.equal(getEnrollmentExportActionRequired(enrollment, { "enrollment-1": [] }), "yes");
});

test("known missing organization or group and unstarted enrollment always require attention", () => {
  assert.equal(
    getEnrollmentExportActionRequired(completedEnrollment({ learning_group_id: null }), {}),
    "yes"
  );
  assert.equal(
    getEnrollmentExportActionRequired(completedEnrollment({ organization_id: null }), {}),
    "yes"
  );
  assert.equal(
    getEnrollmentExportActionRequired(
      completedEnrollment({ status: "assigned" }),
      {}
    ),
    "yes"
  );
  assert.equal(
    getEnrollmentExportActionRequired(
      completedEnrollment({ status: "active" }),
      {}
    ),
    "no"
  );
});
