# Stage 82.24 — Organization attention show more

## Scope

Frontend-only improvement for organization cabinet quick attention lists.

## What changed

- Quick attention lists no longer stop at the first 8 records permanently.
- Added visible counter: shown items out of selected filter total.
- Added actions: show more, show all, collapse.
- Selected filter change resets visible limit back to the initial list size.

## Safety

- Backend unchanged.
- Database unchanged.
- No migration required.
- Production deployment type: frontend-only.
