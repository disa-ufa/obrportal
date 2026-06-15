# Stage 82.35 - Organization attention export active filters

## Scope

Frontend-only improvement for organization cabinet quick attention CSV export.

## What changed

- CSV filename now includes the selected quick attention list id.
- CSV filename now includes the selected reason filter id.
- CSV rows include the active reason filter label.
- CSV rows include the active reason filter id.
- Added stable data markers and guard script.

## Safety

- Backend unchanged.
- Database unchanged.
- No migration required.
- Production deployment type: frontend-only.
