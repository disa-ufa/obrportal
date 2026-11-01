"""Conservative factory-wide C fence. All application transactions participate.

Batch export takes exclusive C; ordinary factory transactions take shared C.
This deliberately serializes batches globally, including against source writers
that have not yet adopted per-source S/D/O. No SQL may precede this event.
A new transaction after COMMIT/ROLLBACK automatically obtains a new shared C.
Direct external SQL and sessions created outside the factory are not covered.
"""
from sqlalchemy import event, text
from sqlalchemy.orm import Session

NAMESPACE = 0x4F425250
RESOURCE = 0x504F4C31
MODE_KEY = 'registry.catalog.begin_mode'

class RegistryCoordinatedSession(Session):
    pass

@event.listens_for(RegistryCoordinatedSession, 'after_begin')
def coordinate_transaction(session, transaction, connection):
    if transaction.nested:
        return  # Outer transaction owns C through all savepoints.
    if connection.dialect.name != 'postgresql':
        raise RuntimeError('registry.coordination_postgresql_required')
    mode = session.info.pop(MODE_KEY, 'shared')
    if mode not in {'shared', 'exclusive'}:
        raise RuntimeError('registry.coordination_invalid_mode')
    level = connection.execute(text('SHOW transaction_isolation')).scalar_one()
    if str(level).lower().replace('_', ' ') != 'read committed':
        raise RuntimeError('registry.coordination_requires_read_committed')
    function = 'pg_advisory_xact_lock' if mode == 'exclusive' else 'pg_advisory_xact_lock_shared'
    connection.execute(text(f'SELECT {function}(:namespace, :resource)'),
                       {'namespace': NAMESPACE, 'resource': RESOURCE})
