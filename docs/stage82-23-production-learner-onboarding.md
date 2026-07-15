# Stage 82.23 - Production learner onboarding

stage82_23_status=implementation_in_progress
stage82_23_backend_changed=yes
stage82_23_frontend_changed=yes
stage82_23_database_migration_required=no

## Goal

Make bulk learner registration predictable, safe and convenient
for real production use.

The administrator must understand what will happen before applying
an import and must receive a clear result for every imported row.

## Import workflow

1. The administrator selects a CSV or XLSX file.
2. The administrator optionally selects a course, organization and group.
3. The file is uploaded and parsed without changing users or enrollments.
4. The backend classifies every valid row.
5. The frontend shows a preflight summary.
6. The administrator confirms the operation.
7. Rows are applied independently.
8. The final result is shown for every row.

## Email requirement

A real email address is required for every portal learner row.

The importer must not create new production learners with fallback
addresses ending in @obrportal.local.

A row without email is invalid even when it contains a phone number.

A phone number remains useful for identity matching and contact data,
but it cannot replace email for portal access.

## Row classifications

Each valid row must receive exactly one preflight classification:

- new_user;
- existing_inactive_user;
- existing_active_user;
- existing_enrollment;
- identity_conflict;
- invalid_row.

## New user

For new_user the system must:

- create an inactive user account;
- create a learner profile;
- assign the learner role;
- create an enrollment when a course is selected;
- create a one-time password setup token;
- send a password setup invitation;
- return the invitation delivery status.

## Existing inactive user

For existing_inactive_user the system must:

- reuse the existing user account;
- fill only missing profile fields;
- assign the learner role when missing;
- create a missing enrollment when a course is selected;
- create a new password setup token;
- invalidate older unused setup tokens;
- send a new password setup invitation.

The importer must not create a duplicate user.

## Existing active user

For existing_active_user the system must:

- reuse the existing account;
- update only missing non-conflicting profile fields;
- assign the learner role when missing;
- create a missing enrollment when a course is selected;
- keep the existing password unchanged;
- send a new-course notification only when a new enrollment was created.

An active user must not receive a password setup invitation.

## Existing enrollment

When the user already has an enrollment for the selected course:

- do not create another enrollment;
- do not change existing progress;
- do not reset completion data;
- do not send a duplicate new-course notification;
- report the row as already_enrolled.

## Import without a course

When no course is selected:

- users and profiles may still be created or updated;
- the learner role may be assigned;
- no enrollment is created;
- new and inactive users receive password setup invitations;
- active users receive no course notification.

## Identity matching

Matching order:

1. Exact normalized email.
2. Exact normalized phone.
3. Conflict validation between email, phone and SNILS.

The operation must stop for the individual row when:

- email belongs to one user and phone belongs to another;
- SNILS belongs to another learner profile;
- the incoming email conflicts with an existing account;
- the row cannot be mapped to one unambiguous user.

A conflict in one row must not cancel successful processing of other rows.

## Preflight summary

Before confirmation the interface must show:

- total rows;
- valid rows;
- invalid rows;
- new users;
- existing inactive users;
- existing active users;
- new profiles;
- updated profiles;
- new enrollments;
- existing enrollments;
- password setup invitations;
- new-course notifications;
- identity conflicts.

The confirmation button must describe the planned action, for example:

Create 12 users, assign 17 learners and send 12 invitations.

## Apply result for every row

Every row must return:

- row number;
- full name;
- normalized email;
- classification;
- user action;
- profile action;
- enrollment action;
- notification action;
- delivery status;
- error code;
- readable error message.

Recommended action values:

- created;
- updated;
- unchanged;
- skipped;
- conflict;
- failed.

## Idempotency

- An applied batch cannot be applied again.
- Repeated clicks must not create duplicate records.
- An existing enrollment must not be duplicated.
- Existing learner roles must not be duplicated.
- Re-uploading the same people must reuse existing users.
- Sending failures must not roll back created users or enrollments.

## Transaction rules

Each row must be processed inside an independent database savepoint.

A validation or integrity error in one row must:

- roll back only that row;
- record the row error;
- allow the remaining rows to continue.

The batch is completed after all rows have been attempted.

## Delivery rules in this stage

Email delivery remains synchronous during Stage 82.23.

The response must distinguish:

- sent;
- failed;
- skipped;
- not_required.

Persistent delivery history, queues and automatic retries are planned
for the following stages.

## Security

- Never store raw invitation tokens in the database.
- Never write raw invitation links to ordinary server logs.
- Never commit imported personal data.
- Never commit SMTP credentials.
- New password tokens invalidate previous unused tokens.
- Existing passwords must never be returned to an administrator.

## Frontend requirements

The import page must provide:

- clear three-step workflow;
- preflight classification counters;
- row filters by classification and error;
- explicit confirmation before applying;
- progress indication while applying;
- final per-row result table;
- visible delivery status;
- links to created users and enrollments where available.

## Backend acceptance criteria

- Email is mandatory for portal registration.
- Technical fallback emails are not created.
- New users receive password setup invitations.
- Existing inactive users receive new setup invitations.
- Existing active users keep their passwords.
- Active users receive notifications only for new course assignments.
- Existing enrollments are not duplicated.
- Conflicting rows do not break successful rows.
- Preflight counts match final apply results.

## Out of scope

The following work remains for later stages:

- persistent invitation delivery history;
- background email worker;
- automatic retry schedule;
- password recovery page;
- DKIM and DMARC configuration;
- final Russian HTML email templates;
- full real-course end-to-end pilot.

## Completion decision

Stage 82.23 is complete only after backend tests, frontend tests,
production build and a controlled import smoke test all pass.
