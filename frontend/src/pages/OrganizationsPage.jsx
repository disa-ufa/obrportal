import { useMemo, useState } from "react";
import { OrganizationDetailPanel } from "../components/admin/OrganizationDetailPanel";
import { OrganizationForm } from "../components/admin/OrganizationForm";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { normalizeSearchValue } from "../utils/search";

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");

  const filteredOrganizations = useMemo(
    () => organizations.filter((organization) => (
      organizationMatchesSearch(organization, searchQuery)
      && organizationMatchesScope(organization, scopeFilter)
    )),
    [organizations, searchQuery, scopeFilter]
  );

  function resetFilters() {
    setSearchQuery("");
    setScopeFilter("all");
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
              resetDisabled={!searchQuery && scopeFilter === "all"}
              summary={`Показано: ${filteredOrganizations.length} из ${organizations.length}`}
            >
              <AdminFilterField label="Поиск" className="block space-y-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Название, ИНН, КПП, ОГРН или адрес"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </AdminFilterField>

              <AdminFilterField label="Данные" className="block space-y-2">
                <select
                  value={scopeFilter}
                  onChange={(event) => setScopeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">Все организации</option>
                  <option value="with_kpp">С КПП</option>
                  <option value="without_kpp">Без КПП</option>
                  <option value="with_ogrn">С ОГРН</option>
                  <option value="without_ogrn">Без ОГРН</option>
                </select>
              </AdminFilterField>
            </AdminFilterPanel>

            {loading ? (
              <LoadingBlock text="Загружаем организации..." />
            ) : (
              <SmallTable
                emptyText="Организаций по фильтру нет."
                rows={filteredOrganizations}
                selectedRowId={selectedOrganization?.id}
                minWidth="860px"
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
                      <ActionButton
                        onClick={() => onOpenOrganization(row.id)}
                        disabled={selectedOrganizationLoading}
                      >
                        {selectedOrganization?.id === row.id ? "Открыто" : "Открыть"}
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
