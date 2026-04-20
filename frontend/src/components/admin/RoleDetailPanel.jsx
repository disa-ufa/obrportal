import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";

export function RoleDetailPanel({
  roleDetail,
  loading,
  error,
  onClose,
}) {
  return (
    <SectionCard
      title="Карточка роли"
      subtitle="Детальные данные из GET /api/v1/admin/roles/{role_id}."
    >
      {!roleDetail && !loading && !error && (
        <p className="text-sm text-slate-600">
          Выберите роль в таблице, чтобы открыть карточку.
        </p>
      )}

      {loading && <LoadingBlock text="Загружаем карточку роли..." />}

      {error && (
        <Alert title="Не удалось загрузить роль" tone="red">
          {error}
        </Alert>
      )}

      {roleDetail && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {roleDetail.name}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Код роли: {roleDetail.code}
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
            <StatusBadge tone={roleDetail.code === "admin" ? "amber" : "blue"}>
              {roleDetail.code}
            </StatusBadge>
            <StatusBadge tone="green">
              permissions: {roleDetail.permissions?.length || 0}
            </StatusBadge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="ID" value={roleDetail.id} />
            <DetailField label="Код" value={roleDetail.code} />
            <DetailField label="Создана" value={formatDetailDate(roleDetail.created_at)} />
            <DetailField label="Обновлена" value={formatDetailDate(roleDetail.updated_at)} />
          </div>

          <DetailField label="Описание" value={roleDetail.description} />

          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Права роли
            </div>

            {roleDetail.permissions?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {roleDetail.permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                  >
                    <div className="font-semibold text-slate-900">
                      {permission.code}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {permission.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Права не назначены.
              </p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
