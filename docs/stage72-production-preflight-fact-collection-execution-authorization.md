# Stage 72.13 - Production preflight fact collection execution authorization

Status: planned
Branch: stage72-production-preflight-fact-collection-execution-authorization
Base branch: develop
Previous accepted stage: Stage 72.12 - Production preflight fact collection execution preparation acceptance
Base develop checkpoint: 72f22f9
Accepted planning tag: v0.1.0-stage72-production-release-planning
Accepted preflight tag: v0.1.0-stage72-production-deployment-preflight
Accepted fact collection plan tag: v0.1.0-stage72-production-preflight-fact-collection-plan
Accepted execution preparation tag: v0.1.0-stage72-production-preflight-fact-collection-execution-preparation
Scope: read-only production fact collection execution authorization only

## Goal

Stage 72.13 prepares authorization for a separate future read-only production preflight fact collection execution.

This stage does not execute SSH commands and does not connect to production.

It only documents the authorization boundary, required confirmation phrase, approved command source, operator checks and blocking conditions.

## Safety boundary

Stage 72.13 is authorization planning only.

It must not:

- connect to production;
- execute SSH commands;
- deploy to production;
- restart production services;
- modify production data;
- run production migrations;
- print production `.env`;
- print secrets;
- overwrite server-only files;
- delete Docker volumes;
- run destructive SQL;
- change DNS;
- touch `amnezia-awg`.

## Production deployment lock

Production deployment remains blocked.

The production deployment phrase remains reserved only for a future deployment stage:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

This phrase is not used in Stage 72.13.

## Production fact collection authorization lock

Read-only production fact collection remains blocked until the following exact phrase is explicitly provided in a later execution step:

```text
CONFIRM PRODUCTION FACT COLLECTION
```

Stage 72.13 documents the phrase but does not use it for execution.

## Authorized scope for future execution

Only the accepted Stage 72.7 read-only command block may be used.

The future execution may collect only:

- host identifier;
- production project directory;
- git HEAD, branch, status and tags;
- yes/no file existence checks;
- Caddy active/inactive status;
- Docker Compose service status;
- filtered Docker volume names;
- disk usage;
- backup directory size or missing marker;
- container names, images and statuses;
- `amnezia-awg` yes/no presence marker.

## Forbidden future execution scope

The future execution must not:

- deploy application changes;
- restart services;
- run migrations;
- change files;
- delete volumes;
- print `.env` contents;
- print server-only config contents;
- print token values;
- print database URLs;
- print passwords;
- touch `amnezia-awg`.

## Authorized command source

Future execution must use the command block documented in:

```text
docs/stage72-production-preflight-fact-collection-plan.md
docs/stage72-production-preflight-fact-collection-execution-preparation.md
```

If the command block differs from the accepted Stage 72.7 plan, execution must stop.

## Target release candidate

```text
v0.1.0-stage72-production-release-planning
```

Target release commit:

```text
be97a41
```

Current authorization planning checkpoint:

```text
72f22f9
```

## Operator checks before future execution

Before a future execution stage can run read-only production fact collection, the operator must confirm:

- explicit phrase `CONFIRM PRODUCTION FACT COLLECTION` was provided;
- SSH target is known;
- production project directory is known;
- command list is unchanged from Stage 72.7;
- output will be reviewed before being pasted or committed;
- secrets will not be printed;
- production deployment remains blocked;
- production backup remains blocked;
- service restarts remain blocked;
- migrations remain blocked;
- `amnezia-awg` will not be touched.

## Required stop conditions

Future execution must stop immediately if:

- explicit confirmation phrase is missing;
- SSH target is unclear;
- production project directory is unclear;
- command list changed from accepted Stage 72.7 plan;
- any command would print secrets;
- any command would restart services;
- any command would modify files;
- any command would run migrations;
- any command would deploy changes;
- any command would touch `amnezia-awg`.

## Acceptance criteria

Stage 72.13 is accepted when:

- authorization boundary is documented;
- production deployment lock is documented;
- production fact collection confirmation phrase is documented;
- authorized command source is documented;
- operator checks are documented;
- stop conditions are documented;
- no SSH command was executed;
- no production connection was made;
- no production deployment was executed;
- no production services were restarted;
- no production data was changed;
- no production secrets were printed;
- guard passes;
- working tree is clean before final acceptance.

## Next stage

```text
Stage 72.14 - Production preflight fact collection execution authorization audit
```
