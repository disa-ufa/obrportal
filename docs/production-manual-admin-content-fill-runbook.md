# Production Manual Admin UI Content Fill Runbook

production_manual_admin_content_fill_runbook=ready
manual_admin_ui_content_fill=yes
sql_content_fill_allowed=no
seed_content_fill_allowed=no
production_data_changed_by_runbook=no
stage81_5_next_stage=81.6

## Purpose

This runbook defines the safe manual path for the first production content filling.

The runbook does not change data by itself.

## Preflight before manual filling

Before manual UI action, check git status, current head, docker compose ps, ready endpoint, public home page and admin page.

## Backup before manual filling

Before Stage 81.6 manual filling, create a PostgreSQL backup named postgres-before-stage81-6-manual-content-fill.

## Pre-change counts

Record counts for organizations, courses, course_modules, course_lessons, learning_groups, enrollments and document_records.

## Manual UI filling order

Open https://portal.rcdo02.ru/admin, sign in as real admin, create or verify organization, create real course, create modules, create lessons, create group if needed, create or verify learner, create enrollment, verify course visibility.

## Content quality checks

Verify title, slug, public-safe description, module order, lesson order, learner email, enrollment course and document issuing rule.

## Forbidden commands

Do not use on production: docker compose down -v, ResetVolumes, local_bootstrap.ps1 -ResetVolumes, local_bootstrap.ps1 -ResetVolumes -WithDemoLearning, direct SQL content insert, direct SQL cleanup, seed command for production content, TRUNCATE, DROP SCHEMA, container rebuild, container restart.

## Post-change checks for Stage 81.6

After manual filling, Stage 81.6 must record post-change table counts, ready endpoint result, public route statuses, no direct SQL content writes, no container restart, and no migration run.

## Decision

Stage 81.5 only prepares the manual admin UI content fill path. The actual data changes belong to Stage 81.6.
