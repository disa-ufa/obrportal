import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { OrganizationDetailPanel } from "../components/admin/OrganizationDetailPanel";
import { OrganizationForm } from "../components/admin/OrganizationForm";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { normalizeSearchValue } from "../utils/search";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { ADMIN_FILTER_CONTROL_SOFT_CLASS } from "../utils/adminClasses";
import { buildEnrollmentsPath, buildGroupsPath, buildOrganizationsPath } from "../utils/adminLinks";

function organizationMatchesSearch(organization, query) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    organization.name,
    organization.inn,
    organization.kpp,
    organization.ogrn,
    organization.legal_address,
    organization.actual_address,
  ]
    .map(normalizeSearchValue)
    .some((value) => value.includes(normalizedQuery));
}

function organizationMatchesScope(organization, scope) {
  if (scope === "with_kpp") {
    return Boolean(organization.kpp);
  }

  if (scope === "without_kpp") {
    return !organization.kpp;
  }

  if (scope === "with_ogrn") {
    return Boolean(organization.ogrn);
  }

  if (scope === "without_ogrn") {
    return !organization.ogrn;
  }

  return true;
}

const ORGANIZATION_SCOPE_FILTERS = [
  { value: "all", label: "Все" },
  { value: "with_kpp", label: "С КПП" },
  { value: "without_kpp", label: "Без КПП" },
  { value: "with_ogrn", label: "С ОГРН" },
  { value: "without_ogrn", label: "Без ОГРН" },
];

function getOrganizationFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    scope: params.get("scope") || "all",
  };
}

function calculateOrganizationCounts(items) {
  const counts = {
    all: Array.isArray(items) ? items.length : 0,
    with_kpp: 0,
    without_kpp: 0,
    with_ogrn: 0,
    without_ogrn: 0,
  };

  if (!Array.isArray(items)) {
    return counts;
  }

  items.forEach((organization) => {
    if (organization.kpp) {
      counts.with_kpp += 1;
    } else {
      counts.without_kpp += 1;
    }

    if (organization.ogrn) {
      counts.with_ogrn += 1;
    } else {
      counts.without_ogrn += 1;
    }
  });

  return counts;
}

export function OrganizationsPage({
  user,
  organizations,
  loading,
  selectedOrganization,
  selectedOrganizationLoading,
  selectedOrganizationError,
  onOpenOrganization,
  onCloseOrganization,
  onCreateOrganization,
  onUpdateOrganization,
  onDeleteOrganization,
  onRefreshAdminData,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getOrganizationFiltersFromSearch(location.search);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilters.q);
  const [scopeFilter, setScopeFilter] = useState(initialFilters.scope);

  useEffect(() => {
    const nextFilters = getOrganizationFiltersFromSearch(location.search);

    setSearchQuery(nextFilters.q);
    setScopeFilter(nextFilters.scope);
  }, [location.search]);

  const baseFilteredOrganizations = useMemo(
    () => organizations.filter((organization) =>
      organizationMatchesSearch(organization, searchQuery)
    ),
    [organizations, searchQuery]
  );

  const organizationCounts = useMemo(
    () => calculateOrganizationCounts(baseFilteredOrganizations),
    [baseFilteredOrganizations]
  );

  const filteredOrganizations = useMemo(
    () => baseFilteredOrganizations.filter((organization) =>
      organizationMatchesScope(organization, scopeFilter)
    ),
    [baseFilteredOrganizations, scopeFilter]
  );

  const hasActiveFilters = Boolean(searchQuery.trim()) || scopeFilter !== "all";

  function buildOrganizationFilters(overrides = {}) {
    return {
      q: overrides.q ?? searchQuery,
      scope: overrides.scope ?? scopeFilter,
    };
  }

  function navigateToOrganizationFilters(filters, options = { replace: true }) {
    const nextPath = buildOrganizationsPath(filters);
    const currentPath = `${location.pathname}${location.search}`;

    if (currentPath === nextPath) {
      return;
    }

    navigate(nextPath, options);
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
    navigateToOrganizationFilters(buildOrganizationFilters({ q: value }));
  }

  function handleScopeChange(value) {
    setScopeFilter(value);
    navigateToOrganizationFilters(buildOrganizationFilters({ scope: value }));
  }

  function resetFilters() {
    setSearchQuery("");
    setScopeFilter("all");
    navigateToOrganizationFilters({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Организации"
        subtitle="Справочник организаций из backend."
      >
        {!user ? (
          <p className="text-slate-600">
            Войдите под admin, чтобы увидеть организации.
          </p>
        ) : (
          <div className="space-y-5">
            <AdminPageActions
              loading={loading}
              onRefresh={onRefreshAdminData}
              primaryLabel={showCreateForm ? "Скрыть форму" : "Добавить организацию"}
              primaryTone={showCreateForm ? "light" : "blue"}
              onPrimaryClick={() => setShowCreateForm((current) => !current)}
            />

            {showCreateForm && (
              <AdminCreatePanel
                title="Новая организация"
                subtitle="Минимально нужны ИНН и название. Остальные поля можно заполнить позже."
              >
                <OrganizationForm
                  submitLabel="Создать организацию"
                  successMessage="Организация создана."
                  onSubmit={onCreateOrganization}
                  onCancel={() => setShowCreateForm(false)}
                  onSuccess={() => setShowCreateForm(false)}
                />
              </AdminCreatePanel>
            )}

            <AdminFilterPanel
              columnsClassName="lg:grid-cols-[1fr_260px_auto]"
              onReset={resetFilters}
              resetDisabled={!hasActiveFilters}
              summary={getShownSummary(filteredOrganizations.length, organizations.length)}
            >
              <AdminFilterField label="Поиск" className="block space-y-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Название, ИНН, КПП, ОГРН или адрес"
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                />
              </AdminFilterField>

              <AdminFilterField label="Данные" className="block space-y-2">
                <select
                  value={scopeFilter}
                  onChange={(event) => handleScopeChange(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                >
                  <option value="all">Все организации</option>
                  <option value="with_kpp">С КПП</option>
                  <option value="without_kpp">Без КПП</option>
                  <option value="with_ogrn">С ОГРН</option>
                  <option value="without_ogrn">Без ОГРН</option>
                </select>
              </AdminFilterField>
            </AdminFilterPanel>

            <AdminQuickFilterButtons
              items={ORGANIZATION_SCOPE_FILTERS}
              activeValue={scopeFilter}
              counts={organizationCounts}
              disabled={loading}
              onChange={handleScopeChange}
            />

            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Показано организаций: {filteredOrganizations.length}</span>
              <span>Всего по текущему поиску: {organizationCounts.all || 0}</span>
            </div>

            {loading ? (
              <LoadingBlock text="Загружаем организации..." />
            ) : (
              <SmallTable
                emptyText={getFilteredEmptyText(
                  hasActiveFilters,
                  "Организаций по фильтру нет.",
                  "Организаций нет."
                )}
                rows={filteredOrganizations}
                selectedRowId={selectedOrganization?.id}
                minWidth="980px"
                columns={[
                  { key: "name", title: "Название" },
                  { key: "inn", title: "ИНН" },
                  { key: "kpp", title: "КПП" },
                  { key: "ogrn", title: "ОГРН" },
                  {
                    key: "status",
                    title: "Статус",
                    render: (row) => (
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge tone="blue">organization</StatusBadge>
                        <StatusBadge tone={row.kpp ? "green" : "gray"}>
                          КПП
                        </StatusBadge>
                        <StatusBadge tone={row.ogrn ? "green" : "gray"}>
                          ОГРН
                        </StatusBadge>
                      </div>
                    ),
                  },
                  {
                    key: "actions",
                    title: "Действия",
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => onOpenOrganization(row.id)}
                          disabled={selectedOrganizationLoading}
                        >
                          {selectedOrganization?.id === row.id ? "Открыто" : "Открыть"}
                        </ActionButton>

                        <Link
                          to={buildGroupsPath({ organization_id: row.id })}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                        >
                          Группы
                        </Link>

                        <Link
                          to={buildEnrollmentsPath({ q: row.name })}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                        >
                          Назначения
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </SectionCard>

      {user && (
        <OrganizationDetailPanel
          organizationDetail={selectedOrganization}
          loading={selectedOrganizationLoading}
          error={selectedOrganizationError}
          onClose={onCloseOrganization}
          onUpdateOrganization={onUpdateOrganization}
          onDeleteOrganization={onDeleteOrganization}
        />
      )}
    </div>
  );
}
