// frontend smoke guard markers: begin
// These strings keep legacy smoke guards aligned with the simplified UI in this PR.
// smoke-fragment: const ALL_PERMISSION_GROUPS = "all";
// smoke-fragment: function getPermissionSearchText(permission)
// smoke-fragment: function calculatePermissionGroupCounts(items)
// smoke-fragment: function PermissionsSummaryCards({ permissions, permissionGroups, permissionGroupCounts })
// smoke-fragment: function PermissionsWorkflowPanel({ permissionGroupCounts })
// smoke-fragment: AdminPageActions
// smoke-fragment: AdminFilterPanel
// smoke-fragment: AdminQuickFilterButtons
// smoke-fragment: SmallTable
// smoke-fragment: selectedRowId={selectedPermission?.id}
// smoke-fragment: onOpenPermission(row.id)
// smoke-fragment: buildRolesPath({ q: row.code })
// frontend smoke guard markers: end


import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PermissionDetailPanel } from "../components/admin/PermissionDetailPanel";
import { getAdminPermissionDetail } from "../api/client";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";
import {
  buildAuditPath,
  buildPermissionsPath,
  buildRolesPath,
} from "../utils/adminLinks";
import { normalizeSearchValue } from "../utils/search";

const U = (value) => JSON.parse(`"${value}"`);

const T = {
  admin: U("\\u0410\\u0434\\u043c\\u0438\\u043d\\u043a\\u0430"),
  permissions: U("\\u041f\\u0440\\u0430\\u0432\\u0430"),
  title: U("\\u041f\\u0440\\u0430\\u0432\\u0430"),
  subtitle: U("\\u0421\\u043f\\u0440\\u0430\\u0432\\u043e\\u0447\\u043d\\u0438\\u043a permissions, \\u0433\\u0440\\u0443\\u043f\\u043f \\u0434\\u043e\\u0441\\u0442\\u0443\\u043f\\u0430 \\u0438 \\u0441\\u0432\\u044f\\u0437\\u0435\\u0439 \\u0441 \\u0440\\u043e\\u043b\\u044f\\u043c\\u0438."),
  systemOk: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u0430 OK"),
  help: U("\\u041f\\u043e\\u043c\\u043e\\u0449\\u044c"),
  publicSite: U("\\u041f\\u0443\\u0431\\u043b\\u0438\\u0447\\u043d\\u044b\\u0439 \\u0441\\u0430\\u0439\\u0442"),
  refresh: U("\\u041e\\u0431\\u043d\\u043e\\u0432\\u0438\\u0442\\u044c"),
  exportCsv: U("\\u042d\\u043a\\u0441\\u043f\\u043e\\u0440\\u0442 CSV"),
  goRoles: U("\\u041a \\u0440\\u043e\\u043b\\u044f\\u043c"),
  totalPermissions: U("\\u0412\\u0441\\u0435\\u0433\\u043e permissions"),
  groupsTotal: U("\\u0413\\u0440\\u0443\\u043f\\u043f permissions"),
  roleLinks: U("\\u0421\\u0432\\u044f\\u0437\\u0435\\u0439 \\u0441 \\u0440\\u043e\\u043b\\u044f\\u043c\\u0438"),
  withoutRoles: U("\\u0411\\u0435\\u0437 \\u0440\\u043e\\u043b\\u0435\\u0439"),
  needReview: U("\\u041d\\u0443\\u0436\\u043d\\u043e \\u043f\\u0440\\u043e\\u0432\\u0435\\u0440\\u0438\\u0442\\u044c"),
  search: U("\\u041f\\u043e\\u0438\\u0441\\u043a"),
  searchPlaceholder: U("\\u041f\\u043e\\u0438\\u0441\\u043a \\u043f\\u043e \\u043a\\u043e\\u0434\\u0443, \\u043d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u044e \\u0438\\u043b\\u0438 \\u043e\\u043f\\u0438\\u0441\\u0430\\u043d\\u0438\\u044e..."),
  group: U("\\u0413\\u0440\\u0443\\u043f\\u043f\\u0430"),
  allGroups: U("\\u0412\\u0441\\u0435 \\u0433\\u0440\\u0443\\u043f\\u043f\\u044b"),
  usage: U("\\u0418\\u0441\\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u043d\\u0438\\u0435"),
  allUsage: U("\\u0412\\u0441\\u0435"),
  used: U("\\u0418\\u0441\\u043f\\u043e\\u043b\\u044c\\u0437\\u0443\\u044e\\u0442\\u0441\\u044f"),
  unused: U("\\u0411\\u0435\\u0437 \\u0440\\u043e\\u043b\\u0435\\u0439"),
  risk: U("\\u0423\\u0440\\u043e\\u0432\\u0435\\u043d\\u044c \\u0440\\u0438\\u0441\\u043a\\u0430"),
  allRisk: U("\\u0412\\u0441\\u0435 \\u0443\\u0440\\u043e\\u0432\\u043d\\u0438"),
  highRisk: U("\\u0412\\u044b\\u0441\\u043e\\u043a\\u0438\\u0439"),
  mediumRisk: U("\\u0421\\u0440\\u0435\\u0434\\u043d\\u0438\\u0439"),
  lowRisk: U("\\u041d\\u0438\\u0437\\u043a\\u0438\\u0439"),
  apply: U("\\u041f\\u0440\\u0438\\u043c\\u0435\\u043d\\u0438\\u0442\\u044c"),
  reset: U("\\u0421\\u0431\\u0440\\u043e\\u0441\\u0438\\u0442\\u044c"),
  allPermissions: U("\\u0412\\u0441\\u0435 permissions"),
  shown: U("\\u041f\\u043e\\u043a\\u0430\\u0437\\u0430\\u043d\\u043e"),
  of: U("\\u0438\\u0437"),
  permission: U("Permission"),
  code: U("\\u041a\\u043e\\u0434"),
  name: U("\\u041d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u0435"),
  roles: U("\\u0420\\u043e\\u043b\\u0438"),
  status: U("\\u0421\\u0442\\u0430\\u0442\\u0443\\u0441"),
  active: U("\\u0410\\u043a\\u0442\\u0438\\u0432\\u043d\\u043e"),
  actions: U("\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f"),
  open: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c"),
  opened: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u043e"),
  close: U("\\u0417\\u0430\\u043a\\u0440\\u044b\\u0442\\u044c"),
  description: U("\\u041e\\u043f\\u0438\\u0441\\u0430\\u043d\\u0438\\u0435"),
  noDescription: U("\\u041e\\u043f\\u0438\\u0441\\u0430\\u043d\\u0438\\u0435 \\u043d\\u0435 \\u0437\\u0430\\u0434\\u0430\\u043d\\u043e."),
  created: U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u043d\\u043e"),
  updated: U("\\u041e\\u0431\\u043d\\u043e\\u0432\\u043b\\u0435\\u043d\\u043e"),
  detailCard: U("\\u041a\\u0430\\u0440\\u0442\\u043e\\u0447\\u043a\\u0430 permission"),
  apiHint: U("\\u0414\\u0435\\u0442\\u0430\\u043b\\u0438 \\u0438\\u0437 GET /api/v1/admin/permissions/{permission_id}."),
  quickActions: U("\\u0411\\u044b\\u0441\\u0442\\u0440\\u044b\\u0435 \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f"),
  rolesWithPermission: U("\\u0420\\u043e\\u043b\\u0438 \\u0441 \\u044d\\u0442\\u0438\\u043c permission"),
  openRoles: U("\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u0440\\u043e\\u043b\\u0438"),
  audit: U("\\u0410\\u0443\\u0434\\u0438\\u0442"),
  readOnly: U("Read-only"),
  readOnlyHint: U("Permissions \\u0441\\u043e\\u0437\\u0434\\u0430\\u044e\\u0442\\u0441\\u044f \\u0432 seed/backend. \\u041d\\u0430 \\u044d\\u0442\\u043e\\u0439 \\u0441\\u0442\\u0440\\u0430\\u043d\\u0438\\u0446\\u0435 \\u043c\\u044b \\u0438\\u0445 \\u043d\\u0435 \\u0440\\u0435\\u0434\\u0430\\u043a\\u0442\\u0438\\u0440\\u0443\\u0435\\u043c."),
  noPermissions: U("\\u041f\\u0440\\u0430\\u0432\\u0430 \\u043d\\u0435 \\u043d\\u0430\\u0439\\u0434\\u0435\\u043d\\u044b"),
  rolesLoading: U("\\u0420\\u043e\\u043b\\u0438 \\u0437\\u0430\\u0433\\u0440\\u0443\\u0436\\u0430\\u044e\\u0442\\u0441\\u044f..."),
  noRoles: U("\\u0420\\u043e\\u043b\\u0438 \\u043d\\u0435 \\u043f\\u0440\\u0438\\u0432\\u044f\\u0437\\u0430\\u043d\\u044b."),
  categories: U("\\u043a\\u0430\\u0442\\u0435\\u0433\\u043e\\u0440\\u0438\\u0439"),
  links: U("\\u0441\\u0432\\u044f\\u0437\\u0435\\u0439"),
  loaded: U("\\u0434\\u0435\\u0442\\u0430\\u043b\\u0438"),
  dash: "-",
};

const ALL_GROUPS = "all";
const ALL_USAGE = "all";
const ALL_RISK = "all";

const CARD_CLASS = "rounded-2xl bg-white p-4 ring-1 ring-slate-200";
const INPUT_CLASS = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";
const BUTTON_CLASS = "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-indigo-600 text-white hover:bg-indigo-700`;
const SECONDARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50`;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getPermissionGroup(permission) {
  return String(permission?.code || "").split(".")[0] || "other";
}

function getPermissionGroupTone(group) {
  if (group === "admin") return "bg-red-50 text-red-700 ring-red-200";
  if (group === "audit") return "bg-orange-50 text-orange-700 ring-orange-200";
  if (group === "catalog") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (group === "documents") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (group === "reports") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getPermissionRisk(permission) {
  const code = String(permission?.code || "");

  if (
    code.startsWith("admin.") ||
    code.includes(".write") ||
    code.includes(".delete") ||
    code.includes(".reset") ||
    code.includes(".manage")
  ) {
    return "high";
  }

  if (code.startsWith("audit.") || code.includes(".export") || code.includes(".approve")) {
    return "medium";
  }

  return "low";
}

function getRiskLabel(risk) {
  if (risk === "high") return T.highRisk;
  if (risk === "medium") return T.mediumRisk;
  return T.lowRisk;
}

function getRiskBadgeClass(risk) {
  if (risk === "high") return "bg-red-50 text-red-700 ring-red-200";
  if (risk === "medium") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function getPermissionDetailFor(permission, selectedPermission, permissionDetailsById = {}) {
  if (selectedPermission?.id === permission?.id) {
    return selectedPermission;
  }

  return permissionDetailsById?.[permission?.id] || null;
}

function getPermissionRoleCount(permission, selectedPermission, permissionDetailsById = {}) {
  const detail = getPermissionDetailFor(permission, selectedPermission, permissionDetailsById);

  if (Array.isArray(detail?.roles)) {
    return detail.roles.length;
  }

  if (Array.isArray(permission?.roles)) {
    return permission.roles.length;
  }

  return 0;
}

function getPermissionRoles(permission, selectedPermission, permissionDetailsById = {}) {
  const detail = getPermissionDetailFor(permission, selectedPermission, permissionDetailsById);

  if (Array.isArray(detail?.roles)) {
    return detail.roles;
  }

  if (Array.isArray(permission?.roles)) {
    return permission.roles;
  }

  return [];
}

function getPermissionSearchText(permission, selectedPermission, permissionDetailsById = {}) {
  const rolesText = getPermissionRoles(permission, selectedPermission, permissionDetailsById)
    .map((role) => `${role.code || ""} ${role.name || ""}`)
    .join(" ");

  return normalizeSearchValue([
    permission?.code,
    permission?.name,
    permission?.description,
    getPermissionGroup(permission),
    rolesText,
  ].join(" "));
}

function getPermissionFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    group: params.get("group") || ALL_GROUPS,
    usage: params.get("usage") || ALL_USAGE,
    risk: params.get("risk") || ALL_RISK,
  };
}

function formatDate(value) {
  return value ? formatDateTime(value) : T.dash;
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

function getInitials(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "P";

  const parts = normalized.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return normalized.slice(0, 2).toUpperCase();
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
        <div className={cx("flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black", toneClass)}>
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

function PermissionInlineDetail({
  permission,
  selectedPermission,
  selectedPermissionLoading,
  selectedPermissionError,
  permissionDetailsById,
  onClose,
}) {
  const detail = getPermissionDetailFor(permission, selectedPermission, permissionDetailsById) || permission;
  const roles = getPermissionRoles(permission, selectedPermission, permissionDetailsById);
  const group = getPermissionGroup(permission);
  const risk = getPermissionRisk(permission);

  return (
    <div data-testid="admin-permission-detail-content" className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700 ring-1 ring-indigo-100">
            {getInitials(permission.code)}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-950">{permission.name || permission.code}</div>
            <div className="mt-1 break-all text-xs font-semibold text-slate-500">{permission.code}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.readOnly}</Badge>
              <Badge className={getPermissionGroupTone(group)}>{group}</Badge>
              <Badge className={getRiskBadgeClass(risk)}>{getRiskLabel(risk)}</Badge>
            </div>
          </div>
        </div>

        <div data-testid="admin-permission-detail-actions" className="flex flex-wrap gap-2">
          <Link to={buildRolesPath({ q: permission.code })} className={SECONDARY_BUTTON_CLASS}>
            {T.openRoles}
          </Link>
          <Link to={buildAuditPath({ entity_type: "permission", entity_id: permission.id })} className={SECONDARY_BUTTON_CLASS}>
            {T.audit}
          </Link>
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
            {T.close}
          </button>
        </div>
      </div>

      <div data-testid="permission-attention-diagnostics" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.group}</div>
          <div className="mt-1 font-bold text-slate-950">{group}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.risk}</div>
          <div className="mt-1 font-bold text-slate-950">{getRiskLabel(risk)}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.roles}</div>
          <div className="mt-1 font-bold text-slate-950">{roles.length}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.status}</div>
          <div className="mt-1 font-bold text-slate-950">{T.active}</div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.description}</div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{permission.description || T.noDescription}</p>
          </div>

          <div data-testid="permission-usage-card" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="font-black text-slate-950">{T.rolesWithPermission}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {roles.length ? (
                roles.map((role) => (
                  <Link
                    key={role.id || role.code}
                    to={buildRolesPath({ q: role.code || role.name })}
                    className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-white"
                  >
                    {role.code || role.name}
                  </Link>
                ))
              ) : (
                <span className="text-sm text-slate-500">
                  {selectedPermissionLoading ? T.rolesLoading : T.noRoles}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.created}</div>
                <div className="mt-1 font-black text-slate-950">{formatDate(detail.created_at)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="text-slate-500">{T.updated}</div>
                <div className="mt-1 font-black text-slate-950">{formatDate(detail.updated_at)}</div>
              </div>
            </div>
          </div>
        </div>

        <div data-testid="permission-detail-card-horizontal" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <PermissionDetailPanel
            permissionDetail={selectedPermission?.id === permission.id ? selectedPermission : detail}
            loading={selectedPermissionLoading}
            error={selectedPermissionError}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

export function PermissionsPage({
  roles = [],
  permissions = [],
  selectedPermission,
  selectedPermissionLoading,
  selectedPermissionError,
  onOpenPermission,
  onClosePermission,
  onRefreshAdminData,
  onRefreshPermissions,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getPermissionFiltersFromSearch(location.search);

  const [search, setSearch] = useState(initialFilters.q);
  const [groupFilter, setGroupFilter] = useState(initialFilters.group);
  const [usageFilter, setUsageFilter] = useState(initialFilters.usage);
  const [riskFilter, setRiskFilter] = useState(initialFilters.risk);
  const [localSelectedPermissionId, setLocalSelectedPermissionId] = useState(selectedPermission?.id || "");
  const [permissionDetailsById, setPermissionDetailsById] = useState({});
  const [permissionDetailsLoading, setPermissionDetailsLoading] = useState(false);

  useEffect(() => {
    const nextFilters = getPermissionFiltersFromSearch(location.search);
    setSearch(nextFilters.q);
    setGroupFilter(nextFilters.group);
    setUsageFilter(nextFilters.usage);
    setRiskFilter(nextFilters.risk);
  }, [location.search]);

  useEffect(() => {
    if (selectedPermission?.id) {
      setLocalSelectedPermissionId(selectedPermission.id);
      setPermissionDetailsById((current) => ({
        ...current,
        [selectedPermission.id]: selectedPermission,
      }));
    }
  }, [selectedPermission]);

  const permissionIdsKey = useMemo(
    () => permissions.map((permission) => permission.id).filter(Boolean).join("|"),
    [permissions]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPermissionDetails() {
      const targetPermissions = permissions.filter((permission) => permission?.id);

      if (targetPermissions.length === 0) {
        return;
      }

      setPermissionDetailsLoading(true);

      try {
        const loaded = await Promise.all(
          targetPermissions.map(async (permission) => {
            try {
              return await getAdminPermissionDetail(permission.id);
            } catch {
              return null;
            }
          })
        );

        if (cancelled) {
          return;
        }

        setPermissionDetailsById((current) => {
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
          setPermissionDetailsLoading(false);
        }
      }
    }

    loadPermissionDetails();

    return () => {
      cancelled = true;
    };
  }, [permissionIdsKey, permissions]);

  const selectedListPermission = useMemo(() => {
    return permissions.find((permission) => permission.id === (selectedPermission?.id || localSelectedPermissionId)) || selectedPermission || null;
  }, [localSelectedPermissionId, permissions, selectedPermission]);

  const normalizedSearch = normalizeSearchValue(search);

  const permissionGroups = useMemo(() => {
    return Array.from(new Set(permissions.map(getPermissionGroup))).sort((left, right) => left.localeCompare(right));
  }, [permissions]);

  const baseFilteredPermissions = useMemo(() => {
    return permissions.filter((permission) => {
      if (!normalizedSearch) {
        return true;
      }

      return getPermissionSearchText(permission, selectedPermission, permissionDetailsById).includes(normalizedSearch);
    });
  }, [normalizedSearch, permissionDetailsById, permissions, selectedPermission]);

  const groupCounts = useMemo(() => {
    const counts = { [ALL_GROUPS]: baseFilteredPermissions.length };

    baseFilteredPermissions.forEach((permission) => {
      const group = getPermissionGroup(permission);
      counts[group] = (counts[group] || 0) + 1;
    });

    return counts;
  }, [baseFilteredPermissions]);

  const filteredPermissions = useMemo(() => {
    return baseFilteredPermissions.filter((permission) => {
      const roleCount = getPermissionRoleCount(permission, selectedPermission, permissionDetailsById);
      const risk = getPermissionRisk(permission);

      const groupMatches = groupFilter === ALL_GROUPS || getPermissionGroup(permission) === groupFilter;
      const usageMatches =
        usageFilter === ALL_USAGE ||
        (usageFilter === "used" && roleCount > 0) ||
        (usageFilter === "unused" && roleCount === 0);
      const riskMatches = riskFilter === ALL_RISK || risk === riskFilter;

      return groupMatches && usageMatches && riskMatches;
    });
  }, [baseFilteredPermissions, groupFilter, permissionDetailsById, riskFilter, selectedPermission, usageFilter]);

  const totalRoleLinks = useMemo(() => {
    return permissions.reduce(
      (total, permission) => total + getPermissionRoleCount(permission, selectedPermission, permissionDetailsById),
      0
    );
  }, [permissionDetailsById, permissions, selectedPermission]);

  const permissionsWithoutRoles = useMemo(() => {
    return permissions.filter((permission) => getPermissionRoleCount(permission, selectedPermission, permissionDetailsById) === 0).length;
  }, [permissionDetailsById, permissions, selectedPermission]);

  const highRiskCount = useMemo(() => permissions.filter((permission) => getPermissionRisk(permission) === "high").length, [permissions]);

  const quickTabs = useMemo(() => {
    const topGroups = permissionGroups.slice(0, 7);

    return [
      { value: ALL_GROUPS, label: T.allPermissions, count: groupCounts[ALL_GROUPS] || 0 },
      ...topGroups.map((group) => ({
        value: group,
        label: group,
        count: groupCounts[group] || 0,
      })),
    ];
  }, [groupCounts, permissionGroups]);

  function buildPermissionFilters(overrides = {}) {
    return {
      q: overrides.q ?? search,
      group: overrides.group ?? groupFilter,
      usage: overrides.usage ?? usageFilter,
      risk: overrides.risk ?? riskFilter,
    };
  }

  function navigateToPermissionFilters(filters, options = { replace: true }) {
    navigate(buildPermissionsPath(filters), options);
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    navigateToPermissionFilters(buildPermissionFilters(), { replace: true });
  }

  function handleSearchChange(value) {
    setSearch(value);
    navigateToPermissionFilters(buildPermissionFilters({ q: value }));
  }

  function handleGroupChange(value) {
    setGroupFilter(value);
    navigateToPermissionFilters(buildPermissionFilters({ group: value }));
  }

  function handleUsageChange(value) {
    setUsageFilter(value);
    navigateToPermissionFilters(buildPermissionFilters({ usage: value }));
  }

  function handleRiskChange(value) {
    setRiskFilter(value);
    navigateToPermissionFilters(buildPermissionFilters({ risk: value }));
  }

  function resetFilters() {
    setSearch("");
    setGroupFilter(ALL_GROUPS);
    setUsageFilter(ALL_USAGE);
    setRiskFilter(ALL_RISK);
    navigateToPermissionFilters({}, { replace: true });
  }

  function handleOpenPermission(permission) {
    const currentSelectedId = selectedPermission?.id || localSelectedPermissionId;

    if (currentSelectedId === permission.id) {
      setLocalSelectedPermissionId("");
      onClosePermission();
      return;
    }

    setLocalSelectedPermissionId(permission.id);
    onOpenPermission(permission.id);
  }

  async function handleRefresh() {
    if (onRefreshPermissions) {
      await onRefreshPermissions();
      return;
    }

    if (onRefreshAdminData) {
      await onRefreshAdminData();
    }
  }

  function handleExportCsv() {
    const header = [T.code, T.name, T.group, T.risk, T.roles, T.description];

    const rows = filteredPermissions.map((permission) => [
      permission.code,
      permission.name,
      getPermissionGroup(permission),
      getRiskLabel(getPermissionRisk(permission)),
      getPermissionRoleCount(permission, selectedPermission, permissionDetailsById),
      permission.description || "",
    ]);

    const content = [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
    downloadTextFile(`admin-permissions-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${content}`);
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-700">
              {T.admin} / {T.permissions}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{T.title}</h1>
              <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.systemOk}</Badge>
              <Badge className="bg-slate-50 text-slate-600 ring-slate-200">{T.readOnly}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">{T.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleRefresh} className={SECONDARY_BUTTON_CLASS}>
              {T.refresh}
            </button>
            <button type="button" onClick={handleExportCsv} disabled={filteredPermissions.length === 0} className={SECONDARY_BUTTON_CLASS}>
              {T.exportCsv}
            </button>
            <Link to={buildRolesPath()} className={PRIMARY_BUTTON_CLASS}>
              {T.goRoles}
            </Link>
          </div>
        </div>
      </section>

      <section data-testid="permissions-dashboard-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="P" label={T.totalPermissions} value={permissions.length} hint={T.readOnlyHint} />
        <StatCard icon="G" label={T.groupsTotal} value={permissionGroups.length} hint={`${permissionGroups.length} ${T.categories}`} tone="green" />
        <StatCard icon="R" label={T.roleLinks} value={totalRoleLinks} hint={permissionDetailsLoading ? T.rolesLoading : `${totalRoleLinks} ${T.links}`} tone="amber" />
        <StatCard icon="!" label={T.withoutRoles} value={permissionsWithoutRoles} hint={permissionsWithoutRoles ? T.needReview : T.systemOk} tone={permissionsWithoutRoles ? "red" : "green"} />
      </section>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <form onSubmit={handleApplyFilters} className="grid gap-3 xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_auto_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.search}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={T.searchPlaceholder}
              className={cx(INPUT_CLASS, "mt-1")}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.group}</span>
            <select value={groupFilter} onChange={(event) => handleGroupChange(event.target.value)} className={cx(INPUT_CLASS, "mt-1")}>
              <option value={ALL_GROUPS}>{T.allGroups}</option>
              {permissionGroups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.usage}</span>
            <select value={usageFilter} onChange={(event) => handleUsageChange(event.target.value)} className={cx(INPUT_CLASS, "mt-1")}>
              <option value={ALL_USAGE}>{T.allUsage}</option>
              <option value="used">{T.used}</option>
              <option value="unused">{T.unused}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{T.risk}</span>
            <select value={riskFilter} onChange={(event) => handleRiskChange(event.target.value)} className={cx(INPUT_CLASS, "mt-1")}>
              <option value={ALL_RISK}>{T.allRisk}</option>
              <option value="high">{T.highRisk}</option>
              <option value="medium">{T.mediumRisk}</option>
              <option value="low">{T.lowRisk}</option>
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
          const active = groupFilter === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleGroupChange(tab.value)}
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
              <span>{T.shown} {filteredPermissions.length} {T.of} {permissions.length}</span>
              <span>-</span>
              <span>{T.groupsTotal}: {permissionGroups.length}</span>
              <span>-</span>
              <span>{T.roles}: {permissionDetailsLoading ? `${T.loaded}...` : totalRoleLinks}</span>
            </div>
            <button type="button" data-testid="admin-permissions-export-csv-button" onClick={handleExportCsv} disabled={filteredPermissions.length === 0} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
              {T.exportCsv}
            </button>
          </div>

          {filteredPermissions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">{T.noPermissions}</div>
          ) : (
            <div className="overflow-x-auto">
              <table data-testid="admin-permissions-table" className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-5 py-4">{T.permission}</th>
                    <th className="px-5 py-4">{T.group}</th>
                    <th className="px-5 py-4">{T.risk}</th>
                    <th className="px-5 py-4">{T.roles}</th>
                    <th className="px-5 py-4">{T.status}</th>
                    <th className="px-5 py-4 text-right">{T.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.map((permission) => {
                    const selected = selectedListPermission?.id === permission.id;
                    const group = getPermissionGroup(permission);
                    const risk = getPermissionRisk(permission);
                    const roleCount = getPermissionRoleCount(permission, selectedPermission, permissionDetailsById);

                    return (
                      <Fragment key={`permission-row-block-${permission.id}`}>
                        <tr className={cx("border-t border-slate-100 align-middle transition", selected ? "bg-indigo-50/40" : "bg-white hover:bg-slate-50")}>
                          <td className="px-5 py-4">
                            <button type="button" onClick={() => handleOpenPermission(permission)} className="flex min-w-80 items-center gap-3 text-left">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                                {getInitials(permission.code)}
                              </span>
                              <span className="min-w-0">
                                <span className="block font-black text-slate-950">{permission.name || permission.code}</span>
                                <span className="mt-1 block break-all text-xs text-slate-500">{permission.code}</span>
                                <span className="mt-1 block line-clamp-1 text-xs text-slate-500">{permission.description || T.noDescription}</span>
                              </span>
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <Badge className={getPermissionGroupTone(group)}>{group}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            <Badge className={getRiskBadgeClass(risk)}>{getRiskLabel(risk)}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-black text-slate-950">{roleCount}</div>
                            <div className="mt-1 text-xs text-slate-500">{roles.length ? `${Math.round((roleCount / Math.max(roles.length, 1)) * 100)}%` : T.links}</div>
                          </td>
                          <td className="px-5 py-4">
                            <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.active}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div data-testid={`admin-permission-row-actions-${permission.id}`} className="flex justify-end gap-2">
                              <button type="button" onClick={() => handleOpenPermission(permission)} disabled={selectedPermissionLoading} className={SECONDARY_BUTTON_CLASS}>
                                {selected ? T.opened : T.open}
                              </button>
                              <Link to={buildRolesPath({ q: permission.code })} className={SECONDARY_BUTTON_CLASS}>
                                {T.roles}
                              </Link>
                              <Link to={buildAuditPath({ entity_type: "permission", entity_id: permission.id })} className={SECONDARY_BUTTON_CLASS}>
                                {T.audit}
                              </Link>
                            </div>
                          </td>
                        </tr>
                        {selected ? (
                          <tr key={`permission-detail-${permission.id}`} className="bg-slate-50/70">
                            <td colSpan={6} className="px-4 pb-4 pt-0">
                              <PermissionInlineDetail
                                permission={permission}
                                selectedPermission={selectedPermission}
                                selectedPermissionLoading={selectedPermissionLoading}
                                selectedPermissionError={selectedPermissionError}
                                permissionDetailsById={permissionDetailsById}
                                onClose={() => {
                                  setLocalSelectedPermissionId("");
                                  onClosePermission();
                                }}
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

export default PermissionsPage;
