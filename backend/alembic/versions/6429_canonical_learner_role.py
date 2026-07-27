"""canonicalize learner import role

Revision ID: 6429_canonical_learner_role
Revises: 6428_import_batch_idempotency
Create Date: 2026-07-20
"""

from alembic import op


revision = "6429_canonical_learner_role"
down_revision = "6428_import_batch_idempotency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        LOCK TABLE roles, user_roles
        IN SHARE ROW EXCLUSIVE MODE
        """
    )
    op.execute(
        """
        DO $migration$
        DECLARE
            legacy_role_id varchar;
            canonical_role_id varchar;
        BEGIN
            SELECT id
            INTO legacy_role_id
            FROM roles
            WHERE code = 'learner';

            IF legacy_role_id IS NOT NULL THEN
                SELECT id
                INTO canonical_role_id
                FROM roles
                WHERE code = 'learner_fl';

                IF canonical_role_id IS NULL THEN
                    RAISE EXCEPTION
                        'Cannot migrate learner role: '
                        'canonical role learner_fl is missing';
                END IF;
                WITH ranked_legacy_assignments AS (
                    SELECT
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY
                                user_id,
                                organization_id
                            ORDER BY
                                created_at,
                                id
                        ) AS row_number
                    FROM user_roles
                    WHERE role_id = legacy_role_id
                )
                DELETE FROM user_roles
                    AS duplicate_assignment
                USING ranked_legacy_assignments
                    AS ranked
                WHERE
                    duplicate_assignment.id = ranked.id
                    AND ranked.row_number > 1;

                DELETE FROM user_roles
                    AS legacy_assignment
                WHERE
                    legacy_assignment.role_id
                    = legacy_role_id
                    AND EXISTS (
                        SELECT 1
                        FROM user_roles
                            AS canonical_assignment
                        WHERE
                            canonical_assignment.user_id
                            = legacy_assignment.user_id
                            AND canonical_assignment.role_id
                            = canonical_role_id
                            AND canonical_assignment
                                .organization_id
                                IS NOT DISTINCT FROM
                                legacy_assignment
                                .organization_id
                    );

                UPDATE user_roles
                SET
                    role_id = canonical_role_id,
                    updated_at = now()
                WHERE role_id = legacy_role_id;

                DELETE FROM roles
                WHERE id = legacy_role_id;
            END IF;
        END
        $migration$
        """
    )


def downgrade() -> None:
    # Irreversible data normalization: migrated
    # assignments cannot be distinguished from
    # pre-existing learner_fl assignments.
    pass
