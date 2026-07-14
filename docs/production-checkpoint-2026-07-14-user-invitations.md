# Production checkpoint — 2026-07-14

status=production_deployed_and_verified
production_branch=main
production_head=fa090cd
last_migration=6427_user_password_tokens

## Release scope

- One-time password setup links.
- User invitations from the administrator interface.
- Invitation email delivery through SMTP.
- Delivery status in learner imports.
- LearnerImportsPage export hotfix.

Pull requests: PR 111, PR 112 and PR 113.

## Production evidence

- Public URL: https://portal.rcdo02.ru
- Frontend: healthy.
- Backend readiness: OK.
- Password setup page: HTTP 200.
- SMTP connection and authentication: OK.
- Invitation email received.
- Password setup and account activation verified.

## Backup

Verified backup:

/opt/obrportal/backups/email-invitations-before-deploy-20260714-065503

PostgreSQL dump, MinIO archive and checksums were verified.
Docker volumes were not removed.
The amnezia-awg container was not modified.

## Security

No passwords, SMTP credentials, invitation tokens or personal data
are stored in this document.

## Known issues

- PDF verification code may overlap the document place field.
- DKIM and DMARC require review.
- Required GitHub CI checks are not configured.

## Next stage

Stage 82.23 — First real course end-to-end pilot.
