import { useState } from "react";
import { AuditEventDetailPanel } from "../components/admin/AuditEventDetailPanel";
import { ActionButton } from "../components/ui/ActionButton";
import { Alert } from "../components/ui/Alert";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ru-RU");
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50 disabled:text-slate-500"
    />
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </label>
  );
}

const DEFAULT_FILTERS = {
  action: "",
  entity_type: "",
  entity_id: "",
  actor_user_id: "",
  limit: "50",
};

function normalizeFilters(filters) {
  return {
    action: filters.action.trim(),
    entity_type: filters.entity_type.trim(),
    entity_id: filters.entity_id.trim(),
    actor_user_id: filters.actor_user_id.trim(),
    limit: filters.limit || "50",
  };
}

export function AuditPage({
  user,
  auditEvents,
  loading,
  selectedAuditEvent,
  selectedAuditEventLoading,
  selectedAuditEventError,
  onOpenAuditEvent,
  onCloseAuditEvent,
  onApplyAuditFilters,
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterError, setFilterError] = useState("");

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
    setFilterError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFilterError("");

    const limit = Number(filters.limit || 50);

    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      setFilterError("Лимит должен быть целым числом от 1 до 200.");
      return;
    }

    try {
      await onApplyAuditFilters({
        ...normalizeFilters(filters),
        limit,
      });
    } catch (err) {
      setFilterError(`${err.status || ""} ${err.message}`.trim());
    }
  }

  async function handleReset() {
    setFilterError("");
    setFilters(DEFAULT_FILTERS);

    try {
      await onApplyAuditFilters({ limit: 50 });
    } catch (err) {
      setFilterError(`${err.status || ""} ${err.message}`.trim());
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Аудит"
        subtitle="Последние события audit_events с фильтрацией по action, entity и actor."
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть аудит.</p>
        ) : (
          <div className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Фильтры аудита
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Фильтры применяются на backend через GET /api/v1/admin/audit-events.
                </p>
              </div>

              {filterError && (
                <Alert title="Не удалось применить фильтр" tone="red">
                  {filterError}
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Field label="Action" hint="Например: admin.user_created">
                  <TextInput
                    value={filters.action}
                    onChange={(event) => updateFilter("action", event.target.value)}
                    placeholder="admin.user_created"
                    disabled={loading}
                  />
                </Field>

                <Field label="Entity type" hint="user / role / organization">
                  <TextInput
                    value={filters.entity_type}
                    onChange={(event) => updateFilter("entity_type", event.target.value)}
                    placeholder="organization"
                    disabled={loading}
                  />
                </Field>

                <Field label="Entity ID">
                  <TextInput
                    value={filters.entity_id}
                    onChange={(event) => updateFilter("entity_id", event.target.value)}
                    placeholder="UUID"
                    disabled={loading}
                  />
                </Field>

                <Field label="Actor user ID">
                  <TextInput
                    value={filters.actor_user_id}
                    onChange={(event) => updateFilter("actor_user_id", event.target.value)}
                    placeholder="UUID"
                    disabled={loading}
                  />
                </Field>

                <Field label="Лимит" hint="1–200">
                  <TextInput
                    type="number"
                    min="1"
                    max="200"
                    value={filters.limit}
                    onChange={(event) => updateFilter("limit", event.target.value)}
                    disabled={loading}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton type="submit" tone="blue" disabled={loading}>
                  {loading ? "Загружаем..." : "Применить фильтр"}
                </ActionButton>
                <ActionButton type="button" tone="light" onClick={handleReset} disabled={loading}>
                  Сбросить
                </ActionButton>
              </div>
            </form>

            {loading ? (
              <LoadingBlock text="Загружаем аудит..." />
            ) : (
              <SmallTable
                emptyText="Событий аудита нет."
                rows={auditEvents}
                selectedRowId={selectedAuditEvent?.id}
                minWidth="980px"
                columns={[
                  {
                    key: "action",
                    title: "Действие",
                    render: (row) => (
                      <StatusBadge tone="blue">
                        {row.action}
                      </StatusBadge>
                    ),
                  },
                  { key: "entity_type", title: "Сущность" },
                  { key: "entity_id", title: "ID сущности" },
                  { key: "ip_address", title: "IP" },
                  {
                    key: "created_at",
                    title: "Дата",
                    render: (row) => formatDate(row.created_at),
                  },
                  {
                    key: "actions",
                    title: "Действия",
                    render: (row) => (
                      <ActionButton
                        onClick={() => onOpenAuditEvent(row.id)}
                        disabled={selectedAuditEventLoading}
                      >
                        {selectedAuditEvent?.id === row.id ? "Открыто" : "Открыть"}
                      </ActionButton>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </SectionCard>

      {user && (
        <AuditEventDetailPanel
          auditEventDetail={selectedAuditEvent}
          loading={selectedAuditEventLoading}
          error={selectedAuditEventError}
          onClose={onCloseAuditEvent}
        />
      )}
    </div>
  );
}
