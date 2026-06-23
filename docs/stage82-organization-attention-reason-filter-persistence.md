# Stage 82.31 — Organization attention reason filter persistence

## Scope

Frontend-only improvement for organization cabinet quick attention reason filters.

## What changed

- The selected reason filter is persisted in localStorage.
- Persistence is stored per quick attention list.
- When switching quick attention lists, the previously selected reason for that list is restored.
- Invalid or unknown stored reason filters are normalized to “all”.
- Added stable data markers and guard script.

## Safety

- Backend unchanged.
- Database unchanged.
- No migration required.
- Production deployment type: frontend-only.
