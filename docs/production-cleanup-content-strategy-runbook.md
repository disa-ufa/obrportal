# Production Cleanup and Content Strategy Runbook

production_cleanup_content_strategy_runbook=ready
manual_cleanup_allowed=no
production_data_changed=no
additive_content_strategy=yes
cleanup_deferred_to_dedicated_stage=yes
stage81_4_next_stage=81.5

## Purpose

This runbook records the decision path after Stage 81.3 production data snapshot.

It does not execute cleanup and does not initialize content.

## Cleanup rule

The unexpected inactive user record must not be deleted or edited manually.

Cleanup requires a separate stage with:

- explicit backup;
- exact target user ID;
- exact reason;
- pre-change counts;
- cleanup command;
- post-change counts;
- rollback note;
- audit note.

## Content rule

Production content must be initialized additively.

Any command or manual process must preserve:

- existing users;
- existing roles;
- existing permissions;
- existing audit events;
- existing documents;
- existing storage.

## Recommended first content checklist

Before creating real production content, prepare:

- organization name;
- organization INN/KPP if required;
- public organization text;
- course title;
- course slug;
- course description;
- module list;
- lesson list;
- learner source;
- group code if groups are used;
- enrollment rules;
- document type and issuing rule.

## Forbidden commands

Do not use on production:

- docker compose down -v;
- ResetVolumes;
- local_bootstrap.ps1 -ResetVolumes;
- local_bootstrap.ps1 -ResetVolumes -WithDemoLearning;
- destructive reseed;
- TRUNCATE;
- DROP SCHEMA;
- direct SQL cleanup without a dedicated stage.

## Next decision

Stage 81.5 must choose one of two implementation paths:

- manual admin UI content filling;
- additive production seed for real initial content.
