# Stage 82.33 - Organization attention reason empty state

## Scope

Frontend-only improvement for organization cabinet quick attention lists.

## What changed

- Added a specific empty state for selected reason filters.
- The empty message now includes the selected quick attention list.
- The empty message now includes the selected reason filter.
- Added a reset reason button inside the empty state.
- The default empty text is preserved when the reason filter is all.
- Added stable data markers and guard script.

## Safety

- Backend unchanged.
- Database unchanged.
- No migration required.
- Production deployment type: frontend-only.
