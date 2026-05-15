from __future__ import annotations

import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMP_TEST = ROOT / "frontend" / "tmp_org_cabinet_utils_smoke.mjs"


JS_TEST = r"""
import {
  buildOrganizationOptions,
  enrollmentMatchesFilters,
  formatUserOrganizations,
  formatUserRoles,
  hasActiveEnrollmentFilters,
  organizationUserMatchesQuery,
  sortEnrollments,
  sortMembers,
  sortOrganizationUsers,
} from "./src/utils/organizationCabinet.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, got ${actualJson}`);
  }
}

const orgId = "12345678-aaaa-bbbb-cccc-1234567890ab";

assertEqual(
  formatUserOrganizations([{ organization: { id: orgId, name: "Школа №1" } }], []),
  "Школа №1",
  "formatUserOrganizations unwraps nested organization item"
);

assertEqual(
  formatUserOrganizations([], [orgId]),
  "12345678…",
  "formatUserOrganizations formats fallback organization id"
);

assertEqual(
  formatUserRoles([{ role: { name: "Представитель", code: "org_rep" } }]),
  "Представитель",
  "formatUserRoles unwraps nested role item"
);

assertDeepEqual(
  buildOrganizationOptions(
    [{ organization: { id: orgId, name: "Школа №1", inn: "0270000000" } }, { broken: true }],
    []
  ),
  [{ id: orgId, label: "Школа №1", inn: "0270000000" }],
  "buildOrganizationOptions filters broken organization options"
);

assertDeepEqual(
  buildOrganizationOptions([], [{ organization_id: "org-1" }, { organization_id: "org-1" }, { organization_id: "org-2" }]),
  [
    { id: "org-1", label: "Организация 1" },
    { id: "org-2", label: "Организация 2" },
  ],
  "buildOrganizationOptions deduplicates fallback organization ids"
);

const enrollments = [
  { id: "2", course_title: "Язык", user_email: "b@example.test" },
  { id: "1", course: { title: "Азбука" }, user: { email: "a@example.test" } },
];

const sortedEnrollments = sortEnrollments(enrollments);

assertEqual(sortedEnrollments[0].id, "1", "sortEnrollments normalizes nested items");
assertEqual(enrollments[0].id, "2", "sortEnrollments does not mutate original array");

assert(
  enrollmentMatchesFilters(
    {
      course: { title: "Математика" },
      user: { email: 12345 },
      status: "active",
    },
    "123",
    " active "
  ),
  "enrollmentMatchesFilters stringifies values and trims status"
);

assert(
  !enrollmentMatchesFilters(
    {
      course_title: "Математика",
      user_email: "student@example.test",
      status: "completed",
    },
    "",
    "active"
  ),
  "enrollmentMatchesFilters applies status filter"
);

assert(
  hasActiveEnrollmentFilters(null, " active "),
  "hasActiveEnrollmentFilters handles empty search and trimmed status"
);

const users = [
  { id: "2", email: "b@example.test" },
  { id: "1", full_name: "Алексей" },
];

const sortedUsers = sortOrganizationUsers(users);

assertEqual(sortedUsers[0].id, "1", "sortOrganizationUsers uses safe sort key");
assertEqual(users[0].id, "2", "sortOrganizationUsers does not mutate original array");

assert(
  organizationUserMatchesQuery({ email: 12345, full_name: null }, "234"),
  "organizationUserMatchesQuery stringifies non-string values"
);

const members = [
  { user_id: "2", user_email: "b@example.test" },
  { user_id: "1", user_full_name: "Алексей" },
];

const sortedMembers = sortMembers(members);

assertEqual(sortedMembers[0].user_id, "1", "sortMembers uses safe sort key");
assertEqual(members[0].user_id, "2", "sortMembers does not mutate original array");

console.log("Organization cabinet utils behavior smoke passed");
"""

def main() -> None:
    TEMP_TEST.write_text(JS_TEST, encoding="utf-8", newline="\n")

    try:
        completed = subprocess.run(
            ["docker", "compose", "exec", "-T", "frontend", "node", "tmp_org_cabinet_utils_smoke.mjs"],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )

        print(completed.stdout, end="")

        if completed.returncode != 0:
            raise SystemExit(completed.returncode)
    finally:
        TEMP_TEST.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
