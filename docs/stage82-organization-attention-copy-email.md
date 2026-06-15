# Stage 82.36 - Organization attention copy email

## Scope

Frontend-only improvement for organization cabinet quick attention cards.

## What changed

- Added a copy email action to quick attention cards.
- The copy email button is shown only when learner email exists.
- The button reuses the existing clipboard feedback pattern.
- Added stable data markers and guard script.

## Safety

- Backend unchanged.
- Database unchanged.
- No migration required.
- Production deployment type: frontend-only.
