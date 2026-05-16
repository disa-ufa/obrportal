from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{relative_path} is missing required fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def require_occurs(relative_path: str, fragment: str, minimum: int) -> None:
    text = read_text(relative_path)
    count = text.count(fragment)

    if count < minimum:
        print(f"{relative_path} has too few occurrences of required fragment:")
        print(f" - fragment: {fragment}")
        print(f" - expected at least: {minimum}")
        print(f" - actual: {count}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/components/admin/UserForm.jsx",
        [
            "export const USER_API_ERROR_MESSAGES = {",
            "export function formatUserApiError(err, fallback)",
            "function normalizeInitialValues(initialValues, mode)",
            "function buildPayload(values, mode)",
            "export function UserForm({",
            "mode = \"edit\"",
            "const isCreateMode = mode === \"create\";",
            "async function handleSubmit(event)",
            "const payload = buildPayload(values, mode);",
            "const result = await onSubmit(payload);",
            "if (isCreateMode)",
            "setValues(normalizeInitialValues(null, mode));",
            "formatUserApiError(err, errorMessage)",
            "USER_API_ERROR_MESSAGES.accessDenied",
            "USER_API_ERROR_MESSAGES.duplicateEmailOrPhone",
            "USER_API_ERROR_MESSAGES.lastAdminDeactivate",
            "USER_API_ERROR_MESSAGES.lastAdminRoleRemove",
            "USER_API_ERROR_MESSAGES.invalidPassword",
            "USER_API_ERROR_MESSAGES.invalidRequest",
            "<TextInput",
            "<ActionButton",
        ],
    )

    require_contains(
        "frontend/src/components/admin/UserDetailPanel.jsx",
        [
            "export function UserDetailPanel({",
            "function UserPasswordResetForm({ onReset })",
            "function UserRoleAssignmentForm({",
            "function buildRoleAssignmentInitialValues(roles, organizations)",
            "function roleBadgeTone(roleCode)",
            "const organizationsById = useMemo(() => {",
            "async function handleResetPassword(password)",
            "async function handleActivate()",
            "async function handleDeactivate()",
            "async function handleAssignRole(payload)",
            "async function handleRemoveRole(userRoleId)",
            "onResetUserPassword(userDetail.id, password)",
            "onActivateUser(userDetail.id)",
            "onDeactivateUser(userDetail.id)",
            "onAssignUserRole(userDetail.id, payload)",
            "onRemoveUserRole(userDetail.id, userRoleId)",
            "<UserForm",
            "<UserPasswordResetForm",
            "<UserRoleAssignmentForm",
            "formatUserApiError(err, USER_API_ERROR_MESSAGES.activateFailed)",
            "formatUserApiError(err, USER_API_ERROR_MESSAGES.deactivateFailed)",
            "formatUserApiError(err, USER_API_ERROR_MESSAGES.removeRoleFailed)",
        ],
    )

    require_contains(
        "frontend/src/components/admin/OrganizationForm.jsx",
        [
            "export const ORGANIZATION_API_ERROR_MESSAGES = {",
            "export function formatOrganizationApiError(err, fallback)",
            "function normalizeInitialValues(initialValues)",
            "function nullableTrim(value)",
            "function buildPayload(values)",
            "export function OrganizationForm({",
            "async function handleSubmit(event)",
            "const payload = buildPayload(values);",
            "const result = await onSubmit(payload);",
            "formatOrganizationApiError(err, errorMessage)",
            "ORGANIZATION_API_ERROR_MESSAGES.accessDenied",
            "ORGANIZATION_API_ERROR_MESSAGES.notFound",
            "ORGANIZATION_API_ERROR_MESSAGES.duplicateInn",
            "ORGANIZATION_API_ERROR_MESSAGES.deleteHasAssignments",
            "ORGANIZATION_API_ERROR_MESSAGES.noFields",
            "ORGANIZATION_API_ERROR_MESSAGES.invalidRequest",
            "const isInvalid = !values.inn.trim() || !values.name.trim();",
            "<TextInput",
            "<TextArea",
            "<ActionButton",
        ],
    )

    require_contains(
        "frontend/src/components/admin/OrganizationDetailPanel.jsx",
        [
            "export function OrganizationDetailPanel({",
            "const [isEditing, setIsEditing] = useState(false);",
            "const [deleting, setDeleting] = useState(false);",
            "const [actionError, setActionError] = useState(\"\");",
            "function handleClose()",
            "async function handleDelete()",
            "window.confirm(",
            "await onDeleteOrganization(organizationDetail.id);",
            "formatOrganizationApiError(err, ORGANIZATION_API_ERROR_MESSAGES.deleteFailed)",
            "<OrganizationForm",
            "onSubmit={(payload) => onUpdateOrganization(organizationDetail.id, payload)}",
            "onSuccess={() => setIsEditing(false)}",
            "<DetailField",
            "<StatusBadge",
            "<ActionButton",
        ],
    )

    require_contains(
        "frontend/src/components/admin/RoleForm.jsx",
        [
            "export const ROLE_API_ERROR_MESSAGES = {",
            "export function formatRoleApiError(err, fallback)",
            "function normalizeInitialValues(initialValues)",
            "function nullableTrim(value)",
            "function buildPayload(values, mode)",
            "export function RoleForm({",
            "mode = \"create\"",
            "if (mode === \"create\")",
            "payload.code = values.code.trim().toLowerCase();",
            "async function handleSubmit(event)",
            "const payload = buildPayload(values, mode);",
            "const result = await onSubmit(payload);",
            "formatRoleApiError(err, errorMessage)",
            "ROLE_API_ERROR_MESSAGES.accessDenied",
            "ROLE_API_ERROR_MESSAGES.roleNotFound",
            "ROLE_API_ERROR_MESSAGES.permissionNotFound",
            "ROLE_API_ERROR_MESSAGES.duplicateRoleCode",
            "ROLE_API_ERROR_MESSAGES.duplicatePermission",
            "ROLE_API_ERROR_MESSAGES.systemRoleProtected",
            "ROLE_API_ERROR_MESSAGES.systemPermissionsProtected",
            "ROLE_API_ERROR_MESSAGES.deleteHasAssignments",
            "ROLE_API_ERROR_MESSAGES.noFields",
            "ROLE_API_ERROR_MESSAGES.invalidRequest",
            "const isInvalid =",
            "<TextInput",
            "<TextArea",
            "<ActionButton",
        ],
    )

    require_contains(
        "frontend/src/components/admin/RoleDetailPanel.jsx",
        [
            "const SYSTEM_ROLE_CODES = new Set([",
            "function RolePermissionAssignmentForm({ permissions, assignedPermissions, onAssign })",
            "const assignedIds = useMemo(",
            "const availablePermissions = useMemo(",
            "async function handleSubmit(event)",
            "await onAssign({ permission_id: selectedPermissionId });",
            "export function RoleDetailPanel({",
            "const [editingMetadata, setEditingMetadata] = useState(false);",
            "const [removingPermissionId, setRemovingPermissionId] = useState(\"\");",
            "const [deletingRole, setDeletingRole] = useState(false);",
            "const isSystemAdminRole = roleDetail?.code === \"admin\";",
            "const isSystemRole = SYSTEM_ROLE_CODES.has(roleDetail?.code);",
            "async function handleUpdateRole(payload)",
            "async function handleAssignPermission(payload)",
            "async function handleDeleteRole()",
            "async function handleRemovePermission(rolePermissionId)",
            "await onDeleteRole(roleDetail.id);",
            "await onRemovePermission(roleDetail.id, rolePermissionId);",
            "<RoleForm",
            "<RolePermissionAssignmentForm",
            "formatRoleApiError(err, ROLE_API_ERROR_MESSAGES.deleteFailed)",
            "formatRoleApiError(err, ROLE_API_ERROR_MESSAGES.removePermissionFailed)",
            "<DetailField",
            "<StatusBadge",
            "<ActionButton",
        ],
    )

    require_contains(
        "frontend/src/components/admin/PermissionDetailPanel.jsx",
        [
            "export function PermissionDetailPanel({",
            "permissionDetail,",
            "loading,",
            "error,",
            "onClose,",
            "<SectionCard",
            "<LoadingBlock",
            "<Alert",
            "<StatusBadge",
            "<DetailField",
            "permissionDetail.roles?.length",
            "permissionDetail.roles.map((role) => (",
            "formatDetailDate(permissionDetail.created_at)",
            "formatDetailDate(permissionDetail.updated_at)",
        ],
    )

    require_contains(
        "frontend/src/components/admin/AuditEventDetailPanel.jsx",
        [
            "export function AuditEventDetailPanel({",
            "auditEventDetail,",
            "loading,",
            "error,",
            "onClose,",
            "const entityAdminPath = buildEntityAdminPath(auditEventDetail);",
            "<SectionCard",
            "<LoadingBlock",
            "<Alert",
            "<StatusBadge",
            "<DetailField",
            "<JsonBlock",
            "buildAuditPath({",
            "actor_user_id: auditEventDetail.actor_user_id",
            "entity_type: auditEventDetail.entity_type",
            "entity_id: auditEventDetail.entity_id",
            "entityAdminPath",
        ],
    )

    require_contains(
        "frontend/src/components/admin/AdminWorkCenter.jsx",
        [
            "export function getAdminToneClasses(tone)",
            "export function AdminMetricCard({",
            "export function AdminSignalCard({",
            "export function AdminSummaryCard({ title, value, hint, to })",
            "export function AdminWorkflowLink({ title, description, to })",
            "if (tone === \"green\")",
            "if (tone === \"amber\")",
            "if (tone === \"red\")",
            "if (tone === \"violet\")",
            "if (tone === \"gray\")",
            "const cardTitle = title || label;",
            "if (!to)",
            "<Link to={to}",
        ],
    )

    require_contains(
        "frontend/src/components/admin/AdminQuickFilterButtons.jsx",
        [
            "export function AdminQuickFilterButtons({",
            "items,",
            "activeValue,",
            "counts = {}",
            "disabled = false",
            "onChange,",
            "getCount = (item, currentCounts) => currentCounts[item.value] ?? currentCounts.all ?? 0",
            "getKey = (item) => item.value || \"all\"",
            "items.map((item) => {",
            "const isActive = activeValue === item.value;",
            "const count = getCount(item, counts);",
            "onClick={() => onChange(item.value)}",
        ],
    )

    require_contains(
        "frontend/src/components/admin/AdminQuickValueFilters.jsx",
        [
            "export function AdminQuickValueFilters({",
            "title,",
            "value,",
            "items,",
            "counts = {}",
            "disabled = false",
            "onChange,",
            "emptyLabel = \"\\u0412\\u0441\\u0435\"",
            "if (items.length === 0)",
            "return null;",
            "onClick={() => onChange(\"\")}",
            "items.map((item) => {",
            "const isActive = value === item;",
            "const count = counts[item] || 0;",
            "onClick={() => onChange(item)}",
        ],
    )

    require_contains(
        "frontend/src/components/admin/AdminTextInput.jsx",
        [
            "export function AdminTextInput({ className = \"\", variant = \"soft\", ...props })",
            "export function AdminSubtleTextInput(props)",
            "export function AdminFormTextInput(props)",
            "export function AdminFormTextArea({ className = \"\", ...props })",
            "export function AdminFormSelectInput({ className = \"\", ...props })",
            "const VARIANT_CLASS_NAMES = {",
            "soft: ADMIN_FILTER_CONTROL_SOFT_CLASS",
            "subtleDisabled: ADMIN_FILTER_CONTROL_SUBTLE_DISABLED_CLASS",
            "form: ADMIN_FORM_TEXT_INPUT_CLASS",
            "return <input {...props} className={mergedClassName} />;",
            "return <textarea {...props} className={mergedClassName} />;",
            "return <select {...props} className={mergedClassName} />;",
        ],
    )

    require_contains(
        "frontend/src/components/admin/AdminFormField.jsx",
        [
            "export function AdminFormField({",
            "label,",
            "required = false",
            "children,",
            "hint,",
            "contentClassName = \"mt-1\"",
            "{label}{required ? \" *\" : \"\"}",
            "{children}",
            "{hint &&",
        ],
    )

    require_occurs("frontend/src/components/admin/UserDetailPanel.jsx", "useState(", 12)
    require_occurs("frontend/src/components/admin/UserDetailPanel.jsx", "async function", 5)
    require_occurs("frontend/src/components/admin/UserDetailPanel.jsx", "<ActionButton", 6)
    require_occurs("frontend/src/components/admin/RoleDetailPanel.jsx", "useState(", 6)
    require_occurs("frontend/src/components/admin/RoleDetailPanel.jsx", "async function", 5)
    require_occurs("frontend/src/components/admin/RoleDetailPanel.jsx", "<ActionButton", 4)
    require_occurs("frontend/src/components/admin/OrganizationDetailPanel.jsx", "useState(", 3)
    require_occurs("frontend/src/components/admin/OrganizationForm.jsx", "<Field", 6)
    require_occurs("frontend/src/components/admin/RoleForm.jsx", "<Field", 3)
    require_occurs("frontend/src/components/admin/UserForm.jsx", "<Field", 4)

    print("Frontend admin detail components behavior smoke passed")


if __name__ == "__main__":
    main()
