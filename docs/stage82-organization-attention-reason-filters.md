# Stage 82.30 — Organization attention reason filters

## Scope

Frontend-only improvement for organization cabinet quick attention lists.

## What changed

- Added reason filters inside the selected quick attention list.
- Added counters for all reason filters.
- Added filtering by missing email, unfinished learning, missing document, unpublished document, revoked document and published document.
- The visible list, pagination summary and CSV export now respect the selected reason filter.
- Added stable data markers and guard script.

## Safety

- Backend unchanged.
- Database unchanged.
- No migration required.
- Production deployment type: frontend-only.
