# Stage 82.37 - Organization attention filtered show more summary

## Scope

Frontend-only fix for organization cabinet quick attention lists.

## What changed

- The show-more summary now uses the reason-filtered item count.
- The "show all" action now expands to the reason-filtered item count.
- The incremental "show more" limit now respects the reason-filtered item count.
- Added stable data markers and guard script.

## Safety

- Backend unchanged.
- Database unchanged.
- No migration required.
- Production deployment type: frontend-only.
