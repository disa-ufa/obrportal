import { useMemo, useState } from "react";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { ActionButton } from "../components/ui/ActionButton";
import { Alert } from "../components/ui/Alert";
import { DetailField, formatDetailDate } from "../components/ui/DetailField";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { normalizeSearchValue } from "../utils/search";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { ADMIN_FILTER_CONTROL_SOFT_CLASS } from "../utils/adminClasses";

const EMPTY_GROUP = {
  organization_id: "",
  name: "",
  code: "",
  description: "",
  is_active: true,
};

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";

function nullableTrim(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function normalizeInitialValues(initialValues) {
  return {
    organization_id: initialValues?.organization_id || "",
    name: initialValues?.name || "",
    code: initialValues?.code || "",
    description: initialValues?.description || "",
    is_active: initialValues?.is_active ?? true,
  };
}

function buildGroupPayload(values) {
  return {
    organization_id: values.organization_id,
    name: values.name.trim(),
    code: nullableTrim(values.code),
    description: nullableTrim(values.description),
    is_active: Boolean(values.is_active),
  };
}

function buildOrganizationsMap(organizations) {
  return organizations.reduce((acc, organization) => {
    acc[organization.id] = organization.name;
    return acc;
  }, {});
}

function groupMatchesSearch(group, query, organizationName) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    group.name,
    group.code,
    group.description,
    organizationName,
    group.is_active ? "active" : "inactive",
  ]
    .map(normalizeSearchValue)
    .some((value) => value.includes(normalizedQuery));
}

function groupMatchesOrganization(group, organizationFilter) {
  if (organizationFilter === "all") {
    return true;
  }

  return group.organization_id === organizationFilter;
}

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}{required ? " *" : ""}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className={ADMIN_FILTER_CONTROL_SOFT_CLASS} />;
}

function LearningGroupForm({
  organizations,
  initialValues = EMPTY_GROUP,
  submitLabel = "Сохранить",
  successMessage = "Группа сохранена.",
  onSubmit,
  onCancel,
  onSuccess,
}) {
  const [values, setValues] = useState(() => normalizeInitialValues(initialValues));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sortedOrganizations = useMemo(
    () => [...organizations].sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    [organizations]
  );

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = buildGroupPayload(values);
      const result = await onSubmit(payload);

      setSuccess(successMessage);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(`${err.status || ""} ${err.message}`.trim());
    } finally {
      setLoading(false);
    }
  }

  const isInvalid = !values.organization_id || !values.name.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert title="Не удалось сохранить группу" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="Готово" tone="blue">
          {success}
        </Alert>
      )}

      {sortedOrganizations.length === 0 && (
        <Alert title="Нет организаций" tone="amber">
          Сначала создайте организацию, затем добавьте группу.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Организация" required>
          <select
            value={values.organization_id}
            onChange={(event) => updateField("organization_id", event.target.value)}
            className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
            disabled={loading || sortedOrganizations.length === 0}
            required
          >
            <option value="">Выберите организацию</option>
            {sortedOrganizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Название группы" required>
          <TextInput
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Например, Группа 1"
            maxLength={255}
            disabled={loading}
            required
          />
        </Field>

        <Field label="Код группы">
          <TextInput
            value={values.code}
            onChange={(event) => updateField("code", event.target.value)}
            placeholder="Например, group-1"
            maxLength={64}
            disabled={loading}
          />
        </Field>

        <Field label="Статус">
          <label className="flex h-[50px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(event) => updateField("is_active", event.target.checked)}
              disabled={loading}
            />
            <span>Группа активна</span>
          </label>
        </Field>
      </div>

      <Field label="Описание">
        <textarea
          value={values.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Описание группы"
          maxLength={1024}
          disabled={loading}
          className={TEXTAREA_CLASS}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <ActionButton type="submit" tone="blue" disabled={loading || isInvalid}>
          {loading ? "Сохраняем..." : submitLabel}
        </ActionButton>

        {onCancel && (
          <ActionButton type="button" tone="light" onClick={onCancel} disabled={loading}>
            Отмена
          </ActionButton>
        )}
      </div>
    </form>
  );
}

function LearningGroupDetailPanel({
  groupDetail,
  organizations,
  loading,
  error,
  onClose,
  onUpdateGroup,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const organizationsMap = useMemo(() => buildOrganizationsMap(organizations), [organizations]);

  return (
    <SectionCard
      title="Карточка группы"
      subtitle="Детальные данные из GET /api/v1/org/groups/{group_id}."
    >
      {!groupDetail && !loading && !error && (
        <p className="text-sm text-slate-600">
          Выберите группу в таблице, чтобы открыть карточку.
        </p>
      )}

      {loading && <LoadingBlock text="Загружаем карточку группы..." />}

      {error && (
        <Alert title="Не удалось загрузить группу" tone="red">
          {error}
        </Alert>
      )}

      {groupDetail && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {groupDetail.name}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Организация: {organizationsMap[groupDetail.organization_id] || groupDetail.organization_id}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isEditing && (
                <ActionButton
                  type="button"
                  tone="blue"
                  onClick={() => setIsEditing(true)}
                >
                  Редактировать
                </ActionButton>
              )}

              <ActionButton
                type="button"
                tone="light"
                onClick={() => {
                  setIsEditing(false);
                  onClose();
                }}
              >
                Закрыть
              </ActionButton>
            </div>
          </div>

          {isEditing ? (
            <LearningGroupForm
              organizations={organizations}
              initialValues={groupDetail}
              submitLabel="Сохранить изменения"
              successMessage="Группа обновлена."
              onSubmit={(payload) => onUpdateGroup(groupDetail.id, payload)}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => setIsEditing(false)}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="blue">group</StatusBadge>
                <StatusBadge tone={groupDetail.is_active ? "green" : "gray"}>
                  {groupDetail.is_active ? "active" : "inactive"}
                </StatusBadge>
                <StatusBadge tone={groupDetail.code ? "green" : "gray"}>
                  code: {groupDetail.code ? "filled" : "empty"}
                </StatusBadge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailField label="ID" value={groupDetail.id} />
                <DetailField
                  label="Организация"
                  value={organizationsMap[groupDetail.organization_id] || groupDetail.organization_id}
                />
                <DetailField label="Название" value={groupDetail.name} />
                <DetailField label="Код" value={groupDetail.code} />
                <DetailField label="Создана" value={formatDetailDate(groupDetail.created_at)} />
                <DetailField label="Обновлена" value={formatDetailDate(groupDetail.updated_at)} />
              </div>

              <DetailField label="Описание" value={groupDetail.description} />
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}

export function GroupsPage({
  user,
  groups,
  organizations,
  loading,
  selectedGroup,
  selectedGroupLoading,
  selectedGroupError,
  onOpenGroup,
  onCloseGroup,
  onCreateGroup,
  onUpdateGroup,
  onRefreshAdminData,
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("all");

  const organizationsMap = useMemo(() => buildOrganizationsMap(organizations), [organizations]);
  const sortedOrganizations = useMemo(
    () => [...organizations].sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    [organizations]
  );

  const filteredGroups = useMemo(
    () => groups.filter((group) => (
      groupMatchesSearch(group, searchQuery, organizationsMap[group.organization_id] || "")
      && groupMatchesOrganization(group, organizationFilter)
    )),
    [groups, searchQuery, organizationFilter, organizationsMap]
  );

  function resetFilters() {
    setSearchQuery("");
    setOrganizationFilter("all");
  }

  const hasActiveFilters = Boolean(searchQuery.trim()) || organizationFilter !== "all";

  return (
    <div className="space-y-6">
      <SectionCard
        title="Группы обучающихся"
        subtitle="Справочник групп организаций из /api/v1/org/groups."
      >
        {!user ? (
          <p className="text-slate-600">
            Войдите под admin, чтобы увидеть группы.
          </p>
        ) : (
          <div className="space-y-5">
            <AdminPageActions
              loading={loading}
              onRefresh={onRefreshAdminData}
              primaryLabel={showCreateForm ? "Скрыть форму" : "Добавить группу"}
              primaryTone={showCreateForm ? "light" : "blue"}
              onPrimaryClick={() => setShowCreateForm((current) => !current)}
            />

            {showCreateForm && (
              <AdminCreatePanel
                title="Новая группа"
                subtitle="Группа привязывается к существующей организации."
              >
                <LearningGroupForm
                  organizations={organizations}
                  submitLabel="Создать группу"
                  successMessage="Группа создана."
                  onSubmit={onCreateGroup}
                  onCancel={() => setShowCreateForm(false)}
                  onSuccess={() => setShowCreateForm(false)}
                />
              </AdminCreatePanel>
            )}

            <AdminFilterPanel
              columnsClassName="lg:grid-cols-[1fr_320px_auto]"
              onReset={resetFilters}
              resetDisabled={!hasActiveFilters}
              summary={getShownSummary(filteredGroups.length, groups.length)}
            >
              <AdminFilterField label="Поиск" className="block space-y-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Название, код, описание или организация"
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                />
              </AdminFilterField>

              <AdminFilterField label="Организация" className="block space-y-2">
                <select
                  value={organizationFilter}
                  onChange={(event) => setOrganizationFilter(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                >
                  <option value="all">Все организации</option>
                  {sortedOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </AdminFilterField>
            </AdminFilterPanel>

            {loading ? (
              <LoadingBlock text="Загружаем группы..." />
            ) : (
              <SmallTable
                emptyText={getFilteredEmptyText(
                  hasActiveFilters,
                  "Групп по фильтру нет.",
                  "Групп пока нет."
                )}
                rows={filteredGroups}
                selectedRowId={selectedGroup?.id}
                minWidth="860px"
                columns={[
                  { key: "name", title: "Название" },
                  {
                    key: "organization",
                    title: "Организация",
                    render: (row) => organizationsMap[row.organization_id] || row.organization_id,
                  },
                  { key: "code", title: "Код" },
                  {
                    key: "status",
                    title: "Статус",
                    render: (row) => (
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge tone="blue">group</StatusBadge>
                        <StatusBadge tone={row.is_active ? "green" : "gray"}>
                          {row.is_active ? "active" : "inactive"}
                        </StatusBadge>
                      </div>
                    ),
                  },
                  {
                    key: "actions",
                    title: "Действия",
                    render: (row) => (
                      <ActionButton
                        onClick={() => onOpenGroup(row.id)}
                        disabled={selectedGroupLoading}
                      >
                        {selectedGroup?.id === row.id ? "Открыто" : "Открыть"}
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
        <LearningGroupDetailPanel
          groupDetail={selectedGroup}
          organizations={organizations}
          loading={selectedGroupLoading}
          error={selectedGroupError}
          onClose={onCloseGroup}
          onUpdateGroup={onUpdateGroup}
        />
      )}
    </div>
  );
}
