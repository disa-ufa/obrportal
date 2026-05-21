import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";
import {
  RoleForm,
  ROLE_API_ERROR_MESSAGES,
  formatRoleApiError,
} from "./RoleForm";
import { AdminFormField as Field } from "./AdminFormField";
import { AdminFormSelectInput as SelectInput } from "./AdminTextInput";
import { buildAuditPath, buildPermissionsPath, buildUsersPath } from "../../utils/adminLinks";

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

const ROLE_RELATED_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100";

const ROLE_ATTENTION_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100";

function getRoleAttentionItems(role, isSystemRole, isSystemAdminRole) {
  const items = [];

  if (!role) {
    return items;
  }

  if (isSystemAdminRole) {
    items.push("Admin: системная роль защищена от изменения permissions, чтобы не потерять административный доступ.");
  } else if (isSystemRole) {
    items.push("Тип роли: системная роль защищена seed-логикой, редактируйте только пользовательские роли.");
  } else {
    items.push("Тип роли: пользовательская роль, перед удалением проверьте назначения пользователям.");
  }

  if (!String(role.description || "").trim()) {
    items.push("Описание: не заполнено, сложнее понять назначение роли и границы доступа.");
  }

  if (!role.permissions?.length) {
    items.push("Permissions: права не назначены, роль не даёт прикладного доступа.");
  }

  if (role.permissions?.length && role.permissions.length < 2 && role.code !== "admin") {
    items.push("Permissions: назначено мало прав, проверьте полноту доступа для рабочего сценария.");
  }

  return [...new Set(items)];
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
      setError(formatRoleApiError(err, ROLE_API_ERROR_MESSAGES.addPermissionFailed));
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
  onDeleteRole,
}) {
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [removingPermissionId, setRemovingPermissionId] = useState("");
  const [deletingRole, setDeletingRole] = useState(false);
  const [actionError, setActionError] = useState("");

  const isSystemAdminRole = roleDetail?.code === "admin";
  const isSystemRole = SYSTEM_ROLE_CODES.has(roleDetail?.code);
  const roleAttentionItems = getRoleAttentionItems(roleDetail, isSystemRole, isSystemAdminRole);

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



  async function handleDeleteRole() {
    const confirmed = window.confirm(
      `Удалить роль "${roleDetail.name}"? Действие нельзя отменить.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingRole(true);
    setActionError("");

    try {
      await onDeleteRole(roleDetail.id);
    } catch (err) {
      setActionError(formatRoleApiError(err, ROLE_API_ERROR_MESSAGES.deleteFailed));
    } finally {
      setDeletingRole(false);
    }
  }

  async function handleRemovePermission(rolePermissionId) {
    setRemovingPermissionId(rolePermissionId);
    setActionError("");

    try {
      await onRemovePermission(roleDetail.id, rolePermissionId);
    } catch (err) {
      setActionError(formatRoleApiError(err, ROLE_API_ERROR_MESSAGES.removePermissionFailed));
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

              {!isSystemRole && onDeleteRole && (

                <ActionButton
                  type="button"
                  tone="red"
                  onClick={handleDeleteRole}
                  disabled={deletingRole}
                >
                  {deletingRole ? "Удаляем..." : "Удалить роль"}
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

          {!isSystemRole && (
            <Alert title="Удаление роли" tone="blue">
              Пользовательскую роль можно удалить только если она не назначена пользователям.
              Все связи с permissions будут сняты автоматически.
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

          {roleAttentionItems.length > 0 && (
            <div
              data-testid="role-attention-diagnostics"
              className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">
                  Что требует внимания в роли
                </div>
                <span
                  data-testid="role-attention-count"
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                >
                  Пунктов внимания: {roleAttentionItems.length}
                </span>
              </div>
              <p
                data-testid="role-attention-diagnostics-note"
                className="mt-2 leading-6"
              >
                Диагностика основана на типе роли, защите системных ролей, описании и составе permissions.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {roleAttentionItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div
            data-testid="role-related-records-links"
            className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"
          >
            <div className="font-semibold text-slate-900">
              Связанные записи роли
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Быстрые переходы к пользователям, permissions и аудиту выбранной роли.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                data-testid="role-users-link"
                to={buildUsersPath({ role: roleDetail.code })}
                className={ROLE_RELATED_LINK_CLASS}
              >
                Пользователи с этой ролью
              </Link>

              <Link
                data-testid="role-permissions-link"
                to={buildPermissionsPath()}
                className={ROLE_RELATED_LINK_CLASS}
              >
                Все права
              </Link>

              <Link
                data-testid="role-admin-permissions-link"
                to={buildPermissionsPath({ group: "admin" })}
                className={ROLE_ATTENTION_LINK_CLASS}
              >
                Admin-права
              </Link>

              <Link
                data-testid="role-audit-link"
                to={buildAuditPath({ entity_type: "role", entity_id: roleDetail.id })}
                className={ROLE_RELATED_LINK_CLASS}
              >
                Аудит роли
              </Link>

              <Link
                data-testid="role-permission-audit-link"
                to={buildAuditPath({ entity_type: "permission" })}
                className={ROLE_RELATED_LINK_CLASS}
              >
                Аудит permissions
              </Link>
            </div>
          </div>

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
                errorMessage={ROLE_API_ERROR_MESSAGES.updateFailed}
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
