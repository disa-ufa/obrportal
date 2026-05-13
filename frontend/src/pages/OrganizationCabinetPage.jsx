import { useEffect, useMemo, useState } from "react";
import { getOrgLearningGroupMembers, getOrgLearningGroups, getOrgProfile, updateOrgProfile } from "../api/client";
import { formatApiError } from "../utils/apiErrors";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}


function formatOptional(value) {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return "—";
  }

  return value;
}


function shortId(value) {
  if (!value) {
    return "—";
  }

  return `${value.slice(0, 8)}…`;
}

function buildOrganizationOptions(profileOrganizations = [], groups = []) {
  if (Array.isArray(profileOrganizations) && profileOrganizations.length > 0) {
    return profileOrganizations.map((organization) => ({
      id: organization.id,
      label: organization.name || shortId(organization.id),
      inn: organization.inn,
      kpp: organization.kpp,
      ogrn: organization.ogrn,
      legal_address: organization.legal_address,
      actual_address: organization.actual_address,
    }));
  }

  const uniqueIds = [];

  groups.forEach((group) => {
    if (group.organization_id && !uniqueIds.includes(group.organization_id)) {
      uniqueIds.push(group.organization_id);
    }
  });

  return uniqueIds.map((id, index) => ({
    id,
    label: uniqueIds.length === 1 ? "Моя организация" : `Организация ${index + 1}`,
  }));
}

function getOrganizationLabel(organizationId, organizations) {
  return organizations.find((item) => item.id === organizationId)?.label || shortId(organizationId);
}

function getGroupStatus(group) {
  return group.is_active
    ? { label: "Активная", className: "bg-green-50 text-green-700 ring-green-200" }
    : { label: "Неактивная", className: "bg-slate-100 text-slate-600 ring-slate-200" };
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
      {hint && <div className="mt-2 text-sm text-slate-500">{hint}</div>}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <div className="text-lg font-semibold text-slate-950">{title}</div>
      <div className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}



function buildOrganizationProfileFormData(organization) {
  return {
    kpp: organization.kpp || "",
    ogrn: organization.ogrn || "",
    legal_address: organization.legal_address || "",
    actual_address: organization.actual_address || "",
  };
}


function OrganizationProfileCard({ organization, onSave }) {
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


export function OrganizationCabinetPage({ user, onPageChange, onLogout }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [members, setMembers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");
  const [membersError, setMembersError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        setLoading(true);
        setError("");

        const [profileResponse, groupsResponse] = await Promise.all([
          getOrgProfile(),
          getOrgLearningGroups(),
        ]);
        const items = Array.isArray(groupsResponse) ? groupsResponse : [];

        if (cancelled) {
          return;
        }

        setGroups(items);
        setProfile(profileResponse && typeof profileResponse === "object" ? profileResponse : null);
        setSelectedGroupId((current) => current || items[0]?.id || "");
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err, "Не удалось загрузить данные организации."));
          setGroups([]);
          setProfile(null);
          setSelectedGroupId("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      if (!selectedGroupId) {
        setMembers([]);
        setMembersError("");
        return;
      }

      try {
        setMembersLoading(true);
        setMembersError("");

        const response = await getOrgLearningGroupMembers(selectedGroupId);

        if (!cancelled) {
          setMembers(Array.isArray(response) ? response : []);
        }
      } catch (err) {
        if (!cancelled) {
          setMembers([]);
          setMembersError(formatApiError(err, "Не удалось загрузить участников группы."));
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  const organizations = useMemo(() => buildOrganizationOptions(profile?.organizations || [], groups), [profile, groups]);
  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const activeGroupsCount = useMemo(
    () => groups.filter((group) => group.is_active).length,
    [groups]
  );

  const summary = profile?.summary || {
    organizations_count: organizations.length,
    groups_count: groups.length,
    active_groups_count: activeGroupsCount,
    members_count: 0,
  };

  const inactiveGroupsCount = Math.max(
    (summary.groups_count ?? groups.length) - (summary.active_groups_count ?? activeGroupsCount),
    0
  );

  async function handleSaveOrganization(organizationId, payload) {
    const updated = await updateOrgProfile(organizationId, payload);

    setProfile((current) => {
      if (!current || !Array.isArray(current.organizations)) {
        return current;
      }

      return {
        ...current,
        organizations: current.organizations.map((organization) =>
          organization.id === updated.id ? updated : organization
        ),
      };
    });

    return updated;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm md:p-8">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-200">
          Кабинет организации
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Управление обучением сотрудников
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 md:text-base">
              Здесь представитель юридического лица видит учебные группы своей организации,
              участников групп и дальнейшие корпоративные назначения.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
                {user?.full_name || user?.email || "Пользователь"}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
                Роль: представитель ЮЛ
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onPageChange("catalog")}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Каталог программ
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15"
            >
              Выйти
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-3xl bg-red-50 p-5 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

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

      {organizations.length > 0 && (
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
                  onSave={handleSaveOrganization}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="rounded-3xl bg-white p-8 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
          Загружаем кабинет организации...
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="Учебные группы пока не созданы"
          text="После добавления групп они появятся в этом кабинете. Представитель ЮЛ будет видеть только группы организаций, к которым привязана его роль."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Учебные группы</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Доступ ограничен организациями, назначенными текущему представителю.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Группа</th>
                      <th className="px-4 py-3">Организация</th>
                      <th className="px-4 py-3">Код</th>
                      <th className="px-4 py-3">Статус</th>
                      <th className="px-4 py-3">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {groups.map((group) => {
                      const status = getGroupStatus(group);
                      const isSelected = group.id === selectedGroupId;

                      return (
                        <tr key={group.id} className={isSelected ? "bg-blue-50/60" : ""}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-950">{group.name}</div>
                            {group.description && (
                              <div className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                                {group.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {getOrganizationLabel(group.organization_id, organizations)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{group.code || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setSelectedGroupId(group.id)}
                              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-300"
                              disabled={isSelected}
                            >
                              {isSelected ? "Открыта" : "Открыть"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-950">Участники группы</h2>

            {selectedGroup ? (
              <div className="mt-2 text-sm text-slate-500">
                {selectedGroup.name}
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-500">Группа не выбрана.</div>
            )}

            {selectedGroup && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                <div>
                  <span className="text-slate-500">Организация:</span>{" "}
                  <span className="font-semibold text-slate-900">
                    {getOrganizationLabel(selectedGroup.organization_id, organizations)}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-500">Создана:</span>{" "}
                  <span className="font-semibold text-slate-900">
                    {formatDate(selectedGroup.created_at)}
                  </span>
                </div>
              </div>
            )}

            {membersError && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
                {membersError}
              </div>
            )}

            {membersLoading ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Загружаем участников...
              </div>
            ) : members.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                В выбранной группе пока нет участников.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                  >
                    <div className="font-semibold text-slate-950">
                      {member.user_full_name || member.user_email || member.user_id}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {member.user_email || "Email не указан"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Добавлен: {formatDate(member.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      <section className="rounded-[2rem] bg-blue-50 p-6 ring-1 ring-blue-100">
        <div className="text-lg font-bold text-slate-950">Следующие разделы кабинета ЮЛ</div>
        <div className="mt-2 text-sm leading-6 text-slate-700">
          На этом шаге подключён безопасный маршрут и чтение групп по org-scope.
          Далее можно добавить корпоративные заявки на обучение, массовые назначения и документы по сотрудникам.
        </div>
      </section>
    </div>
  );
}
