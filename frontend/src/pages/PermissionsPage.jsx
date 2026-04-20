import { PermissionDetailPanel } from "../components/admin/PermissionDetailPanel";
import { ActionButton } from "../components/ui/ActionButton";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";

export function PermissionsPage({
  user,
  permissions,
  loading,
  selectedPermission,
  selectedPermissionLoading,
  selectedPermissionError,
  onOpenPermission,
  onClosePermission,
}) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Права"
        subtitle="Read-only список permissions."
      >
        {!user ? (
          <p className="text-slate-600">Войдите под admin, чтобы увидеть права.</p>
        ) : loading ? (
          <LoadingBlock text="Загружаем права..." />
        ) : (
          <SmallTable
            emptyText="Прав нет."
            rows={permissions}
            selectedRowId={selectedPermission?.id}
            minWidth="900px"
            columns={[
              {
                key: "code",
                title: "Код",
                render: (row) => (
                  <StatusBadge tone="blue">
                    {row.code}
                  </StatusBadge>
                ),
              },
              { key: "name", title: "Название" },
              { key: "description", title: "Описание" },
              {
                key: "actions",
                title: "Действия",
                render: (row) => (
                  <ActionButton
                    onClick={() => onOpenPermission(row.id)}
                    disabled={selectedPermissionLoading}
                  >
                    {selectedPermission?.id === row.id ? "Открыто" : "Открыть"}
                  </ActionButton>
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      {user && (
        <PermissionDetailPanel
          permissionDetail={selectedPermission}
          loading={selectedPermissionLoading}
          error={selectedPermissionError}
          onClose={onClosePermission}
        />
      )}
    </div>
  );
}
