import { useEffect, useState } from "react";
import { formatApiError } from "../../utils/apiErrors";
import {
  buildLearningGroupFormData,
  buildOrganizationProfileFormData,
  formatOptional,
} from "../../utils/organizationCabinet";


export function OrganizationProfileCard({ organization, onSave }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(() => buildOrganizationProfileFormData(organization));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFormData(buildOrganizationProfileFormData(organization));
    setError("");
  }, [organization]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      const updated = await onSave(organization.id, formData);
      setFormData(buildOrganizationProfileFormData(updated));
      setEditing(false);
    } catch (err) {
      setError(formatApiError(err, "Не удалось сохранить реквизиты организации."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Организация
          </div>
          <div className="mt-1 text-lg font-bold text-slate-950">
            {organization.label}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            Доступ по роли
          </span>
          <button
            type="button"
            onClick={() => setEditing((current) => !current)}
            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            {editing ? "Отменить" : "Редактировать"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">КПП</span>
              <input
                name="kpp"
                value={formData.kpp}
                onChange={handleChange}
                maxLength={9}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="КПП"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">ОГРН</span>
              <input
                name="ogrn"
                value={formData.ogrn}
                onChange={handleChange}
                maxLength={15}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                placeholder="ОГРН"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Юридический адрес</span>
            <textarea
              name="legal_address"
              value={formData.legal_address}
              onChange={handleChange}
              maxLength={1024}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Юридический адрес"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Фактический адрес</span>
            <textarea
              name="actual_address"
              value={formData.actual_address}
              onChange={handleChange}
              maxLength={1024}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Фактический адрес"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? "Сохраняем..." : "Сохранить реквизиты"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(buildOrganizationProfileFormData(organization));
                setEditing(false);
                setError("");
              }}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">ИНН</div>
          <div className="mt-1 font-semibold text-slate-950">{formatOptional(organization.inn)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">КПП</div>
          <div className="mt-1 font-semibold text-slate-950">{formatOptional(organization.kpp)}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">ОГРН</div>
          <div className="mt-1 font-semibold text-slate-950">{formatOptional(organization.ogrn)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">Юридический адрес</div>
          <div className="mt-1 leading-6 text-slate-900">
            {formatOptional(organization.legal_address)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs text-slate-500">Фактический адрес</div>
          <div className="mt-1 leading-6 text-slate-900">
            {formatOptional(organization.actual_address)}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}


export function LearningGroupEditForm({ group, onSave }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(() => buildLearningGroupFormData(group));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEditing(false);
    setError("");
    setMessage("");
    setFormData(buildLearningGroupFormData(group));
  }, [group]);

  function handleChange(event) {
    const { checked, name, type, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError("Укажите название учебной группы.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await onSave(group.id, formData);

      setFormData(buildLearningGroupFormData(updated));
      setEditing(false);
      setMessage("Учебная группа обновлена.");
    } catch (err) {
      setError(formatApiError(err, "Не удалось обновить учебную группу."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-950">Настройки группы</div>
          <div className="mt-1 text-xs text-slate-500">
            Название, код, описание и активность группы.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((current) => !current);
            setError("");
            setMessage("");
            setFormData(buildLearningGroupFormData(group));
          }}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          {editing ? "Отменить" : "Редактировать группу"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {message && !editing && (
        <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200">
          {message}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Название группы</span>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              maxLength={255}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Название группы"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Код группы</span>
            <input
              name="code"
              value={formData.code}
              onChange={handleChange}
              maxLength={64}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Код группы"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Описание</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              maxLength={1024}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              placeholder="Описание группы"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
            <input
              name="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-semibold text-slate-700">Группа активна</span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? "Сохраняем..." : "Сохранить группу"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
                setMessage("");
                setFormData(buildLearningGroupFormData(group));
              }}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  );
}


export function EmptyState({ title, text }) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <div className="text-lg font-semibold text-slate-950">{title}</div>
      <div className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}


export function OrganizationCabinetHero({ children }) {
  return (
    <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm md:p-8">
      {children}
    </section>
  );
}


export function OrganizationGroupCreateSection({
  organizations,
  groupForm,
  creatingGroup,
  groupActionError,
  groupActionMessage,
  onCreateGroup,
  onGroupFormChange,
}) {
  if (organizations.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Создать учебную группу</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Группа будет создана только в организации, доступной текущему представителю.
          </p>
        </div>
      </div>

      {groupActionError && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {groupActionError}
        </div>
      )}

      {groupActionMessage && (
        <div className="mt-4 rounded-2xl bg-green-50 p-4 text-sm text-green-800 ring-1 ring-green-200">
          {groupActionMessage}
        </div>
      )}

      <form onSubmit={onCreateGroup} className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Организация</span>
          <select
            name="organization_id"
            value={groupForm.organization_id}
            onChange={onGroupFormChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Название группы</span>
          <input
            name="name"
            value={groupForm.name}
            onChange={onGroupFormChange}
            maxLength={255}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            placeholder="Например: Сотрудники филиала №1"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Код группы</span>
          <input
            name="code"
            value={groupForm.code}
            onChange={onGroupFormChange}
            maxLength={64}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            placeholder="Например: FILIAL-1-2026"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
          <input
            name="is_active"
            type="checkbox"
            checked={groupForm.is_active}
            onChange={onGroupFormChange}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm font-semibold text-slate-700">Группа активна</span>
        </label>

        <label className="block lg:col-span-2">
          <span className="text-xs font-semibold text-slate-500">Описание</span>
          <textarea
            name="description"
            value={groupForm.description}
            onChange={onGroupFormChange}
            maxLength={1024}
            rows={3}
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            placeholder="Комментарий для внутренней навигации по группе"
          />
        </label>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={creatingGroup}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
          >
            {creatingGroup ? "Создаём..." : "Создать группу"}
          </button>
        </div>
      </form>
    </section>
  );
}


export function OrganizationProfileSection({
  organizations,
  onSaveOrganization,
}) {
  if (organizations.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[2rem] bg-slate-50 p-1">
      <div className="rounded-[1.8rem] bg-white/70 p-5 ring-1 ring-slate-200 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Реквизиты организации</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Данные берутся из профиля организации и показываются только в рамках доступного org-scope.
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            {organizations.length} в доступе
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          {organizations.map((organization) => (
            <OrganizationProfileCard
              key={organization.id}
              organization={organization}
              onSave={onSaveOrganization}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


export function OrganizationCabinetStats({
  summary,
  organizations,
  groups,
  activeGroupsCount,
  inactiveGroupsCount,
  selectedGroup,
  selectedGroupId,
  members,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryCard
        label="Организаций в доступе"
        value={summary.organizations_count ?? organizations.length}
        hint="По scope назначенной роли"
      />
      <SummaryCard
        label="Учебных групп"
        value={summary.groups_count ?? groups.length}
        hint={`${summary.active_groups_count ?? activeGroupsCount} активных / ${inactiveGroupsCount} неактивных`}
      />
      <SummaryCard
        label="Участников выбранной группы"
        value={selectedGroupId ? members.length : "—"}
        hint={selectedGroup ? selectedGroup.name : "Выберите группу"}
      />
    </div>
  );
}


export function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
      {hint && <div className="mt-2 text-sm text-slate-500">{hint}</div>}
    </div>
  );
}
