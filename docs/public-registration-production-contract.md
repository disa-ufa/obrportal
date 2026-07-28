# Public registration production contract

Status: approved implementation contract
Base commit: `753634906360051b42796be0643dc838d4a166dc`
Target branch: `feature/public-registration-production`

## 1. Purpose

Replace the current immediate-account registration flow with a production-safe
email-confirmed onboarding flow that is consistent with learner bulk import.

The public registration flow must not create duplicate users, must not expose
whether an account already exists, and must not authenticate a user before the
email address is confirmed through a one-time link.

## 2. Current behavior being replaced

The current public endpoint:

- accepts email, password, optional full name and optional phone;
- creates an active user immediately;
- leaves email unverified;
- returns a JWT access token;
- does not create a learner profile;
- does not assign the canonical `learner_fl` role;
- returns explicit email and phone conflicts;
- allows frontend automatic login and immediate navigation to the account.

This behavior is not the target production contract.

## 3. Target user journey

1. Visitor opens `/register`.
2. Visitor enters identity and contact data and accepts required legal terms.
3. Frontend sends a registration request without a password.
4. Backend returns the same neutral accepted response for all eligible and
   existing-account states.
5. For a new or eligible inactive account, backend sends a one-time setup link.
6. Visitor opens `/set-password?token=...`.
7. Visitor creates and confirms a password.
8. Backend marks the token used, activates the account, and verifies the email.
9. Visitor signs in through `/login`.
10. Any pending course enrollment stored by the frontend is completed only
    after successful login.

No JWT is returned from public registration.

## 4. Registration form

The first production version uses these fields:

| Field | Required | Notes |
|---|---:|---|
| Last name | yes | Trimmed, 1–128 characters |
| First name | yes | Trimmed, 1–128 characters |
| Middle name | no | Trimmed, up to 128 characters |
| Email | yes | Normalized to lowercase and trimmed |
| Phone | no | Trimmed and normalized by backend |
| Personal-data consent | yes | Must be `true` |
| Terms acceptance | yes | Must be `true` |

Password is not collected on the registration form.

The frontend must provide direct links to:

- `/privacy`;
- `/offer`.

## 5. Public API contract

### `POST /api/v1/auth/register`

Request shape:

```json
{
  "last_name": "Иванов",
  "first_name": "Иван",
  "middle_name": "Иванович",
  "email": "ivanov@example.com",
  "phone": "+79990000000",
  "personal_data_consent": true,
  "terms_accepted": true
}
```

Successful public response:

- HTTP status: `202 Accepted`;
- no JWT;
- no user identifier;
- no indication whether the email exists;
- no indication whether an email was actually sent.

Response shape:

```json
{
  "status": "accepted",
  "message": "Если указанный адрес может быть использован для регистрации, на него будет отправлено письмо с дальнейшими инструкциями."
}
```

Validation errors for malformed input may return `422`.

Account-state, duplicate-email, duplicate-phone, imported-account, and
already-active-account outcomes must not be disclosed through distinct public
responses.

## 6. Identity reconciliation rules

### 6.1 New email

Create:

- `User` with normalized email;
- random unusable initial password hash;
- `is_active = false`;
- `is_email_verified = false`;
- `mfa_enabled = false`;
- `LearnerProfile` with submitted identity data;
- profile `source = "public_registration"`;
- profile `personal_data_basis = "public_registration"`;
- profile `personal_data_consent_at = current UTC time`;
- one global `learner_fl` role assignment;
- one `initial_password_setup` token.

Send the setup email after the database transaction has created the account and
token.

### 6.2 Existing inactive imported user with the same normalized email

Do not create another user.

Rules:

- preserve all non-empty imported identity fields;
- fill only currently empty profile fields from the registration form;
- preserve existing enrollment, organization and group relations;
- ensure exactly one global `learner_fl` assignment;
- invalidate earlier unused `initial_password_setup` tokens;
- create a new one-time setup token;
- send a new setup email;
- keep the account inactive until password setup succeeds.

### 6.3 Existing inactive public-registration user

Do not create another user.

Rules:

- do not overwrite non-empty identity data;
- invalidate earlier unused setup tokens;
- create and send a new setup token;
- return the neutral accepted response.

### 6.4 Existing active user

Do not change the user, password, roles, profile, enrollments or tokens.

Return the same neutral accepted response.

The UI may display links to login and password recovery, but the API must not
reveal that the account exists.

### 6.5 Phone conflict

Phone is not a primary identity key.

If the submitted phone belongs to another user:

- do not expose the conflict publicly;
- do not create a duplicate account with that phone;
- record an audit event for administrator review;
- return the neutral accepted response.

### 6.6 Technical import email

Addresses under `@obrportal.local` are not automatically reconciled with a
public registrant by name or phone.

Such reconciliation requires an administrator action. Public registration must
never guess account ownership from a matching full name.

## 7. Role and learner profile rules

The only canonical individual learner role is:

```text
learner_fl
```

Public registration must never create or assign the removed legacy `learner`
role.

The role assignment is global:

```text
organization_id = null
```

Role assignment must be idempotent and compatible with the database partial
unique index `uq_user_role_global`.

Every newly created public learner account must have exactly one
`LearnerProfile`.

## 8. Password setup and email verification

Reuse the existing:

- `user_password_tokens` table;
- `initial_password_setup` purpose;
- hashed token storage;
- one-time token semantics;
- `/api/v1/auth/set-password`;
- `/set-password` frontend page.

On successful setup:

- replace the random initial password hash;
- set `is_active = true`;
- set `is_email_verified = true`;
- mark the token used;
- write an audit event;
- do not automatically issue a JWT.

The user signs in normally after setup.

## 9. Email delivery

Use the existing SMTP delivery service and `PUBLIC_BASE_URL`.

The registration email must include:

- portal name;
- explanation that registration must be completed;
- `/set-password?token=...` link;
- token expiration time;
- notice to ignore the message if the request was not initiated by the user;
- support contact text.

Raw tokens, passwords and SMTP credentials must never be written to audit
payloads or application logs.

A delivery failure must be recorded internally without returning account-state
details to the public client.

## 10. Pending course enrollment

The current pending enrollment key remains:

```text
obrportal_pending_enrollment_slug
```

Registration must not clear it.

Because registration no longer authenticates the user, pending enrollment is
completed after the later successful login by the existing login flow.

The registration page text must say that enrollment will be completed after
email confirmation and login, not immediately after form submission.

## 11. Audit events

Required event actions:

- `public_registration.requested`;
- `public_registration.user_created`;
- `public_registration.existing_inactive_user`;
- `public_registration.existing_active_user`;
- `public_registration.identity_conflict`;
- `public_registration.email_sent`;
- `public_registration.email_failed`;
- `public_registration.completed`;
- `public_registration.rate_limited`.

Audit payloads may include normalized email only where already consistent with
the current audit policy. They must not include passwords or raw tokens.

## 12. Abuse protection

Before public rollout, registration must have Redis-backed limits for:

- requests per IP;
- requests per normalized-email hash;
- resend attempts;
- token validation failures.

The public response remains neutral when limits are reached.

CAPTCHA is not mandatory for the first release, but the design must allow a
later risk-based challenge without changing the core registration contract.

## 13. Feature flag

Add:

```text
PUBLIC_REGISTRATION_ENABLED=false
```

Required behavior:

- disabled: public registration endpoint returns a controlled unavailable
  response and the frontend does not offer an active form;
- enabled: the production contract in this document applies.

The code is deployed with the flag disabled, tested in production, then enabled
separately.

## 14. Password recovery

Public password recovery is required before broad public rollout:

- neutral forgot-password request;
- one-time `password_reset` token;
- reset-password page;
- no account enumeration;
- rate limiting.

Admin password reset remains available.

## 15. Test acceptance matrix

Backend tests must cover:

- new account creates inactive user, profile and `learner_fl`;
- registration returns `202` and no JWT;
- normalized email;
- active-account neutral response;
- inactive imported-account reconciliation;
- no duplicate user or profile;
- no duplicate global role;
- phone conflict neutral response;
- setup token invalidation and replacement;
- setup activates and verifies;
- expired and reused token rejection;
- SMTP sent, skipped and failed outcomes;
- race-condition or `IntegrityError` handling;
- rate limiting;
- feature flag disabled and enabled;
- audit events contain no secrets.

Frontend tests and smoke guards must cover:

- no password field on `/register`;
- required identity fields;
- required consent and terms;
- neutral accepted state;
- resend state;
- pending course wording;
- setup-password success and failure;
- login after activation;
- no automatic token storage from registration.

End-to-end acceptance:

```text
register
→ neutral response
→ setup email
→ one-time link
→ set password
→ active and verified user
→ login
→ pending course enrollment
→ learner account
```

## 16. Implementation sequence

1. Baseline and target-contract tests.
2. Backend registration service and neutral endpoint.
3. Learner-profile and role reconciliation.
4. Email delivery and resend endpoint.
5. Frontend registration accepted-state UX.
6. Redis rate limiting.
7. Public password recovery.
8. Feature flag and rollout checks.
9. Full regression suite.
10. Controlled production deployment with the flag disabled.
11. Production smoke tests.
12. Separate feature-flag enablement.

## 17. Non-goals for this cycle

This cycle does not:

- replace Bearer JWT authentication with cookie sessions;
- implement MFA;
- automatically merge users by name;
- automatically replace `@obrportal.local` addresses;
- change bulk-import idempotency;
- delete historical users or tokens;
- change organization-scoped learner roles;
- deploy directly from a developer workstation without the established
  production backup and verification procedure.
