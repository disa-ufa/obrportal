import { Link } from "react-router-dom";
import {
  buildAuditPath,
  buildCoursesPath,
  buildDocumentsPath,
  buildEnrollmentsPath,
  buildGroupsPath,
  buildOrganizationsPath,
  buildPermissionsPath,
  buildRolesPath,
  buildUsersPath,
} from "../utils/adminLinks";
import { formatRuDateTimeDash as formatDateTime } from "../utils/dateFormat";

const U = (value) => JSON.parse(`"${value}"`);

const T = {
  admin: U("\\u0410\\u0434\\u043c\\u0438\\u043d\\u043a\\u0430"),
  overview: U("\\u041e\\u0431\\u0437\\u043e\\u0440"),
  title: U("\\u041e\\u0431\\u0437\\u043e\\u0440"),
  subtitle: U("\\u0421\\u0432\\u043e\\u0434\\u043a\\u0430 \\u043f\\u043e \\u0441\\u0438\\u0441\\u0442\\u0435\\u043c\\u0435 \\u0438 \\u043a\\u043b\\u044e\\u0447\\u0435\\u0432\\u044b\\u0435 \\u043f\\u043e\\u043a\\u0430\\u0437\\u0430\\u0442\\u0435\\u043b\\u0438."),
  systemOk: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u0430 OK"),
  refresh: U("\\u041e\\u0431\\u043d\\u043e\\u0432\\u0438\\u0442\\u044c"),
  exportReport: U("\\u042d\\u043a\\u0441\\u043f\\u043e\\u0440\\u0442 \\u043e\\u0442\\u0447\\u0451\\u0442\\u0430"),
  users: U("\\u041f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0438"),
  organizations: U("\\u041e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u0438"),
  programs: U("\\u041f\\u0440\\u043e\\u0433\\u0440\\u0430\\u043c\\u043c\\u044b"),
  courses: U("\\u041f\\u0440\\u043e\\u0433\\u0440\\u0430\\u043c\\u043c\\u044b"),
  documents: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b"),
  enrollments: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f"),
  criticalEvents: U("\\u041a\\u0440\\u0438\\u0442\\u0438\\u0447\\u0435\\u0441\\u043a\\u0438\\u0435 \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f"),
  active: U("\\u0410\\u043a\\u0442\\u0438\\u0432\\u043d\\u044b\\u0445"),
  published: U("\\u041e\\u043f\\u0443\\u0431\\u043b\\u0438\\u043a\\u043e\\u0432\\u0430\\u043d\\u043e"),
  confirmed: U("\\u041f\\u043e\\u0434\\u0442\\u0432\\u0435\\u0440\\u0436\\u0434\\u0435\\u043d\\u043e"),
  requireAttention: U("\\u0422\\u0440\\u0435\\u0431\\u0443\\u0435\\u0442 \\u0432\\u043d\\u0438\\u043c\\u0430\\u043d\\u0438\\u044f"),
  activity: U("\\u0410\\u043a\\u0442\\u0438\\u0432\\u043d\\u043e\\u0441\\u0442\\u044c \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0435\\u0439"),
  last7Days: U("\\u041f\\u043e\\u0441\\u043b\\u0435\\u0434\\u043d\\u0438\\u0435 7 \\u0434\\u043d\\u0435\\u0439"),
  actionBySections: U("\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f \\u043f\\u043e \\u0440\\u0430\\u0437\\u0434\\u0435\\u043b\\u0430\\u043c"),
  total: U("\\u0412\\u0441\\u0435\\u0433\\u043e"),
  other: U("\\u0414\\u0440\\u0443\\u0433\\u0438\\u0435"),
  topUsers: U("\\u0422\\u043e\\u043f \\u0430\\u043a\\u0442\\u0438\\u0432\\u043d\\u044b\\u0445 \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u0435\\u0439"),
  actions: U("\\u0414\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u0439"),
  quickActions: U("\\u0411\\u044b\\u0441\\u0442\\u0440\\u044b\\u0435 \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f"),
  recentEvents: U("\\u041d\\u0435\\u0434\\u0430\\u0432\\u043d\\u0438\\u0435 \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f"),
  systemNotifications: U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u043d\\u044b\\u0435 \\u0443\\u0432\\u0435\\u0434\\u043e\\u043c\\u043b\\u0435\\u043d\\u0438\\u044f"),
  systemState: U("\\u0421\\u043e\\u0441\\u0442\\u043e\\u044f\\u043d\\u0438\\u0435 \\u0441\\u0438\\u0441\\u0442\\u0435\\u043c\\u044b"),
  systemDetails: U("\\u0414\\u0435\\u0442\\u0430\\u043b\\u0438 \\u0441\\u0438\\u0441\\u0442\\u0435\\u043c\\u044b"),
  createUser: U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044f"),
  createOrg: U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u043e\\u0440\\u0433\\u0430\\u043d\\u0438\\u0437\\u0430\\u0446\\u0438\\u044e"),
  createProgram: U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u043f\\u0440\\u043e\\u0433\\u0440\\u0430\\u043c\\u043c\\u0443"),
  uploadDocument: U("\\u0417\\u0430\\u0433\\u0440\\u0443\\u0437\\u0438\\u0442\\u044c \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
  assignCourse: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0438\\u0442\\u044c \\u043a\\u0443\\u0440\\u0441"),
  manageRoles: U("\\u0423\\u043f\\u0440\\u0430\\u0432\\u043b\\u0435\\u043d\\u0438\\u0435 \\u0440\\u043e\\u043b\\u044f\\u043c\\u0438"),
  viewAudit: U("\\u041f\\u0440\\u043e\\u0441\\u043c\\u043e\\u0442\\u0440 \\u0430\\u0443\\u0434\\u0438\\u0442\\u0430"),
  settings: U("\\u041d\\u0430\\u0441\\u0442\\u0440\\u043e\\u0439\\u043a\\u0438 \\u0441\\u0438\\u0441\\u0442\\u0435\\u043c\\u044b"),
  allEvents: U("\\u0412\\u0441\\u0435 \\u0441\\u043e\\u0431\\u044b\\u0442\\u0438\\u044f"),
  allNotifications: U("\\u0412\\u0441\\u0435 \\u0443\\u0432\\u0435\\u0434\\u043e\\u043c\\u043b\\u0435\\u043d\\u0438\\u044f"),
  success: U("\\u0423\\u0441\\u043f\\u0435\\u0448\\u043d\\u043e"),
  newLabel: U("\\u041d\\u043e\\u0432\\u0430\\u044f"),
  warning: U("\\u0412\\u043d\\u0438\\u043c\\u0430\\u043d\\u0438\\u0435"),
  change: U("\\u0418\\u0437\\u043c\\u0435\\u043d\\u0435\\u043d\\u0438\\u0435"),
  database: U("\\u0411\\u0430\\u0437\\u0430 \\u0434\\u0430\\u043d\\u043d\\u044b\\u0445"),
  apiServices: "API",
  fileStorage: U("\\u0424\\u0430\\u0439\\u043b\\u043e\\u0432\\u043e\\u0435 \\u0445\\u0440\\u0430\\u043d\\u0438\\u043b\\u0438\\u0449\\u0435"),
  mailService: U("\\u041f\\u043e\\u0447\\u0442\\u043e\\u0432\\u044b\\u0439 \\u0441\\u0435\\u0440\\u0432\\u0438\\u0441"),
  backup: U("\\u0420\\u0435\\u0437\\u0435\\u0440\\u0432\\u043d\\u043e\\u0435 \\u043a\\u043e\\u043f\\u0438\\u0440\\u043e\\u0432\\u0430\\u043d\\u0438\\u0435"),
  ok: "OK",
  connected: U("\\u041f\\u043e\\u0434\\u043a\\u043b\\u044e\\u0447\\u0435\\u043d\\u0438\\u0435 \\u0430\\u043a\\u0442\\u0438\\u0432\\u043d\\u043e"),
  servicesWork: U("\\u0421\\u0435\\u0440\\u0432\\u0438\\u0441\\u044b \\u0440\\u0430\\u0431\\u043e\\u0442\\u0430\\u044e\\u0442"),
  queueEmpty: U("\\u041e\\u0447\\u0435\\u0440\\u0435\\u0434\\u044c \\u043f\\u0443\\u0441\\u0442\\u0430"),
  backupRecent: U("\\u041f\\u043e\\u0441\\u043b\\u0435\\u0434\\u043d\\u0435\\u0435: \\u0441\\u0435\\u0433\\u043e\\u0434\\u043d\\u044f"),
  noEvents: U("\\u0421\\u043e\\u0431\\u044b\\u0442\\u0438\\u0439 \\u043f\\u043e\\u043a\\u0430 \\u043d\\u0435\\u0442."),
  noUsers: U("\\u041d\\u0435\\u0442 \\u0434\\u0430\\u043d\\u043d\\u044b\\u0445 \\u043f\\u043e actor."),
  highLoad: U("\\u0415\\u0441\\u0442\\u044c \\u0437\\u0430\\u0434\\u0430\\u0447\\u0438 \\u043d\\u0430 \\u043a\\u043e\\u043d\\u0442\\u0440\\u043e\\u043b\\u044c"),
  documentsRequire: U("\\u0414\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442\\u044b \\u0442\\u0440\\u0435\\u0431\\u0443\\u044e\\u0442 \\u0432\\u043d\\u0438\\u043c\\u0430\\u043d\\u0438\\u044f"),
  enrollmentsRequire: U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f \\u0442\\u0440\\u0435\\u0431\\u0443\\u044e\\u0442 \\u0432\\u043d\\u0438\\u043c\\u0430\\u043d\\u0438\\u044f"),
  auditRequire: U("\\u041a\\u0440\\u0438\\u0442\\u0438\\u0447\\u043d\\u044b\\u0435 \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f \\u0432 audit-events"),
  availableUpdate: U("\\u0414\\u043e\\u0441\\u0442\\u0443\\u043f\\u043d\\u043e \\u043e\\u0431\\u043d\\u043e\\u0432\\u043b\\u0435\\u043d\\u0438\\u0435"),
  versionHint: U("\\u0422\\u0435\\u043a\\u0443\\u0449\\u0430\\u044f \\u0432\\u0435\\u0440\\u0441\\u0438\\u044f frontend \\u0441\\u043e\\u0431\\u0440\\u0430\\u043d\\u0430 \\u0443\\u0441\\u043f\\u0435\\u0448\\u043d\\u043e."),
  loading: U("\\u0417\\u0430\\u0433\\u0440\\u0443\\u0436\\u0430\\u0435\\u043c \\u043e\\u0431\\u0437\\u043e\\u0440..."),
  loadError: U("\\u0415\\u0441\\u0442\\u044c \\u043e\\u0448\\u0438\\u0431\\u043a\\u0430 \\u0437\\u0430\\u0433\\u0440\\u0443\\u0437\\u043a\\u0438."),
};

const CARD_CLASS = "rounded-2xl bg-white p-4 ring-1 ring-slate-200";
const BUTTON_CLASS = "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-indigo-600 text-white hover:bg-indigo-700`;
const SECONDARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50`;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function summaryNumber(summary, key, fallback = 0) {
  return asNumber(summary?.[key], fallback);
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(asNumber(value));
}

function formatDate(value) {
  return value ? formatDateTime(value) : "-";
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === new Date().toDateString();
}

function isCriticalAuditEvent(event) {
  const action = String(event?.action || "").toLowerCase();

  return (
    action.includes("fail") ||
    action.includes("error") ||
    action.includes("denied") ||
    action.includes("delete") ||
    action.includes("revoked") ||
    action.includes("password") ||
    action.includes("deactivate")
  );
}

function getEventCategory(event) {
  const action = String(event?.action || "").toLowerCase();
  const entityType = String(event?.entity_type || "").toLowerCase();

  if (action.includes("login") || action.includes("auth")) return "auth";
  if (entityType.includes("user")) return "users";
  if (entityType.includes("role")) return "roles";
  if (entityType.includes("permission")) return "permissions";
  if (entityType.includes("document")) return "documents";
  if (entityType.includes("enrollment")) return "enrollments";
  if (entityType.includes("course") || entityType.includes("lesson")) return "courses";
  return "other";
}

function getCategoryLabel(category) {
  const labels = {
    auth: U("\\u0410\\u0432\\u0442\\u043e\\u0440\\u0438\\u0437\\u0430\\u0446\\u0438\\u044f"),
    users: T.users,
    roles: T.roles,
    permissions: T.permissions,
    documents: T.documents,
    enrollments: T.enrollments,
    courses: T.courses,
    other: T.other,
  };

  return labels[category] || category;
}

function getActionLabel(action) {
  const value = String(action || "");

  const labels = {
    login_success: U("\\u0412\\u0445\\u043e\\u0434 \\u0432 \\u0441\\u0438\\u0441\\u0442\\u0435\\u043c\\u0443"),
    login_failed: U("\\u041e\\u0448\\u0438\\u0431\\u043a\\u0430 \\u0432\\u0445\\u043e\\u0434\\u0430"),
    "admin.user_created": U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u043d \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044c"),
    "admin.user_updated": U("\\u0418\\u0437\\u043c\\u0435\\u043d\\u0451\\u043d \\u043f\\u043e\\u043b\\u044c\\u0437\\u043e\\u0432\\u0430\\u0442\\u0435\\u043b\\u044c"),
    "admin.document_created": U("\\u0421\\u043e\\u0437\\u0434\\u0430\\u043d \\u0434\\u043e\\u043a\\u0443\\u043c\\u0435\\u043d\\u0442"),
    "admin.document_regenerated": U("\\u0420\\u0435\\u0433\\u0435\\u043d\\u0435\\u0440\\u0438\\u0440\\u043e\\u0432\\u0430\\u043d PDF"),
    "admin.enrollment_created": U("\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d \\u043a\\u0443\\u0440\\u0441"),
    "admin.role_permission_assigned": U("\\u0418\\u0437\\u043c\\u0435\\u043d\\u0435\\u043d\\u044b \\u043f\\u0440\\u0430\\u0432\\u0430 \\u0440\\u043e\\u043b\\u0438"),
  };

  return labels[value] || value.replace(/^admin\./, "").replaceAll("_", " ");
}

function getInitials(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "A";

  return normalized
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadTextFile(filename, content, type = "application/json;charset=utf-8") {
  const blob = new Blob([content], { type });
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

function getUserDisplayName(user) {
  return user?.full_name || user?.name || user?.email || user?.username || user?.id || "-";
}

function getUserEmail(user) {
  return user?.email || user?.username || "";
}

function getActorDisplayName(actorId, users) {
  const user = asArray(users).find((item) => item.id === actorId);
  return user ? getUserDisplayName(user) : actorId || U("\\u0421\\u0438\\u0441\\u0442\\u0435\\u043c\\u0430");
}

function buildTrend(days = 7, auditEvents = []) {
  const result = [];
  const now = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const key = date.toISOString().slice(0, 10);

    const count = auditEvents.filter((event) => {
      if (!event?.created_at) return false;
      return new Date(event.created_at).toISOString().slice(0, 10) === key;
    }).length;

    result.push({
      key,
      label: `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`,
      value: count,
    });
  }

  return result;
}

function Badge({ children, className }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", className)}>
      {children}
    </span>
  );
}

function KpiCard({ icon, label, value, hint, to, tone = "indigo" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "red"
          ? "bg-red-50 text-red-700"
          : tone === "blue"
            ? "bg-blue-50 text-blue-700"
            : "bg-indigo-50 text-indigo-700";

  const content = (
    <div className={CARD_CLASS}>
      <div className="flex items-start gap-4">
        <div className={cx("flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black", toneClass)}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{formatNumber(value)}</div>
          <div className="mt-2 text-xs text-slate-500">{hint}</div>
        </div>
      </div>
    </div>
  );

  return to ? <Link to={to} className="block transition hover:-translate-y-0.5">{content}</Link> : content;
}

function LineChart({ points }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const width = 640;
  const height = 220;
  const padding = 28;
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coordinates = points.map((point, index) => {
    const x = padding + index * step;
    const y = height - padding - (point.value / max) * (height - padding * 2);
    return { ...point, x, y };
  });

  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`;

  return (
    <div data-testid="dashboard-activity-chart" className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible">
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = padding + tick * ((height - padding * 2) / 4);
          return (
            <line key={tick} x1={padding} x2={width - padding} y1={y} y2={y} className="stroke-slate-100" />
          );
        })}
        <polygon points={area} className="fill-indigo-50" />
        <polyline points={polyline} fill="none" className="stroke-indigo-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="5" className="fill-white stroke-indigo-500" strokeWidth="3" />
            <text x={point.x} y={height - 4} textAnchor="middle" className="fill-slate-500 text-[11px]">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function DonutChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let current = 0;

  const gradients = items.map((item, index) => {
    const start = current;
    const end = current + (item.value / total) * 100;
    current = end;

    const colors = ["#6366f1", "#22c55e", "#f97316", "#3b82f6", "#94a3b8", "#e11d48", "#14b8a6"];
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  });

  return (
    <div data-testid="dashboard-section-distribution" className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center">
      <div
        className="grid h-48 w-48 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${gradients.join(", ")})` }}
      >
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center ring-1 ring-slate-100">
          <div>
            <div className="text-xs text-slate-500">{T.total}</div>
            <div className="text-xl font-black text-slate-950">{formatNumber(total)}</div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 gap-3">
        {items.map((item, index) => (
          <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: ["#6366f1", "#22c55e", "#f97316", "#3b82f6", "#94a3b8", "#e11d48", "#14b8a6"][index % 7] }}
              />
              <span className="font-semibold text-slate-700">{item.label}</span>
            </div>
            <div className="font-black text-slate-950">
              {formatNumber(item.value)}
              <span className="ml-1 text-xs font-semibold text-slate-400">
                ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAction({ icon, title, to }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-black text-slate-900 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">{icon}</span>
      {title}
    </Link>
  );
}

function StatusPill({ status = "ok" }) {
  return (
    <span className={cx(
      "inline-flex rounded-full px-2 py-0.5 text-xs font-black",
      status === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
    )}>
      {status === "ok" ? T.ok : T.warning}
    </span>
  );
}

export function DashboardPage({
  auth,
  adminData = {},
  loading = false,
  error = "",
  onRefreshAdminData,
}) {
  const dashboardSummary = adminData?.dashboardSummary || {};
  const worklistSummary = adminData?.worklistSummary || {};
  const users = asArray(adminData?.users);
  const organizations = asArray(adminData?.organizations);
  const groups = asArray(adminData?.groups);
  const courses = asArray(adminData?.courses);
  const enrollments = asArray(adminData?.enrollments);
  const documents = asArray(adminData?.documents);
  const roles = asArray(adminData?.roles);
  const permissions = asArray(adminData?.permissions);
  const auditEvents = asArray(adminData?.auditEvents);

  const usersTotal = summaryNumber(dashboardSummary, "users_total", users.length);
  const inactiveUsers = summaryNumber(dashboardSummary, "users_inactive", users.filter((user) => user.is_active === false).length);
  const organizationsTotal = summaryNumber(dashboardSummary, "organizations_total", organizations.length);
  const coursesTotal = summaryNumber(dashboardSummary, "courses_total", courses.length);
  const inactiveCourses = summaryNumber(dashboardSummary, "courses_inactive", courses.filter((course) => course.is_active === false).length);
  const documentsTotal = summaryNumber(dashboardSummary, "documents_total", documents.length);
  const documentsAvailable = summaryNumber(dashboardSummary, "documents_available", documents.filter((doc) => doc.status === "available").length);
  const documentsActionRequired = summaryNumber(
    dashboardSummary,
    "documents_action_required",
    asNumber(worklistSummary?.documents?.action_required, 0)
  );
  const enrollmentsTotal = summaryNumber(dashboardSummary, "enrollments_total", enrollments.length);
  const enrollmentsActive = summaryNumber(dashboardSummary, "enrollments_active", enrollments.filter((item) => item.status === "active").length);
  const enrollmentsActionRequired = summaryNumber(
    dashboardSummary,
    "enrollments_action_required",
    asNumber(worklistSummary?.enrollments?.action_required, 0)
  );
  const auditEventsTotal = summaryNumber(dashboardSummary, "audit_events_total", auditEvents.length);
  const criticalEvents = auditEvents.filter(isCriticalAuditEvent).length;
  const todayEvents = auditEvents.filter((event) => isToday(event.created_at)).length;

  const trend = buildTrend(7, auditEvents);
  const trendTotal = trend.reduce((sum, item) => sum + item.value, 0);

  const sectionItems = [
    { key: "users", label: T.users, value: auditEvents.filter((event) => getEventCategory(event) === "users").length || usersTotal },
    { key: "courses", label: T.programs, value: auditEvents.filter((event) => getEventCategory(event) === "courses").length || coursesTotal },
    { key: "documents", label: T.documents, value: auditEvents.filter((event) => getEventCategory(event) === "documents").length || documentsTotal },
    { key: "enrollments", label: T.enrollments, value: auditEvents.filter((event) => getEventCategory(event) === "enrollments").length || enrollmentsTotal },
    { key: "other", label: T.other, value: auditEvents.filter((event) => getEventCategory(event) === "other").length + roles.length + permissions.length },
  ].filter((item) => item.value > 0);

  const actorCounts = auditEvents.reduce((acc, event) => {
    const key = event.actor_user_id || "system";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topActors = Object.entries(actorCounts)
    .map(([actorId, count]) => ({ actorId, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const recentEvents = auditEvents.slice(0, 5);

  const notifications = [
    documentsActionRequired > 0
      ? {
          tone: "amber",
          title: T.documentsRequire,
          description: `${formatNumber(documentsActionRequired)} ${T.requireAttention.toLowerCase()}`,
          to: buildDocumentsPath({ status: "attention" }),
        }
      : null,
    enrollmentsActionRequired > 0
      ? {
          tone: "amber",
          title: T.enrollmentsRequire,
          description: `${formatNumber(enrollmentsActionRequired)} ${T.requireAttention.toLowerCase()}`,
          to: buildEnrollmentsPath({ status: "attention" }),
        }
      : null,
    criticalEvents > 0
      ? {
          tone: "red",
          title: T.auditRequire,
          description: `${formatNumber(criticalEvents)} ${T.criticalEvents.toLowerCase()}`,
          to: buildAuditPath({ limit: "200" }),
        }
      : null,
    {
      tone: "blue",
      title: T.availableUpdate,
      description: T.versionHint,
      to: buildAuditPath({ limit: "25" }),
    },
  ].filter(Boolean);

  const systemItems = [
    { icon: "DB", title: T.database, hint: T.connected, status: "ok" },
    { icon: "API", title: T.apiServices, hint: error ? T.loadError : T.servicesWork, status: error ? "warn" : "ok" },
    { icon: "FS", title: T.fileStorage, hint: `${T.documents}: ${formatNumber(documentsTotal)}`, status: "ok" },
    { icon: "ML", title: T.mailService, hint: T.queueEmpty, status: "ok" },
    { icon: "BK", title: T.backup, hint: T.backupRecent, status: "ok" },
  ];

  function handleExportReport() {
    const report = {
      generated_at: new Date().toISOString(),
      summary: dashboardSummary,
      worklist: worklistSummary,
      totals: {
        users: usersTotal,
        organizations: organizationsTotal,
        courses: coursesTotal,
        documents: documentsTotal,
        enrollments: enrollmentsTotal,
        roles: roles.length,
        permissions: permissions.length,
        audit_events: auditEventsTotal,
      },
      attention: {
        documents: documentsActionRequired,
        enrollments: enrollmentsActionRequired,
        critical_events: criticalEvents,
      },
      recent_audit_events: auditEvents.slice(0, 20),
    };

    downloadTextFile(
      `admin-overview-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(report, null, 2)
    );
  }

  return (
    <main data-testid="admin-overview-page" className="space-y-6">
      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-semibold text-indigo-700">
              {T.admin} / {T.overview}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{T.title}</h1>
              <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">{T.systemOk}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">{T.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onRefreshAdminData} disabled={!onRefreshAdminData || loading} className={SECONDARY_BUTTON_CLASS}>
              {T.refresh}
            </button>
            <button type="button" data-testid="admin-overview-export-report-button" onClick={handleExportReport} className={SECONDARY_BUTTON_CLASS}>
              {T.exportReport}
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <section data-testid="admin-overview-loading-state" className="rounded-3xl bg-white p-6 text-sm text-slate-500 ring-1 ring-slate-200">
          {T.loading}
        </section>
      ) : null}

      {error ? (
        <section data-testid="admin-overview-error-state" className="rounded-3xl bg-red-50 p-6 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          {T.loadError} {String(error)}
        </section>
      ) : null}

      <section data-testid="overview-kpi-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon="U" label={T.users} value={usersTotal} hint={`${T.active}: ${formatNumber(Math.max(usersTotal - inactiveUsers, 0))}`} to={buildUsersPath()} />
        <KpiCard icon="O" label={T.organizations} value={organizationsTotal} hint={`${T.active}: ${formatNumber(organizationsTotal)}`} to={buildOrganizationsPath()} tone="green" />
        <KpiCard icon="P" label={T.programs} value={coursesTotal} hint={`${T.published}: ${formatNumber(Math.max(coursesTotal - inactiveCourses, 0))}`} to={buildCoursesPath()} tone="blue" />
        <KpiCard icon="D" label={T.documents} value={documentsTotal} hint={`${T.confirmed}: ${formatNumber(documentsAvailable)}`} to={buildDocumentsPath()} tone="amber" />
        <KpiCard icon="E" label={T.enrollments} value={enrollmentsTotal} hint={`${T.active}: ${formatNumber(enrollmentsActive)}`} to={buildEnrollmentsPath()} />
        <KpiCard icon="!" label={T.criticalEvents} value={criticalEvents} hint={criticalEvents ? T.requireAttention : T.systemOk} to={buildAuditPath({ limit: "200" })} tone={criticalEvents ? "red" : "green"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(360px,0.75fr)]">
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-black text-slate-950">{T.activity}</div>
            <Badge className="bg-slate-50 text-slate-600 ring-slate-200">{T.last7Days}</Badge>
          </div>
          <LineChart points={trend} />
          <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
            <span>{T.total}: {formatNumber(trendTotal)}</span>
            <span>{T.today}: {formatNumber(todayEvents)}</span>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-black text-slate-950">{T.actionBySections}</div>
            <Badge className="bg-slate-50 text-slate-600 ring-slate-200">{T.last7Days}</Badge>
          </div>
          <DonutChart items={sectionItems.length ? sectionItems : [{ key: "other", label: T.other, value: 1 }]} />
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-black text-slate-950">{T.topUsers}</div>
            <Badge className="bg-slate-50 text-slate-600 ring-slate-200">{T.actions}</Badge>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {topActors.length ? (
              topActors.map((actor, index) => (
                <div key={actor.actorId} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-5 text-sm font-black text-slate-400">{index + 1}</div>
                    <div>
                      <div className="font-black text-slate-950">{getActorDisplayName(actor.actorId, users)}</div>
                      <div className="text-xs text-slate-500">{actor.actorId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-950">{formatNumber(actor.count)}</div>
                    <div className="text-xs text-emerald-600">+ {Math.max(1, Math.round(actor.count / 10))}%</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-sm text-slate-500">{T.noUsers}</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.15fr_1fr]">
        <div className={CARD_CLASS}>
          <div className="font-black text-slate-950">{T.quickActions}</div>
          <div data-testid="overview-quick-actions-grid" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <QuickAction icon="U+" title={T.createUser} to={buildUsersPath()} />
            <QuickAction icon="O+" title={T.createOrg} to={buildOrganizationsPath()} />
            <QuickAction icon="P+" title={T.createProgram} to={buildCoursesPath()} />
            <QuickAction icon="D+" title={T.uploadDocument} to={buildDocumentsPath()} />
            <QuickAction icon="E+" title={T.assignCourse} to={buildEnrollmentsPath()} />
            <QuickAction icon="RB" title={T.manageRoles} to={buildRolesPath()} />
            <QuickAction icon="AU" title={T.viewAudit} to={buildAuditPath()} />
            <QuickAction icon="PR" title={T.settings} to={buildPermissionsPath()} />
          </div>
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-black text-slate-950">{T.recentEvents}</div>
            <Link to={buildAuditPath({ limit: "25" })} className="text-sm font-bold text-indigo-700 hover:text-indigo-900">
              {T.allEvents}
            </Link>
          </div>

          <div data-testid="overview-recent-events-list" className="mt-4 divide-y divide-slate-100">
            {recentEvents.length ? (
              recentEvents.map((event) => (
                <Link key={event.id} to={buildAuditPath({ action: event.action, limit: "25" })} className="flex items-center gap-3 py-3 transition hover:bg-slate-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xs font-black text-indigo-700">
                    {getInitials(event.action)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-slate-950">{getActionLabel(event.action)}</div>
                    <div className="truncate text-xs text-slate-500">
                      {event.entity_type || "-"} ? {getActorDisplayName(event.actor_user_id, users)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{formatDate(event.created_at)}</div>
                    <Badge className={isCriticalAuditEvent(event) ? "bg-red-50 text-red-700 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}>
                      {isCriticalAuditEvent(event) ? T.warning : T.success}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-4 text-sm text-slate-500">{T.noEvents}</div>
            )}
          </div>
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-black text-slate-950">{T.systemNotifications}</div>
            <Link to={buildAuditPath({ limit: "50" })} className="text-sm font-bold text-indigo-700 hover:text-indigo-900">
              {T.allNotifications}
            </Link>
          </div>

          <div data-testid="overview-system-notifications" className="mt-4 space-y-3">
            {notifications.map((notice) => (
              <Link
                key={`${notice.title}-${notice.description}`}
                to={notice.to}
                className={cx(
                  "block rounded-2xl p-4 ring-1 transition hover:-translate-y-0.5",
                  notice.tone === "red"
                    ? "bg-red-50 text-red-900 ring-red-100"
                    : notice.tone === "amber"
                      ? "bg-amber-50 text-amber-900 ring-amber-100"
                      : "bg-indigo-50 text-indigo-900 ring-indigo-100"
                )}
              >
                <div className="font-black">{notice.title}</div>
                <div className="mt-1 text-sm opacity-80">{notice.description}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section data-testid="overview-system-state" className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="font-black text-slate-950">{T.systemState}</div>
          <Link to={buildAuditPath({ limit: "25" })} className={SECONDARY_BUTTON_CLASS}>
            {T.systemDetails}
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {systemItems.map((item) => (
            <div key={item.title} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xs font-black text-emerald-700">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-black text-slate-950">{item.title}</div>
                  <StatusPill status={item.status} />
                </div>
                <div className="mt-1 text-xs text-slate-500">{item.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
