# Stage 82.23 - First real course end-to-end pilot

stage82_23_status=planned
stage82_23_runtime_change=no
stage82_23_database_migration_required=no

## Purpose

Validate ObrPortal with one real course and controlled test learners
before broader production use.

Application code is changed only when a pilot defect requires it.

## Pilot scenario

1. Create one real course.
2. Create modules and lessons.
3. Add real course materials.
4. Publish all required lessons.
5. Publish the course.
6. Import controlled test learners.
7. Deliver invitation emails.
8. Set passwords and sign in.
9. Open and complete lessons.
10. Submit a practical assignment.
11. Review the assignment in the administrator interface.
12. Complete the course.
13. Generate or publish the final document.
14. Download the document.
15. Verify it through the public verification page.

## Test data safety

Use only controlled test accounts.

Do not commit:

- personal email lists;
- passwords;
- invitation tokens;
- SMTP credentials;
- import files containing personal data;
- screenshots containing active invitation links.

## Evidence

For every pilot step record:

- tested screen or route;
- expected result;
- actual result;
- pass or fail;
- defect reference;
- blocking or non-blocking classification.

## Acceptance criteria

- One real course is published.
- At least one controlled learner receives an invitation.
- Password setup and login succeed.
- Required lessons can be completed.
- An assignment can be submitted and reviewed.
- The course can be completed.
- The final document can be obtained.
- Public document verification succeeds.
- All discovered defects are recorded.
- Blocking defects are fixed and retested.

## Stop conditions

Stop the pilot when:

- another user's data becomes visible;
- course access works without permission;
- progress is assigned to the wrong enrollment;
- a document is issued to the wrong learner;
- an invitation token can be reused;
- production data is unexpectedly lost or modified;
- migration or cleanup is requested without an approved backup.

## Result decision

After the pilot choose one result:

- ready for a limited real learner group;
- ready after listed non-blocking corrections;
- not ready until blocking defects are fixed.
