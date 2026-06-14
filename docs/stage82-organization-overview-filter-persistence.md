# Stage 82.27 — Organization overview filter persistence

## Scope

Frontend-only improvement for organization cabinet overview filters.

## What changed

- Overview search and filters are persisted in localStorage.
- Filters survive data refreshes and group switches.
- Added clear search action inside the search field.
- Added active filter chips for current search, learning status and document status.

## Safety

- Backend unchanged.
- Database unchanged.
- No migration required.
- Production deployment type: frontend-only.
