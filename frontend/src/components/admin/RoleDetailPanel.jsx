import { useMemo, useState } from "react";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";
import { RoleForm } from "./RoleForm";

const SYSTEM_ROLE_CODES = new Set([
  "admin",
  "learner_fl",
  "learner_org",
  "org_rep",
  "teacher",
  "methodist",
  "finance_operator",
  "edo_operator",
  "frdo_operator",
]);

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </label>
  );
}

function SelectInput(props) {
  return (
    <select
      {...props}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50 disabled:text-slate-500"
    />
  );
}

function RolePermissionAssignmentForm({ permissions, assignedPermissions, onAssign }) {
  const assignedIds = useMemo(
    () => new Set((assignedPermissions || []).map((permission) => permission.id)),
    [assignedPermissions]
  );

  const availablePermissions = useMemo(
    () => (permissions || []).filter((permission) => !assignedIds.has(permission.id)),
    [permissions, assignedIds]
  );

  const [permissionId, setPermissionId] = useState(availablePermissions[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedPermissionId = availablePermissions.some((permission) => permission.id === permissionId)
    ? permissionId
    : availablePermissions[0]?.id || "";

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await onAssign({ permission_id: selectedPermissionId });
      setPermissionId("");
      setSuccess("Право добавлено к роли.");
    } catch (err) {
      setError(`${err.status || ""} ${err.message}`.trim());
    } finally {
      setLoading(false);
    }
  }

  if (!permissions?.length) {
    return (
      <Alert title="Права не загружены" tone="amber">
        Сначала обновите административные данные, чтобы получить список прав.
      </Alert>
    );
  }

  if (!availablePermissions.length) {
    return (
      <Alert title="Все права уже назначены" tone="blue">
        У этой роли уже есть все доступные permissions.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div>
        <div className="text-sm font-semibold text-slate-900">
          Добавить право к роли
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Выберите permission, которое нужно включить в состав роли.
        </p>
      </div>

      {error && (
        <Alert title="Не удалось добавить право" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="Готово" tone="blue">
          {success}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Право">
          <SelectInput
            value={selectedPermissionId}
            onChange={(event) => {
              setPermissionId(event.target.value);
              setError("");
              setSuccess("");
            }}
            disabled={loading}
          >
            {availablePermissions.map((permission) => (
              <option key={permission.id} value={permission.id}>
                {permission.code} — {permission.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="flex items-end">
          <ActionButton type="submit" tone="blue" disabled={loading || !selectedPermissionId}>
            {loading ? "Добавляем..." : "Добавить право"}
          </ActionButton>
        </div>
      </div>
    </form>
  );
}

export function RoleDetailPanel({
  roleDetail,
  permissions,
  loading,
  error,
  onClose,
  onAssignPermission,
  onRemovePermission,
  onUpdateRole,
}) {
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [removingPermissionId, setRemovingPermissionId] = useState("");
  const [actionError, setActionError] = useState("");

  const isSystemAdminRole = roleDetail?.code === "admin";
  const isSystemRole = SYSTEM_ROLE_CODES.has(roleDetail?.code);

  async function handleUpdateRole(payload) {
    setActionError("");
    const updated = await onUpdateRole(roleDetail.id, payload);
    setEditingMetadata(false);

    return updated;
  }

  async function handleAssignPermission(payload) {
    setActionError("");
    return onAssignPermission(roleDetail.id, payload);
  }

  async function handleRemovePermission(rolePermissionId) {
    setRemovingPermissionId(rolePermissionId);
    setActionError("");

    try {
      await onRemovePermission(roleDetail.id, rolePermissionId);
    } catch (err) {
      setActionError(`${err.status || ""} ${err.message}`.trim());
    } finally {
      setRemovingPermissionId("");
    }
  }

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

            <div className="flex flex-wrap gap-2">
              {!isSystemRole && (
                <ActionButton
                  type="button"
                  tone="light"
                  onClick={() => setEditingMetadata((current) => !current)}
                >
                  {editingMetadata ? "Скрыть форму" : "Редактировать"}
                </ActionButton>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Закрыть
              </button>
            </div>
          </div>

          {actionError && (
            <Alert title="Не удалось выполнить действие" tone="red">
              {actionError}
            </Alert>
          )}

          {isSystemAdminRole && (
            <Alert title="Системная роль admin защищена" tone="amber">
              Состав прав роли admin нельзя менять из интерфейса, чтобы не заблокировать административный доступ.
            </Alert>
          )}

          {isSystemRole && !isSystemAdminRole && (
            <Alert title="Системная роль защищена" tone="amber">
              Название и описание базовых ролей управляются системным seed. Для ручной настройки создавайте пользовательские роли.
            </Alert>
          )}

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

          {editingMetadata && !isSystemRole && (
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="mb-4">
                <div className="text-sm font-semibold text-slate-900">
                  Редактировать роль
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Код роли неизменяемый. Меняются только название и описание.
                </p>
              </div>

              <RoleForm
                mode="edit"
                initialValues={roleDetail}
                submitLabel="Сохранить роль"
                successMessage="Роль обновлена."
                onSubmit={handleUpdateRole}
                onCancel={() => setEditingMetadata(false)}
              />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-700">
                Права роли
              </div>

              {roleDetail.permissions?.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {roleDetail.permissions.map((permission) => (
                    <div
                      key={permission.role_permission_id || permission.id}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {permission.code}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {permission.name}
                          </div>
                        </div>

                        {!isSystemAdminRole && (
                          <ActionButton
                            type="button"
                            tone="red"
                            onClick={() => handleRemovePermission(permission.role_permission_id)}
                            disabled={Boolean(removingPermissionId)}
                          >
                            {removingPermissionId === permission.role_permission_id ? "Снимаем..." : "Снять"}
                          </ActionButton>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-slate-500">
                        <div>permission_id: {permission.id}</div>
                        <div>assignment_id: {permission.role_permission_id}</div>
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

            {!isSystemAdminRole && (
              <RolePermissionAssignmentForm
                permissions={permissions}
                assignedPermissions={roleDetail.permissions}
                onAssign={handleAssignPermission}
              />
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
