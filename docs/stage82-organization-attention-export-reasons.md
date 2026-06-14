# Stage 82.29 — Organization attention export reasons

## Scope

Frontend-only improvement for organization cabinet quick attention CSV export.

## What changed

- Added a CSV column named “Причины”.
- The export reuses the same reason badge logic from Stage 82.28.
- Reasons are exported as a semicolon-separated string.
- Added stable data markers and guard script.

## Safety

- Backend unchanged.
- Database unchanged.
- No migration required.
- Production deployment type: frontend-only.
