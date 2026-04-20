import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";

export function PermissionDetailPanel({
  permissionDetail,
  loading,
  error,
  onClose,
}) {
  return (
    <SectionCard
      title="Карточка права"
      subtitle="Детальные данные из GET /api/v1/admin/permissions/{permission_id}."
    >
      {!permissionDetail && !loading && !error && (
        <p className="text-sm text-slate-600">
          Выберите право в таблице, чтобы открыть карточку.
        </p>
      )}

      {loading && <LoadingBlock text="Загружаем карточку права..." />}

      {error && (
        <Alert title="Не удалось загрузить право" tone="red">
          {error}
        </Alert>
      )}

      {permissionDetail && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {permissionDetail.name}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Код права: {permissionDetail.code}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Закрыть
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="blue">
              {permissionDetail.code}
            </StatusBadge>
            <StatusBadge tone="green">
              roles: {permissionDetail.roles?.length || 0}
            </StatusBadge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="ID" value={permissionDetail.id} />
            <DetailField label="Код" value={permissionDetail.code} />
            <DetailField label="Создано" value={formatDetailDate(permissionDetail.created_at)} />
            <DetailField label="Обновлено" value={formatDetailDate(permissionDetail.updated_at)} />
          </div>

          <DetailField label="Описание" value={permissionDetail.description} />

          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Роли с этим правом
            </div>

            {permissionDetail.roles?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {permissionDetail.roles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={role.code === "admin" ? "amber" : "blue"}>
                        {role.code}
                      </StatusBadge>
                    </div>

                    <div className="mt-3 font-semibold text-slate-900">
                      {role.name}
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                      {role.description || "Описание не заполнено."}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Это право пока не назначено ни одной роли.
              </p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
