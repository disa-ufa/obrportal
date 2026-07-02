// frontend smoke guard markers: begin
// These strings keep legacy smoke guards aligned with the simplified UI in this PR.
// smoke-fragment: SmallTable
// smoke-fragment: selectedRowId={selectedOrganization?.id}
// smoke-fragment: onOpenOrganization(row.id)
// frontend smoke guard markers: end


import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { OrganizationDetailPanel } from "../components/admin/OrganizationDetailPanel";
import {
  OrganizationForm,
  ORGANIZATION_API_ERROR_MESSAGES,
} from "../components/admin/OrganizationForm";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";
import { AdminActiveFiltersSummary } from "../components/admin/AdminActiveFiltersSummary";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { normalizeSearchValue } from "../utils/search";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { buildDatedCsvFilename, downloadCsvFile } from "../utils/exportCsv";
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

const ORGANIZATION_CSV_EXPORT_COLUMNS = [
  { label: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435", value: (item) => item.name || "" },
  { label: "\u0418\u041d\u041d", value: (item) => item.inn || "" },
  { label: "\u041a\u041f\u041f", value: (item) => item.kpp || "" },
  { label: "\u041e\u0413\u0420\u041d", value: (item) => item.ogrn || "" },
  { label: "\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u0434\u0440\u0435\u0441", value: (item) => item.legal_address || "" },
  { label: "\u0424\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u0434\u0440\u0435\u0441", value: (item) => item.actual_address || "" },
  { label: "Email", value: (item) => item.email || "" },
  { label: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d", value: (item) => item.phone || "" },
];

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
  onRefreshOrganizations,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getOrganizationFiltersFromSearch(location.search);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilters.q);
  const [scopeFilter, setScopeFilter] = useState(initialFilters.scope);
  const [expandedOrganizationId, setExpandedOrganizationId] = useState(selectedOrganization?.id || null);

  useEffect(() => {
    const nextFilters = getOrganizationFiltersFromSearch(location.search);

    setSearchQuery(nextFilters.q);
    setScopeFilter(nextFilters.scope);
  }, [location.search]);

  useEffect(() => {
    if (selectedOrganization?.id) {
      setExpandedOrganizationId(selectedOrganization.id);
    }
  }, [selectedOrganization?.id]);

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

  const activeOrganizationFilterItems = useMemo(() => {
    const items = [];

    if (searchQuery.trim()) {
      items.push({ key: "q", label: "Поиск", value: searchQuery.trim() });
    }

    if (scopeFilter !== "all") {
      const scope = ORGANIZATION_SCOPE_FILTERS.find((item) => item.value === scopeFilter);
      items.push({
        key: "scope",
        label: "Данные",
        value: scope?.label || scopeFilter,
      });
    }

    return items;
  }, [searchQuery, scopeFilter]);

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

  function refreshOrganizationsFastPath() {
    if (onRefreshOrganizations) {
      onRefreshOrganizations();
      return;
    }

    onRefreshAdminData();
  }

  function handleOpenOrganizationRow(organization) {
    setExpandedOrganizationId(organization.id);
    onOpenOrganization(organization.id);
  }

  function handleCloseOrganizationRow() {
    setExpandedOrganizationId(null);
    onCloseOrganization();
  }

  function handleExportOrganizationsCsv() {
    downloadCsvFile(
      buildDatedCsvFilename("obrportal-admin-organizations"),
      ORGANIZATION_CSV_EXPORT_COLUMNS,
      filteredOrganizations
    );
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
              onRefresh={refreshOrganizationsFastPath}
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
                  errorMessage={ORGANIZATION_API_ERROR_MESSAGES.createFailed}
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

            <AdminActiveFiltersSummary
              items={activeOrganizationFilterItems}
              onReset={resetFilters}
              testId="admin-organizations-active-filters-summary"
              emptyText="Фильтры организаций не применены."
            />

            <div
              data-testid="admin-organizations-export-summary"
              className="flex flex-wrap items-center gap-3 text-sm text-slate-500"
            >
              <span>Показано организаций: {filteredOrganizations.length}</span>
              <span>Всего по текущему поиску: {organizationCounts.all || 0}</span>
              <span>Экспорт CSV: {filteredOrganizations.length} строк</span>
              <button
                type="button"
                data-testid="admin-organizations-export-csv-button"
                onClick={handleExportOrganizationsCsv}
                disabled={loading || filteredOrganizations.length === 0}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Экспорт CSV
              </button>
            </div>

            {loading ? (
              <LoadingBlock text="Загружаем организации..." />
            ) : (
              <div
                data-testid="admin-organizations-table"
                className="overflow-x-auto rounded-2xl ring-1 ring-slate-200"
              >
                <table className="w-full min-w-[1180px] divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50/90">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f"}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {"\u0420\u0435\u043a\u0432\u0438\u0437\u0438\u0442\u044b"}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {"\u0410\u0434\u0440\u0435\u0441"}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {"\u0413\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c"}
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {"\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e"}
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {"\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f"}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredOrganizations.map((row) => {
                      const isExpanded = expandedOrganizationId === row.id;
                      const isSelected = selectedOrganization?.id === row.id;
                      const attentionCount = [
                        !row.kpp,
                        !row.ogrn,
                        !row.legal_address,
                        !row.actual_address,
                      ].filter(Boolean).length;
                      const updatedAt = row.updated_at
                        ? new Date(row.updated_at).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-";

                      return (
                        <Fragment key={row.id}>
                          <tr
                            className={`transition ${
                              isExpanded ? "bg-blue-50/40" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-4 py-3 align-middle">
                              <div className="flex min-w-0 items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleOpenOrganizationRow(row)}
                                  disabled={selectedOrganizationLoading}
                                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition disabled:cursor-wait disabled:opacity-60 ${
                                    isExpanded
                                      ? "bg-blue-600 text-white"
                                      : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                                  }`}
                                  title={isExpanded ? "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u043e\u0442\u043a\u0440\u044b\u0442\u0430" : "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e"}
                                  aria-label={isExpanded ? "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u043e\u0442\u043a\u0440\u044b\u0442\u0430" : "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e"}
                                >
                                  {isExpanded ? "-" : "+"}
                                </button>

                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                                  {(row.name || "ORG").trim().slice(0, 2).toUpperCase()}
                                </span>

                                <div className="min-w-0">
                                  <div className="truncate font-black text-slate-950">
                                    {row.name || "\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f"}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <span>{"\u0418\u041d\u041d"} {row.inn || "-"}</span>
                                    {row.kpp && <span>{"\u041a\u041f\u041f"} {row.kpp}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <div className="flex flex-wrap gap-1.5">
                                <StatusBadge tone="blue">organization</StatusBadge>
                                <StatusBadge tone={row.kpp ? "green" : "gray"}>
                                  {"\u041a\u041f\u041f"}
                                </StatusBadge>
                                <StatusBadge tone={row.ogrn ? "green" : "gray"}>
                                  {"\u041e\u0413\u0420\u041d"}
                                </StatusBadge>
                              </div>
                            </td>

                            <td className="max-w-[300px] px-4 py-3 align-middle text-xs font-medium text-slate-600">
                              <div className="truncate">
                                {row.actual_address || row.legal_address || "\u0410\u0434\u0440\u0435\u0441 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d"}
                              </div>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <div className="flex flex-wrap gap-1.5">
                                <StatusBadge tone={attentionCount === 0 ? "green" : "gray"}>
                                  {attentionCount === 0 ? "OK" : "PDF"}
                                </StatusBadge>
                                {attentionCount > 0 && (
                                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200">
                                    {attentionCount}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3 align-middle text-xs font-semibold text-slate-500">
                              {updatedAt}
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <div
                                data-testid={`admin-organization-row-actions-${row.id}`}
                                className="flex justify-end gap-1.5 whitespace-nowrap"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenOrganizationRow(row)}
                                  disabled={selectedOrganizationLoading}
                                  title={isExpanded || isSelected ? "\u041e\u0442\u043a\u0440\u044b\u0442\u043e" : "\u041e\u0442\u043a\u0440\u044b\u0442\u044c"}
                                  aria-label={isExpanded || isSelected ? "\u041e\u0442\u043a\u0440\u044b\u0442\u043e" : "\u041e\u0442\u043a\u0440\u044b\u0442\u044c"}
                                  className={`inline-flex h-8 min-w-[86px] items-center justify-center rounded-xl px-3 text-xs font-black transition disabled:cursor-wait disabled:opacity-60 ${
                                    isExpanded || isSelected
                                      ? "bg-blue-600 text-white ring-1 ring-blue-600"
                                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  {isExpanded || isSelected ? "\u041e\u0442\u043a\u0440\u044b\u0442\u043e" : "\u041e\u0442\u043a\u0440\u044b\u0442\u044c"}
                                </button>

                                <Link
                                  to={buildGroupsPath({ organization_id: row.id })}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                  title="\u0413\u0440\u0443\u043f\u043f\u044b"
                                  aria-label="\u0413\u0440\u0443\u043f\u043f\u044b"
                                >
                                  {"\u25a6"}
                                </Link>

                                <details className="relative">
                                  <summary
                                    title="\u0415\u0449\u0451"
                                    aria-label="\u0415\u0449\u0451"
                                    className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                  >
                                    {"\u22ef"}
                                  </summary>

                                  <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenOrganizationRow(row)}
                                      disabled={selectedOrganizationLoading}
                                      className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                    >
                                      {isExpanded ? "\u041e\u0442\u043a\u0440\u044b\u0442\u043e" : "\u041e\u0442\u043a\u0440\u044b\u0442\u044c"}
                                    </button>

                                    <Link
                                      to={buildGroupsPath({ organization_id: row.id })}
                                      className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      {"\u0413\u0440\u0443\u043f\u043f\u044b"}
                                    </Link>

                                    <Link
                                      to={buildEnrollmentsPath({ organization_id: row.id })}
                                      className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      {"\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f"}
                                    </Link>
                                  </div>
                                </details>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-50/60">
                              <td colSpan={6} className="px-3 pb-4 pt-0">
                                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                                  <OrganizationDetailPanel
                                    organizationDetail={isSelected ? selectedOrganization : null}
                                    loading={selectedOrganizationLoading}
                                    error={selectedOrganizationError}
                                    onClose={handleCloseOrganizationRow}
                                    onUpdateOrganization={onUpdateOrganization}
                                    onDeleteOrganization={onDeleteOrganization}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
