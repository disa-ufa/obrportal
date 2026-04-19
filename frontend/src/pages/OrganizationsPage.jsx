import { OrganizationDetailPanel } from "../components/admin/OrganizationDetailPanel";
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
