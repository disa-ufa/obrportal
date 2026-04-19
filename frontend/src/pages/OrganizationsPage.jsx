import { OrganizationDetailPanel } from "../components/admin/OrganizationDetailPanel";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";

export function OrganizationsPage({
  user,
  organizations,
  loading,
  selectedOrganization,
  selectedOrganizationLoading,
  selectedOrganizationError,
  onOpenOrganization,
  onCloseOrganization,
}) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Организации"
        subtitle="Read-only справочник организаций из backend."
      >
        {!user ? (
          <p className="text-slate-600">
            Войдите под admin, чтобы увидеть организации.
          </p>
        ) : loading ? (
          <LoadingBlock text="Загружаем организации..." />
        ) : (
          <SmallTable
            emptyText="Организаций нет."
            rows={organizations}
            columns={[
              { key: "name", title: "Название" },
              { key: "inn", title: "ИНН" },
              { key: "kpp", title: "КПП" },
              { key: "ogrn", title: "ОГРН" },
              {
                key: "actions",
                title: "Действия",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => onOpenOrganization(row.id)}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Открыть
                  </button>
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      {user && (
        <OrganizationDetailPanel
          organizationDetail={selectedOrganization}
          loading={selectedOrganizationLoading}
          error={selectedOrganizationError}
          onClose={onCloseOrganization}
        />
      )}
    </div>
  );
}
