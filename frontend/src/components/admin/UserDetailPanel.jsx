import { useState } from "react";
import { UserForm } from "./UserForm";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";

export function UserDetailPanel({
  userDetail,
  loading,
  error,
  onClose,
  onUpdateUser,
  onActivateUser,
  onDeactivateUser,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  function handleClose() {
    setIsEditing(false);
    setActionError("");
    onClose();
  }

  async function handleActivate() {
    setActionLoading(true);
    setActionError("");

    try {
      await onActivateUser(userDetail.id);
    } catch (err) {
      setActionError(`${err.status || ""} ${err.message}`.trim());
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate() {
    setActionLoading(true);
    setActionError("");

    try {
      await onDeactivateUser(userDetail.id);
    } catch (err) {
      setActionError(`${err.status || ""} ${err.message}`.trim());
    } finally {
      setActionLoading(false);
    }
  }

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

            <div className="flex flex-wrap gap-2">
              {!isEditing && (
                <ActionButton
                  type="button"
                  tone="blue"
                  onClick={() => setIsEditing(true)}
                  disabled={actionLoading}
                >
                  Редактировать
                </ActionButton>
              )}

              {userDetail.is_active ? (
                <ActionButton
                  type="button"
                  tone="red"
                  onClick={handleDeactivate}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Выполняем..." : "Деактивировать"}
                </ActionButton>
              ) : (
                <ActionButton
                  type="button"
                  tone="blue"
                  onClick={handleActivate}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Выполняем..." : "Активировать"}
                </ActionButton>
              )}

              <ActionButton
                type="button"
                tone="light"
                onClick={handleClose}
                disabled={actionLoading}
              >
                Закрыть
              </ActionButton>
            </div>
          </div>

          {actionError && (
            <Alert title="Не удалось выполнить действие" tone="red">
              {actionError}
            </Alert>
          )}

          {isEditing ? (
            <UserForm
              initialValues={userDetail}
              submitLabel="Сохранить изменения"
              successMessage="Пользователь обновлён."
              onSubmit={(payload) => onUpdateUser(userDetail.id, payload)}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => setIsEditing(false)}
            />
          ) : (
            <>
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
                <DetailField label="ID" value={userDetail.id} />
                <DetailField label="Телефон" value={userDetail.phone} />
                <DetailField label="Создан" value={formatDetailDate(userDetail.created_at)} />
                <DetailField label="Обновлён" value={formatDetailDate(userDetail.updated_at)} />
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
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}
