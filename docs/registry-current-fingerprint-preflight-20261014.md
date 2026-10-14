# M2 dormant canonical fingerprint preflight (2026-10-14)

Stacked after Draft #187, exact parent `7c2adad4a31d552408fb4c339c37739e38787d84`. Base main only for existing CI; review incremental changes against #187 and do not merge out of order.

## Increment

- Canonical source-data loader now refreshes existing Enrollment/Course, DocumentRecord and MintrudRegistryContext SQLAlchemy instances using `populate_existing=True`, preventing stale session identities after another READ COMMITTED transaction updates them. This does NOT lock their writer rows.
- New **dormant**, single-obligation `registry_current_fingerprint_preflight.py` composes the previously staged scope discovery and ordered lockset, current canonical DB inputs, and persisted required-decision fingerprint validation. It returns diagnostic evidence (version, hash, inputs), not an authorization token or file.
- Conservative automatic-rule check requires the current evaluation to also be `required`. A manual-required override with a different automatic evaluation is not authorized by this primitive: such cases require a future separately reviewed and audited manual exception boundary.
- Unit contract tests check the current fingerprint passed into the gate and fail-closed current rule disagreement.
- Isolated PostgreSQL tests (FRDO/Mintrud) persist a synthetic current required decision, verify the diagnostic succeeds, then change course document_type and require `registry.applicability_stale`; decision/history remain unchanged.

## Not ready for activation

- Real course, document, enrollment, catalog, context, learner, organization, RBAC and approval/batch writers still do not share the new advisory fences and can modify inputs between this diagnostic and commit. A successful preflight cannot authorize a subsequent API action.
- A locked obligation and repeated canonical ORM reads alone cannot guarantee commit-time freshness. Existing source insert/race, current role revocation, readiness, audit, file side effects, batch row ordering and historical continuation require a common server-owned transaction boundary and adoption plan.
- No legacy mutation path or frontend is wired, no feature flag is changed, no migration or deployment is made, and existing two XFAIL remain.

CI results must be verified on the exact PR head. No existing local/production databases, protected local worktrees, historical attempts or external registry systems were changed.
