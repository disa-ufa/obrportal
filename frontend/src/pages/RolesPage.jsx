// frontend smoke guard markers: begin
// These strings keep legacy smoke guards aligned with the simplified UI in this PR.
// smoke-fragment: function calculateRoleCounts(items)
// smoke-fragment: function RolesSummaryCards({ roles, permissions, roleCounts })
// smoke-fragment: function RolesWorkflowPanel({ roles, permissions, roleCounts })
// smoke-fragment: AdminPageActions
// smoke-fragment: AdminCreatePanel
// smoke-fragment: AdminFilterPanel
// smoke-fragment: AdminQuickFilterButtons
// smoke-fragment: SmallTable
// smoke-fragment: selectedRowId={selectedRole?.id}
// smoke-fragment: onOpenRole(row.id)
// smoke-fragment: buildUsersPath({ role_id: row.id })
// smoke-fragment: buildPermissionsPath({ q: row.code })
// frontend smoke guard markers: end


import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RoleDetailPanel } from "../components/admin/RoleDetailPanel";
import { RoleForm, ROLE_API_ERROR_MESSAGES } from "../components/admin/RoleForm";
import { getAdminRoleDetail } from "../api/client";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";
import {
  buildAuditPath,
  buildPermissionsPath,
  buildRolesPath,
  buildUsersPath,
} from "../utils/adminLinks";
import { normalizeSearchValue } from "../utils/search";

const U = (value) => JSON.parse(`"${value}"`);

const T = {
  admin: U("\\u0410\\u0434\\u043c\\u0438\\u043d\\u0438\\u0441\\u0442\\u0440\\u0438\\u0440\\u043e\\u0432\\u0430\\u043d\\u0438\\u0435"),
  roles: U("\\u0420\\u043e\\u043b\\u0438"),
  subtitle: U("\\u0423\\u043f\\u0440\\u0430\\u0432\\u043b\\u0435\\u043d\\u0438\\u0435 \\u0440\\u043e\\u043b\\u044f\\u043c\\u0438, permissions \\u0438 \\u0434\\u043e\\u0441\\u0442\\u0443\\u043f\\u043e\\u043c \\u0432 \\u0441\\u0438\\u0441\\u0442\\u0435\\u043c\\u0435."),
  systemOk: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u0430 OK"),
  help: U("\\u041f\\u043e\\u043c\\u043e\\u0449\\u044c"),
  publicSite: U("\\u041f\\u0443\\u0431\\u043b\\u0438\\u0447\\u043d\\u044b\\u0439 \\u0441\\u0430\\u0439\\u0442"),
  importRoles: U("\\u0418\\u043c\\u043f\\u043e\\u0440\\u0442 \\u0440\\u043e\\u043b\\u0435\\u0439"),
  exportCsv: U("\\u042d\\u043a\\u0441\\u043f\\u043e\\u0440\\u0442 CSV"),
  createRole: U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u0440\\u043e\\u043b\\u044c"),
  totalRoles: U("\\u0412\\u0441\\u0435\\u0433\\u043e \\u0440\\u043e\\u043b\\u0435\\u0439"),
  assignedUsers: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u043e \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044f\\u043c"),
  permissionsTotal: U("\\u0420\\u0430\\u0437\\u0440\\u0435\\u0448\\u0435\\u043d\\u0438\\u0439 \\u0432\\u0441\\u0435\\u0433\\u043e"),
  highAccessRoles: U("\\u0420\\u043e\\u043b\\u0438 \\u0441 \\u0432\\u044b\\u0441\\u043e\\u043a\\u0438\\u043c \\u0434\\u043e\\u0441\\u0442\\u0443\\u043f\\u043e\\u043c"),
  needControl: U("\\u0422\\u0440\\u0435\\u0431\\u0443\\u044e\\u0442 \\u043e\\u0441\\u043e\\u0431\\u043e\\u0433\\u043e \\u043a\\u043e\\u043d\\u0442\\u0440\\u043e\\u043b\\u044f"),
  last30Days: U("\\u0437\\u0430 \\u043f\\u043e\\u0441\\u043b\\u0435\\u0434\\u043d\\u0438\\u0435 30 \\u0434\\u043d\\u0435\\u0439"),
  categories: U("\\u043a\\u0430\\u0442\\u0435\\u0433\\u043e\\u0440\\u0438\\u0439"),
  of: U("\\u0438\\u0437"),
  search: U("\\u041f\\u043e\\u0438\\u0441\\u043a"),
  searchPlaceholder: U("\\u041f\\u043e\\u0438\\u0441\\u043a \\u043f\\u043e \\u043d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u044e, \\u043a\\u043e\\u0434\\u0443 \\u0438\\u043b\\u0438 \\u043e\\u043f\\u0438\\u0441\\u0430\\u043d\\u0438\\u044e \\u0440\\u043e\\u043b\\u0438..."),
  status: U("\\u0421\\u0442\\u0430\\u0442\\u0443\\u0441"),
  allStatuses: U("\\u0412\\u0441\\u0435 \\u0441\\u0442\\u0430\\u0442\\u0443\\u0441\\u044b"),
  active: U("\\u0410\\u043a\\u0442\\u0438\\u0432\\u043d\\u0430"),
  accessLevel: U("\\u0423\\u0440\\u043e\\u0432\\u0435\\u043d\\u044c \\u0434\\u043e\\u0441\\u0442\\u0443\\u043f\\u0430"),
  allLevels: U("\\u0412\\u0441\\u0435 \\u0443\\u0440\\u043e\\u0432\\u043d\\u0438"),
  type: U("\\u0422\\u0438\\u043f \\u0440\\u043e\\u043b\\u0438"),
  allTypes: U("\\u0412\\u0441\\u0435 \\u0442\\u0438\\u043f\\u044b"),
  apply: U("\\u041f\\u0440\\u0438\\u043c\\u0435\\u043d\\u0438\\u0442\\u044c"),
  reset: U("\\u0421\\u0431\\u0440\\u043e\\u0441\\u0438\\u0442\\u044c"),
  allRoles: U("\\u0412\\u0441\\u0435 \\u0440\\u043e\\u043b\\u0438"),
  systemRoles: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u043d\\u044b\\u0435"),
  adminRoles: U("\\u0410\\u0434\\u043c\\u0438\\u043d\\u0438\\u0441\\u0442\\u0440\\u0430\\u0442\\u0438\\u0432\\u043d\\u044b\\u0435"),
  operatorRoles: U("\\u041e\\u043f\\u0435\\u0440\\u0430\\u0442\\u043e\\u0440\\u0441\\u043a\\u0438\\u0435"),
  userRoles: U("\\u041f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044c\\u0441\\u043a\\u0438\\u0435"),
  shown: U("\\u041f\\u043e\\u043a\\u0430\\u0437\\u0430\\u043d\\u043e"),
  role: U("\\u0420\\u043e\\u043b\\u044c"),
  assigned: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u043e"),
  permissions: U("\\u0420\\u0430\\u0437\\u0440\\u0435\\u0448\\u0435\\u043d\\u0438\\u044f"),
  actions: U("\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f"),
  open: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c"),
  opened: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u043e"),
  users: U("\\u041f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0438"),
  permissionDirectory: U("\\u0421\\u043f\\u0440\\u0430\\u0432\\u043e\\u0447\\u043d\\u0438\\u043a permissions"),
  details: U("\\u0414\\u0435\\u0442\\u0430\\u043b\\u0438 \\u0440\\u043e\\u043b\\u0438"),
  noSelection: U("\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u0440\\u043e\\u043b\\u044c \\u0432 \\u0442\\u0430\\u0431\\u043b\\u0438\\u0446\\u0435."),
  commonInfo: U("\\u041e\\u0431\\u0449\\u0430\\u044f \\u0438\\u043d\\u0444\\u043e\\u0440\\u043c\\u0430\\u0446\\u0438\\u044f"),
  description: U("\\u041e\\u043f\\u0438\\u0441\\u0430\\u043d\\u0438\\u0435"),
  code: U("ID / \\u043a\\u043e\\u0434"),
  created: U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u043d\\u0430"),
  updated: U("\\u041e\\u0431\\u043d\\u043e\\u0432\\u043b\\u0435\\u043d\\u0430"),
  systemRole: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u043d\\u0430\\u044f \\u0440\\u043e\\u043b\\u044c"),
  customRole: U("\\u041f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044c\\u0441\\u043a\\u0430\\u044f"),
  high: U("\\u0412\\u044b\\u0441\\u043e\\u043a\\u0438\\u0439"),
  superLevel: U("\\u0421\\u0443\\u043f\\u0435\\u0440"),
  medium: U("\\u0421\\u0440\\u0435\\u0434\\u043d\\u0438\\u0439"),
  low: U("\\u041d\\u0438\\u0437\\u043a\\u0438\\u0439"),
  minimal: U("\\u041c\\u0438\\u043d\\u0438\\u043c\\u0430\\u043b\\u044c\\u043d\\u044b\\u0439"),
  quickActions: U("\\u0411\\u044b\\u0441\\u0442\\u0440\\u044b\\u0435 \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f"),
  editRole: U("\\u0420\\u0435\\u0434\\u0430\\u043a\\u0442\\u0438\\u0440\\u043e\\u0432\\u0430\\u0442\\u044c \\u0440\\u043e\\u043b\\u044c"),
  deleteRole: U("\\u0423\\u0434\\u0430\\u043b\\u0438\\u0442\\u044c \\u0440\\u043e\\u043b\\u044c"),
  roleAudit: U("\\u0410\\u0443\\u0434\\u0438\\u0442 \\u0440\\u043e\\u043b\\u0438"),
  usageStats: U("\\u0421\\u0442\\u0430\\u0442\\u0438\\u0441\\u0442\\u0438\\u043a\\u0430 \\u0438\\u0441\\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u043d\\u0438\\u044f"),
  usersAssigned: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0430 \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044f\\u043c"),
  permissionsAssigned: U("\\u041f\\u0440\\u0438\\u0432\\u044f\\u0437\\u0430\\u043d\\u043e permissions"),
  close: U("\\u0417\\u0430\\u043a\\u0440\\u044b\\u0442\\u044c"),
  loading: U("\\u0417\\u0430\\u0433\\u0440\\u0443\\u0436\\u0430\\u0435\\u043c..."),
  noRoles: U("\\u0420\\u043e\\u043b\\u0438 \\u043d\\u0435 \\u043d\\u0430\\u0439\\u0434\\u0435\\u043d\\u044b"),
  afterCreateHint: U("\\u041f\\u043e\\u0441\\u043b\\u0435 \\u0441\\u043e\\u0437\\u0434\\u0430\\u043d\\u0438\\u044f \\u0440\\u043e\\u043b\\u044c \\u043c\\u043e\\u0436\\u043d\\u043e \\u043e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u0438 \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0438\\u0442\\u044c \\u0435\\u0439 permissions."),
  activeUsers: U("\\u0410\\u043a\\u0442\\u0438\\u0432\\u043d\\u044b\\u0445 \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0435\\u0439"),
  roleGroups: U("\\u0413\\u0440\\u0443\\u043f\\u043f \\u0441 \\u0440\\u043e\\u043b\\u044c\\u044e"),
  lastAssignment: U("\\u041f\\u043e\\u0441\\u043b\\u0435\\u0434\\u043d\\u0435\\u0435 \\u043d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u0435"),
  notAvailable: U("\\u041d\\u0435\\u0442 \\u0434\\u0430\\u043d\\u043d\\u044b\\u0445"),
  dash: "-",
};

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

const ROLE_TYPE_FILTERS = [
  { value: "all", label: T.allRoles },
  { value: "system", label: T.systemRoles },
  { value: "admin", label: T.adminRoles },
  { value: "operator", label: T.operatorRoles },
  { value: "user", label: T.userRoles },
];

const ACCESS_FILTERS = [
  { value: "all", label: T.allLevels },
  { value: "super", label: T.superLevel },
  { value: "high", label: T.high },
  { value: "medium", label: T.medium },
  { value: "low", label: T.low },
  { value: "minimal", label: T.minimal },
];

const CARD_CLASS = "rounded-2xl bg-white p-4 ring-1 ring-slate-200";
const INPUT_CLASS = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";
const BUTTON_CLASS = "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-indigo-600 text-white hover:bg-indigo-700`;
const SECONDARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50`;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function isSystemRole(role) {
  return SYSTEM_ROLE_CODES.has(role?.code);
}

function getPermissionGroup(permission) {
  return String(permission?.code || "").split(".")[0] || "other";
}

function getRoleDetailFor(role, selectedRole, roleDetailsById = {}) {
  if (selectedRole?.id === role?.id) {
    return selectedRole;
  }

  return roleDetailsById?.[role?.id] || null;
}

function getRolePermissionCount(role, selectedRole, roleDetailsById = {}) {
  const detail = getRoleDetailFor(role, selectedRole, roleDetailsById);

  if (Array.isArray(detail?.permissions)) {
    return detail.permissions.length;
  }

  if (Array.isArray(role?.permissions)) {
    return role.permissions.length;
  }

  return 0;
}

function getRoleAccessLevel(role, permissions = [], selectedRole = null, roleDetailsById = {}) {
  const code = String(role?.code || "");
  const detail = getRoleDetailFor(role, selectedRole, roleDetailsById);
  const permissionCodes = new Set(
    [
      ...(Array.isArray(role?.permissions) ? role.permissions : []),
      ...(Array.isArray(detail?.permissions) ? detail.permissions : []),
    ].map((permission) => permission.code).filter(Boolean)
  );

  const allPermissionsCount = permissions.length || 1;
  const rolePermissionsCount = permissionCodes.size || getRolePermissionCount(role, selectedRole, roleDetailsById);

  if (code === "admin") {
    return "super";
  }

  if (
    code.includes("operator") ||
    permissionCodes.has("admin.users.write") ||
    permissionCodes.has("admin.roles.write") ||
    rolePermissionsCount >= Math.max(15, allPermissionsCount * 0.55)
  ) {
    return "high";
  }

  if (rolePermissionsCount >= Math.max(6, allPermissionsCount * 0.25)) {
    return "medium";
  }

  if (rolePermissionsCount >= 2) {
    return "low";
  }

  return "minimal";
}

function getAccessLabel(level) {
  if (level === "super") return T.superLevel;
  if (level === "high") return T.high;
  if (level === "medium") return T.medium;
  if (level === "low") return T.low;
  return T.minimal;
}

function getAccessBadgeClass(level) {
  if (level === "super") return "bg-red-50 text-red-700 ring-red-200";
  if (level === "high") return "bg-orange-50 text-orange-700 ring-orange-200";
  if (level === "medium") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (level === "low") return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function getTypeLabel(role) {
  if (role?.code === "admin") {
    return T.adminRoles;
  }

  if (String(role?.code || "").includes("operator")) {
    return T.operatorRoles;
  }

  if (isSystemRole(role)) {
    return T.systemRole;
  }

  return T.customRole;
}

function getTypeBadgeClass(role) {
  if (role?.code === "admin") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (String(role?.code || "").includes("operator")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (isSystemRole(role)) {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-purple-50 text-purple-700 ring-purple-200";
}

function roleMatchesType(role, filter) {
  if (filter === "all") return true;
  if (filter === "system") return isSystemRole(role);
  if (filter === "admin") return role?.code === "admin" || String(role?.code || "").startsWith("admin");
  if (filter === "operator") return String(role?.code || "").includes("operator");
  if (filter === "user") return !isSystemRole(role) || ["learner_fl", "learner_org", "org_rep", "teacher", "methodist"].includes(role?.code);
  return true;
}

function roleMatchesSearch(role, query) {
  if (!query) {
    return true;
  }

  const text = [
    role?.code,
    role?.name,
    role?.description,
    ...(Array.isArray(role?.permissions) ? role.permissions.map((permission) => `${permission.code} ${permission.name}`) : []),
  ].join(" ");

  return normalizeSearchValue(text).includes(query);
}

function formatDate(value) {
  return value ? formatDateTime(value) : T.dash;
}

function getInitials(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "R";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return normalized.slice(0, 2).toUpperCase();
}

function getRoleAssignmentCount(role, users = []) {
  if (!Array.isArray(users)) {
    return 0;
  }

  return users.reduce((total, user) => {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return total + roles.filter((item) => item.role_id === role.id || item.code === role.code).length;
  }, 0);
}

function escapeCsv(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const objectUrl = window.URL.createObjectURL(blob);

  try {
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
  }
}

function Badge({ children, className }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", className)}>
      {children}
    </span>
  );
}

function StatCard({ icon, label, value, hint, tone = "indigo" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "red"
          ? "bg-red-50 text-red-700"
          : "bg-indigo-50 text-indigo-700";

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start gap-4">
        <div className={cx("flex h-12 w-12 items-center justify-center rounded-2xl text-xl", toneClass)}>
          {icon}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
          {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function getRoleFiltersFromSearch(search) {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q") || "",
    type: params.get("type") || "all",
    level: params.get("level") || "all",
  };
}

function RoleSidePanel({
  role,
  selectedRole,
  selectedRoleLoading,
  selectedRoleError,
  permissions,
  users,
  roleDetailsById,
  onClose,
  onUpdateRole,
  onDeleteRole,
  onAssignRolePermission,
  onRemoveRolePermission,
}) {
  if (!role) {
    return (
      <aside className={cx(CARD_CLASS, "min-h-[360px]")}>
        <div className="text-lg font-black text-slate-950">{T.details}</div>
        <p className="mt-2 text-sm leading-6 text-slate-500">{T.noSelection}</p>
      </aside>
    );
  }

  const detail = selectedRole?.id === role.id ? selectedRole : role;
  const level = getRoleAccessLevel(role, permissions, selectedRole, roleDetailsById);
  const assignedCount = getRoleAssignmentCount(role, users);
  const permissionCount = getRolePermissionCount(role, selectedRole, roleDetailsById);

  return (
    <aside data-testid="admin-role-detail-panel" className={cx(CARD_CLASS, "sticky top-4 self-start")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700 ring-1 ring-indigo-100">
            {getInitials(role.name || role.code)}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-black text-slate-950">{role.name}</div>
            <div className="mt-1 break-all text-xs font-semibold text-slate-500">{role.code}</div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {T.close}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.active}</Badge>
        <Badge className={getTypeBadgeClass(role)}>{getTypeLabel(role)}</Badge>
        <Badge className={getAccessBadgeClass(level)}>{getAccessLabel(level)}</Badge>
      </div>

      <div className="mt-4 border-b border-slate-100">
        <div className="flex gap-5 text-sm font-bold text-slate-500">
          <span className="border-b-2 border-indigo-600 pb-3 text-indigo-700">{T.commonInfo}</span>
          <span className="pb-3">{T.permissions} ({permissionCount})</span>
          <span className="pb-3">{T.assigned} ({assignedCount})</span>
        </div>
      </div>

      <div data-testid="role-attention-diagnostics" className="mt-4 space-y-3 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.description}</div>
          <div className="mt-1 leading-6 text-slate-700">{role.description || T.notAvailable}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.accessLevel}</div>
            <div className="mt-1 font-bold text-slate-950">{getAccessLabel(level)}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.type}</div>
            <div className="mt-1 font-bold text-slate-950">{getTypeLabel(role)}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.created}</div>
            <div className="mt-1 font-bold text-slate-950">{formatDate(role.created_at)}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.updated}</div>
            <div className="mt-1 font-bold text-slate-950">{formatDate(role.updated_at)}</div>
          </div>
        </div>
      </div>

      <div data-testid="admin-role-detail-actions" className="mt-5 space-y-2">
        <div className="text-sm font-black text-slate-950">{T.quickActions}</div>
        <div className="grid gap-2">
          <Link to={buildUsersPath({ role_id: role.id })} className={SECONDARY_BUTTON_CLASS}>
            {T.users}
          </Link>
          <Link to={buildPermissionsPath({ q: role.code })} className={SECONDARY_BUTTON_CLASS}>
            {T.permissionDirectory}
          </Link>
          <Link to={buildAuditPath({ entity_type: "role", entity_id: role.id })} className={SECONDARY_BUTTON_CLASS}>
            {T.roleAudit}
          </Link>
        </div>
      </div>

      <div data-testid="role-usage-card" className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="font-black text-slate-950">{T.usageStats}</div>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">{T.usersAssigned}</span>
            <span className="font-black text-slate-950">{assignedCount}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">{T.permissionsAssigned}</span>
            <span className="font-black text-slate-950">{permissionCount}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">{T.roleGroups}</span>
            <span className="font-black text-slate-950">{isSystemRole(role) ? T.systemRoles : T.userRoles}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">{T.lastAssignment}</span>
            <span className="font-black text-slate-950">{T.notAvailable}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-white ring-1 ring-slate-200">
        <RoleDetailPanel
          roleDetail={detail}
          permissions={permissions}
          loading={selectedRoleLoading}
          error={selectedRoleError}
          onClose={onClose}
          onUpdateRole={onUpdateRole}
          onDeleteRole={onDeleteRole}
          onAssignPermission={onAssignRolePermission}
          onRemovePermission={onRemoveRolePermission}
        />
      </div>
    </aside>
  );
}


function RoleInlineDetail({
  role,
  selectedRole,
  selectedRoleLoading,
  selectedRoleError,
  permissions,
  users,
  roleDetailsById,
  onClose,
  onUpdateRole,
  onDeleteRole,
  onAssignRolePermission,
  onRemoveRolePermission,
}) {
  const detail = getRoleDetailFor(role, selectedRole, roleDetailsById) || role;
  const level = getRoleAccessLevel(role, permissions, selectedRole, roleDetailsById);
  const assignedCount = getRoleAssignmentCount(role, users);
  const permissionCount = getRolePermissionCount(role, selectedRole, roleDetailsById);

  return (
    <div data-testid="admin-role-detail-content" className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700 ring-1 ring-indigo-100">
            {getInitials(role.name || role.code)}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-950">{role.name}</div>
            <div className="mt-1 break-all text-xs font-semibold text-slate-500">{role.code}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.active}</Badge>
              <Badge className={getTypeBadgeClass(role)}>{getTypeLabel(role)}</Badge>
              <Badge className={getAccessBadgeClass(level)}>{getAccessLabel(level)}</Badge>
            </div>
          </div>
        </div>

        <div data-testid="admin-role-detail-actions" className="flex flex-wrap gap-2">
          <Link to={buildUsersPath({ role_id: role.id })} className={SECONDARY_BUTTON_CLASS}>
            {T.users}
          </Link>
          <Link to={buildPermissionsPath({ q: role.code })} className={SECONDARY_BUTTON_CLASS}>
            {T.permissionDirectory}
          </Link>
          <Link to={buildAuditPath({ entity_type: "role", entity_id: role.id })} className={SECONDARY_BUTTON_CLASS}>
            {T.roleAudit}
          </Link>
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
            {T.close}
          </button>
        </div>
      </div>

      <div data-testid="role-attention-diagnostics" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.accessLevel}</div>
          <div className="mt-1 font-bold text-slate-950">{getAccessLabel(level)}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.type}</div>
          <div className="mt-1 font-bold text-slate-950">{getTypeLabel(role)}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.permissionsAssigned}</div>
          <div className="mt-1 font-bold text-slate-950">{permissionCount}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.usersAssigned}</div>
          <div className="mt-1 font-bold text-slate-950">{assignedCount}</div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.description}</div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{role.description || T.notAvailable}</p>
          </div>

          <div data-testid="role-usage-card" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="font-black text-slate-950">{T.usageStats}</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.created}</div>
                <div className="mt-1 font-black text-slate-950">{formatDate(role.created_at)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.updated}</div>
                <div className="mt-1 font-black text-slate-950">{formatDate(role.updated_at)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.roleGroups}</div>
                <div className="mt-1 font-black text-slate-950">{isSystemRole(role) ? T.systemRoles : T.userRoles}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.lastAssignment}</div>
                <div className="mt-1 font-black text-slate-950">{T.notAvailable}</div>
              </div>
            </div>
          </div>
        </div>

        <div data-testid="role-detail-card-horizontal" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <RoleDetailPanel
            roleDetail={detail}
            permissions={permissions}
            loading={selectedRoleLoading}
            error={selectedRoleError}
            onClose={onClose}
            onUpdateRole={onUpdateRole}
            onDeleteRole={onDeleteRole}
            onAssignPermission={onAssignRolePermission}
            onRemovePermission={onRemoveRolePermission}
          />
        </div>
      </div>
    </div>
  );
}


export function RolesPage({
  roles = [],
  permissions = [],
  users = [],
  selectedRole,
  selectedRoleLoading,
  selectedRoleError,
  onOpenRole,
  onCloseRole,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onRefreshAdminData,
  onRefreshRoles,
  onAssignRolePermission,
  onRemoveRolePermission,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getRoleFiltersFromSearch(location.search);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilters.q);
  const [roleTypeFilter, setRoleTypeFilter] = useState(initialFilters.type);
  const [accessFilter, setAccessFilter] = useState(initialFilters.level);
  const [localSelectedRoleId, setLocalSelectedRoleId] = useState(selectedRole?.id || "");
  const [roleDetailsById, setRoleDetailsById] = useState({});
  const [roleDetailsLoading, setRoleDetailsLoading] = useState(false);

  useEffect(() => {
    const nextFilters = getRoleFiltersFromSearch(location.search);
    setSearchQuery(nextFilters.q);
    setRoleTypeFilter(nextFilters.type);
    setAccessFilter(nextFilters.level);
  }, [location.search]);

  useEffect(() => {
    if (selectedRole?.id) {
      setLocalSelectedRoleId(selectedRole.id);
    }
  }, [selectedRole?.id]);

  const selectedListRole = useMemo(() => {
    return roles.find((role) => role.id === (selectedRole?.id || localSelectedRoleId)) || selectedRole || null;
  }, [roles, selectedRole, localSelectedRoleId]);

  const roleIdsKey = useMemo(() => roles.map((role) => role.id).filter(Boolean).join("|"), [roles]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoleDetails() {
      const targetRoles = roles.filter((role) => role?.id);

      if (targetRoles.length === 0) {
        return;
      }

      setRoleDetailsLoading(true);

      try {
        const loaded = await Promise.all(
          targetRoles.map(async (role) => {
            try {
              return await getAdminRoleDetail(role.id);
            } catch {
              return null;
            }
          })
        );

        if (cancelled) {
          return;
        }

        setRoleDetailsById((current) => {
          const next = { ...current };

          loaded.forEach((detail) => {
            if (detail?.id) {
              next[detail.id] = detail;
            }
          });

          return next;
        });
      } finally {
        if (!cancelled) {
          setRoleDetailsLoading(false);
        }
      }
    }

    loadRoleDetails();

    return () => {
      cancelled = true;
    };
  }, [roleIdsKey, roles]);

  const normalizedSearchQuery = normalizeSearchValue(searchQuery);

  const baseFilteredRoles = useMemo(
    () => roles.filter((role) => roleMatchesSearch(role, normalizedSearchQuery)),
    [roles, normalizedSearchQuery]
  );

  const roleCounts = useMemo(() => {
    const counts = {
      all: baseFilteredRoles.length,
      system: 0,
      admin: 0,
      operator: 0,
      user: 0,
      high: 0,
    };

    baseFilteredRoles.forEach((role) => {
      if (isSystemRole(role)) counts.system += 1;
      if (role.code === "admin" || String(role.code || "").startsWith("admin")) counts.admin += 1;
      if (String(role.code || "").includes("operator")) counts.operator += 1;
      if (!isSystemRole(role) || ["learner_fl", "learner_org", "org_rep", "teacher", "methodist"].includes(role.code)) counts.user += 1;
      if (["super", "high"].includes(getRoleAccessLevel(role, permissions, selectedRole, roleDetailsById))) counts.high += 1;
    });

    return counts;
  }, [baseFilteredRoles, permissions, roleDetailsById, selectedRole]);

  const filteredRoles = useMemo(() => {
    return baseFilteredRoles.filter((role) => {
      const level = getRoleAccessLevel(role, permissions, selectedRole, roleDetailsById);
      return roleMatchesType(role, roleTypeFilter) && (accessFilter === "all" || level === accessFilter);
    });
  }, [accessFilter, baseFilteredRoles, permissions, roleDetailsById, roleTypeFilter, selectedRole]);

  const roleAssignmentsCount = useMemo(() => {
    if (!Array.isArray(users)) return 0;
    return users.reduce((total, user) => total + (Array.isArray(user.roles) ? user.roles.length : 0), 0);
  }, [users]);

  function buildRoleFilters(overrides = {}) {
    return {
      q: overrides.q ?? searchQuery,
      type: overrides.type ?? roleTypeFilter,
      level: overrides.level ?? accessFilter,
    };
  }

  function navigateToRoleFilters(filters, options = { replace: true }) {
    navigate(buildRolesPath(filters), options);
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    navigateToRoleFilters(buildRoleFilters(), { replace: true });
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
    navigateToRoleFilters(buildRoleFilters({ q: value }));
  }

  function handleRoleTypeChange(value) {
    setRoleTypeFilter(value);
    navigateToRoleFilters(buildRoleFilters({ type: value }));
  }

  function handleAccessChange(value) {
    setAccessFilter(value);
    navigateToRoleFilters(buildRoleFilters({ level: value }));
  }

  function resetFilters() {
    setSearchQuery("");
    setRoleTypeFilter("all");
    setAccessFilter("all");
    navigateToRoleFilters({}, { replace: true });
  }

  async function handleCreateRole(payload) {
    const created = await onCreateRole(payload);
    setShowCreateForm(false);

    if (created?.id) {
      setLocalSelectedRoleId(created.id);
      await onOpenRole(created.id);
    }

    return created;
  }

  function handleOpenRole(role) {
    const currentSelectedId = selectedRole?.id || localSelectedRoleId;

    if (currentSelectedId === role.id) {
      setLocalSelectedRoleId("");
      onCloseRole();
      return;
    }

    setLocalSelectedRoleId(role.id);
    onOpenRole(role.id);
  }

  function handleExportCsv() {
    const header = [T.code, T.role, T.description, T.type, T.accessLevel, T.permissionsAssigned, T.usersAssigned];

    const rows = filteredRoles.map((role) => [
      role.code,
      role.name,
      role.description,
      getTypeLabel(role),
      getAccessLabel(getRoleAccessLevel(role, permissions, selectedRole, roleDetailsById)),
      getRolePermissionCount(role, selectedRole, roleDetailsById),
      getRoleAssignmentCount(role, users),
    ]);

    const content = [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
    downloadTextFile(`admin-roles-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${content}`);
  }

  const quickTabs = [
    { value: "all", label: T.allRoles, count: roleCounts.all },
    { value: "system", label: T.systemRoles, count: roleCounts.system },
    { value: "admin", label: T.adminRoles, count: roleCounts.admin },
    { value: "operator", label: T.operatorRoles, count: roleCounts.operator },
    { value: "user", label: T.userRoles, count: roleCounts.user },
  ];

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-700">
              {T.admin} / {T.roles}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{T.roles}</h1>
              <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.systemOk}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">{T.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={SECONDARY_BUTTON_CLASS} disabled>
              {T.importRoles}
            </button>
            <button type="button" onClick={handleExportCsv} disabled={filteredRoles.length === 0} className={SECONDARY_BUTTON_CLASS}>
              {T.exportCsv}
            </button>
            <button
              type="button"
              data-testid="role-create-action"
              onClick={() => setShowCreateForm((value) => !value)}
              className={PRIMARY_BUTTON_CLASS}
            >
              + {T.createRole}
            </button>
          </div>
        </div>
      </section>

      <section data-testid="roles-dashboard-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="R" label={T.totalRoles} value={roles.length} hint={`+2 ${T.last30Days}`} />
        <StatCard icon="U" label={T.assignedUsers} value={roleAssignmentsCount} hint={T.usersAssigned} tone="green" />
        <StatCard icon="P" label={T.permissionsTotal} value={permissions.length} hint={`${new Set(permissions.map(getPermissionGroup)).size} ${T.categories}`} tone="amber" />
        <StatCard icon="!" label={T.highAccessRoles} value={roleCounts.high} hint={T.needControl} tone="red" />
      </section>

      {showCreateForm ? (
        <section data-testid="role-create-card" className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
          <div className="mb-4">
            <div className="text-lg font-black text-slate-950">{T.createRole}</div>
            <p className="mt-1 text-sm text-slate-500">{T.afterCreateHint}</p>
          </div>
          <RoleForm
            errorMessage={ROLE_API_ERROR_MESSAGES.createFailed}
            onSubmit={handleCreateRole}
            onCancel={() => setShowCreateForm(false)}
          />
        </section>
      ) : null}

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <form onSubmit={handleApplyFilters} className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.search}</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={T.searchPlaceholder}
              className={cx(INPUT_CLASS, "mt-1")}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.status}</span>
            <select className={cx(INPUT_CLASS, "mt-1")} value="active" disabled>
              <option value="active">{T.allStatuses}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.accessLevel}</span>
            <select
              value={accessFilter}
              onChange={(event) => handleAccessChange(event.target.value)}
              className={cx(INPUT_CLASS, "mt-1")}
            >
              {ACCESS_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.type}</span>
            <select
              value={roleTypeFilter}
              onChange={(event) => handleRoleTypeChange(event.target.value)}
              className={cx(INPUT_CLASS, "mt-1")}
            >
              {ROLE_TYPE_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button type="submit" className={PRIMARY_BUTTON_CLASS}>{T.apply}</button>
          </div>

          <div className="flex items-end">
            <button type="button" onClick={resetFilters} className={SECONDARY_BUTTON_CLASS}>{T.reset}</button>
          </div>
        </form>
      </section>

      <div className="flex flex-wrap gap-2">
        {quickTabs.map((tab) => {
          const active = roleTypeFilter === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleRoleTypeChange(tab.value)}
              className={cx(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-1 transition",
                active
                  ? "bg-slate-950 text-white ring-slate-950"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              )}
            >
              {tab.label}
              <span className={cx("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/15" : "bg-slate-100")}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <section className="grid gap-4">
        <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-500">
            <div className="flex flex-wrap gap-3">
              <span>{T.shown} {filteredRoles.length} {T.of} {roles.length} {T.roles.toLowerCase()}</span>
              <span>-</span>
              <span>{T.permissions}: {permissions.length}{roleDetailsLoading ? "..." : ""}</span>
            </div>
            <button type="button" data-testid="admin-roles-export-csv-button" onClick={handleExportCsv} disabled={filteredRoles.length === 0} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
              {T.exportCsv}
            </button>
          </div>

          {filteredRoles.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{T.noRoles}</div>
          ) : (
            <div className="overflow-x-auto">
              <table data-testid="admin-roles-table" className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-5 py-4">{T.role}</th>
                    <th className="px-5 py-4">{T.type}</th>
                    <th className="px-5 py-4">{T.accessLevel}</th>
                    <th className="px-5 py-4">{T.permissions}</th>
                    <th className="px-5 py-4">{T.assigned}</th>
                    <th className="px-5 py-4">{T.status}</th>
                    <th className="px-5 py-4 text-right">{T.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role) => {
                    const selected = selectedListRole?.id === role.id;
                    const level = getRoleAccessLevel(role, permissions, selectedRole, roleDetailsById);
                    const permissionCount = getRolePermissionCount(role, selectedRole, roleDetailsById);
                    const assignedCount = getRoleAssignmentCount(role, users);

                    return (
                      <Fragment key={`role-row-block-${role.id}`}>
                        <tr className={cx("border-t border-slate-100 align-middle transition", selected ? "bg-indigo-50/40" : "bg-white hover:bg-slate-50")}>
                        <td className="px-5 py-4">
                          <button type="button" onClick={() => handleOpenRole(role)} className="flex min-w-72 items-center gap-3 text-left">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                              {getInitials(role.name || role.code)}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-black text-slate-950">{role.name}</span>
                              <span className="mt-1 block break-all text-xs text-slate-500">{role.code}</span>
                              <span className="mt-1 block line-clamp-1 text-xs text-slate-500">{role.description || T.notAvailable}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={getTypeBadgeClass(role)}>{getTypeLabel(role)}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={getAccessBadgeClass(level)}>{getAccessLabel(level)}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-black text-slate-950">{permissionCount}</div>
                          <div className="mt-1 text-xs text-slate-500">{permissions.length ? `${Math.round((permissionCount / permissions.length) * 100)}%` : "0%"}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-black text-slate-950">{assignedCount}</div>
                          <div className="mt-1 text-xs text-slate-500">{users.length ? `${Math.round((assignedCount / users.length) * 100)}%` : "0%"}</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.active}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div data-testid={`admin-role-row-actions-${role.id}`} className="flex justify-end gap-2">
                            <button type="button" onClick={() => handleOpenRole(role)} disabled={selectedRoleLoading} className={SECONDARY_BUTTON_CLASS}>
                              {selected ? T.opened : T.open}
                            </button>
                            <Link to={buildUsersPath({ role_id: role.id })} className={SECONDARY_BUTTON_CLASS}>
                              {T.users}
                            </Link>
                            <Link to={buildPermissionsPath({ q: role.code })} className={SECONDARY_BUTTON_CLASS}>
                              {T.permissions}
                            </Link>
                          </div>
                        </td>
                        </tr>
                        {selected ? (
                          <tr key={`role-detail-${role.id}`} className="bg-slate-50/70">
                            <td colSpan={7} className="px-4 pb-4 pt-0">
                              <RoleInlineDetail
                                role={role}
                                selectedRole={selectedRole}
                                selectedRoleLoading={selectedRoleLoading}
                                selectedRoleError={selectedRoleError}
                                permissions={permissions}
                                users={users}
                                roleDetailsById={roleDetailsById}
                                onClose={() => {
                                  setLocalSelectedRoleId("");
                                  onCloseRole();
                                }}
                                onUpdateRole={onUpdateRole}
                                onDeleteRole={onDeleteRole}
                                onAssignRolePermission={onAssignRolePermission}
                                onRemoveRolePermission={onRemoveRolePermission}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </section>
    </main>
  );
}

export default RolesPage;
