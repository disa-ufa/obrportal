import { useState } from "react";
import { OrganizationDetailPanel } from "../components/admin/OrganizationDetailPanel";
import { OrganizationForm } from "../components/admin/OrganizationForm";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";

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
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);

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
            <div className="flex flex-wrap justify-end gap-2">
              {!showCreateForm ? (
                <ActionButton
                  type="button"
                  tone="blue"
                  onClick={() => setShowCreateForm(true)}
                >
                  Добавить организацию
                </ActionButton>
              ) : (
                <ActionButton
                  type="button"
                  tone="light"
                  onClick={() => setShowCreateForm(false)}
                >
                  Скрыть форму
                </ActionButton>
              )}
            </div>

            {showCreateForm && (
              <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    Новая организация
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Минимально нужны ИНН и название. Остальные поля можно заполнить позже.
                  </p>
                </div>

                <OrganizationForm
                  submitLabel="Создать организацию"
                  successMessage="Организация создана."
                  onSubmit={onCreateOrganization}
                  onCancel={() => setShowCreateForm(false)}
                  onSuccess={() => setShowCreateForm(false)}
                />
              </div>
            )}

            {loading ? (
              <LoadingBlock text="Загружаем организации..." />
            ) : (
              <SmallTable
                emptyText="Организаций нет."
                rows={organizations}
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
