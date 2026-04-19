import { Alert } from "../ui/Alert";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";

function Field({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ru-RU");
}

export function UserDetailPanel({
  userDetail,
  loading,
  error,
  onClose,
}) {
  return (
    <SectionCard
      title="Карточка пользователя"
      subtitle="Детальные данные из GET /api/v1/admin/users/{user_id}."
    >
      {!userDetail && !loading && !error && (
        <p className="text-sm text-slate-600">
          Выберите пользователя в таблице, чтобы открыть карточку.
        </p>
      )}

      {loading && <LoadingBlock text="Загружаем карточку пользователя..." />}

      {error && (
        <Alert title="Не удалось загрузить пользователя" tone="red">
          {error}
        </Alert>
      )}

      {userDetail && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {userDetail.full_name || userDetail.email}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {userDetail.email}
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
            <StatusBadge tone={userDetail.is_active ? "green" : "red"}>
              {userDetail.is_active ? "active" : "inactive"}
            </StatusBadge>
            <StatusBadge tone={userDetail.is_email_verified ? "green" : "gray"}>
              email verified: {userDetail.is_email_verified ? "yes" : "no"}
            </StatusBadge>
            <StatusBadge tone={userDetail.mfa_enabled ? "green" : "gray"}>
              mfa: {userDetail.mfa_enabled ? "enabled" : "disabled"}
            </StatusBadge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ID" value={userDetail.id} />
            <Field label="Телефон" value={userDetail.phone} />
            <Field label="Создан" value={formatDate(userDetail.created_at)} />
            <Field label="Обновлён" value={formatDate(userDetail.updated_at)} />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Роли
            </div>

            {userDetail.roles?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {userDetail.roles.map((role) => (
                  <div
                    key={`${role.code}-${role.organization_id || "global"}`}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                  >
                    <div className="font-semibold text-slate-900">
                      {role.code}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {role.name}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      organization_id: {role.organization_id || "global"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Роли не назначены.
              </p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
