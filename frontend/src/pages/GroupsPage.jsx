import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  addOrgLearningGroupMember,
  createOrgGroupEnrollments,
  createOrgLearningGroup,
  deleteOrgGroupEnrollment,
  deleteOrgLearningGroup,
  getAdminCourses,
  getAdminOrganizations,
  getAdminUsers,
  getOrgGroupEnrollments,
  getOrgLearningGroupMembers,
  getOrgLearningGroups,
  removeOrgLearningGroupMember,
  searchOrgUsers,
  updateOrgLearningGroup,
} from "../api/client";
import {
  buildAuditPath,
  buildDocumentsPath,
  buildEnrollmentsPath,
  buildGroupsPath,
  buildOrganizationsPath,
  buildUsersPath,
} from "../utils/adminLinks";

const T = {
  pageTitle: "\u0413\u0440\u0443\u043f\u043f\u044b",
  pageSubtitle: "\u0423\u0447\u0435\u0431\u043d\u044b\u0435, \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0435 \u0438 \u0441\u043b\u0443\u0436\u0435\u0431\u043d\u044b\u0435 \u0433\u0440\u0443\u043f\u043f\u044b \u043f\u043e\u0440\u0442\u0430\u043b\u0430.",
  systemOk: "\u0421\u0438\u0441\u0442\u0435\u043c\u0430 OK",
  importGroups: "\u0418\u043c\u043f\u043e\u0440\u0442 \u0433\u0440\u0443\u043f\u043f",
  exportCsv: "\u042d\u043a\u0441\u043f\u043e\u0440\u0442 CSV",
  createGroup: "+ \u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u0443",
  hideForm: "\u0421\u043a\u0440\u044b\u0442\u044c \u0444\u043e\u0440\u043c\u0443",
  searchPlaceholder: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435, \u043a\u043e\u0434, \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u0438\u043b\u0438 \u043a\u0443\u0440\u0430\u0442\u043e\u0440",
  allTypes: "\u0412\u0441\u0435 \u0442\u0438\u043f\u044b",
  allStatuses: "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b",
  allOrganizations: "\u0412\u0441\u0435 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438",
  reset: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c",
  all: "\u0412\u0441\u0435",
  active: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
  learning: "\u0423\u0447\u0435\u0431\u043d\u044b\u0435",
  service: "\u0421\u043b\u0443\u0436\u0435\u0431\u043d\u044b\u0435",
  work: "\u0420\u0430\u0431\u043e\u0447\u0438\u0435",
  withoutCurator: "\u0411\u0435\u0437 \u043a\u0443\u0440\u0430\u0442\u043e\u0440\u0430",
  filtersEmpty: "\u0424\u0438\u043b\u044c\u0442\u0440\u044b \u0433\u0440\u0443\u043f\u043f \u043d\u0435 \u043f\u0440\u0438\u043c\u0435\u043d\u0435\u043d\u044b.",
  shownPrefix: "\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e",
  groups: "\u0433\u0440\u0443\u043f\u043f",
  group: "\u0413\u0440\u0443\u043f\u043f\u0430",
  type: "\u0422\u0438\u043f",
  organization: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f",
  members: "\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438",
  assignments: "\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f",
  status: "\u0421\u0442\u0430\u0442\u0443\u0441",
  updated: "\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e",
  actions: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f",
  open: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c",
  edit: "\u0420\u0435\u0434\u0430\u043a\u0442.",
  deactivate: "\u0414\u0435\u0430\u043a\u0442.",
  activate: "\u0410\u043a\u0442.",
  users: "\u041f\u043e\u043b\u044c\u0437.",
  documents: "\u0414\u043e\u043a.",
  close: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
  more: "\u0415\u0449\u0451",
  attention: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f",
  noDescription: "\u041d\u0435\u0442 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f \u0433\u0440\u0443\u043f\u043f\u044b",
  noCurator: "\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d \u0440\u0435\u0437\u0435\u0440\u0432\u043d\u044b\u0439 \u043a\u0443\u0440\u0430\u0442\u043e\u0440",
  profile: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0433\u0440\u0443\u043f\u043f\u044b",
  profileHint: "\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u0433\u0440\u0443\u043f\u043f\u044b, \u043a\u043e\u0434, \u0442\u0438\u043f \u0438 \u043f\u0440\u0438\u0432\u044f\u0437\u043a\u0430.",
  roles: "\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438 \u0438 \u0440\u043e\u043b\u0438",
  rolesHint: "\u0421\u043e\u0441\u0442\u0430\u0432 \u0433\u0440\u0443\u043f\u043f\u044b \u0438 \u0440\u043e\u043b\u0438 \u0432 \u043e\u0431\u043b\u0430\u0441\u0442\u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u0430.",
  addMember: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430",
  addMemberHint: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0434\u043e\u043b\u0436\u0435\u043d \u0438\u043c\u0435\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438.",
  add: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
  assignCourse: "\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u043a\u0443\u0440\u0441",
  assignCourseHint: "\u0421\u043e\u0437\u0434\u0430\u0451\u0442 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0432\u0441\u0435\u043c \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u043c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430\u043c \u0433\u0440\u0443\u043f\u043f\u044b.",
  assign: "\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c",
  related: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0438 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f",
  relatedHint: "\u0411\u044b\u0441\u0442\u0440\u044b\u0435 \u043f\u0435\u0440\u0435\u0445\u043e\u0434\u044b \u0432 \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0435 \u0440\u0430\u0437\u0434\u0435\u043b\u044b.",
  context: "\u0421\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0435 \u0440\u0430\u0437\u0434\u0435\u043b\u044b",
  activity: "\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
  audit: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0430\u0443\u0434\u0438\u0442",
  name: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435",
  code: "\u041a\u043e\u0434",
  description: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
  visibility: "\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c",
  curator: "\u041a\u0443\u0440\u0430\u0442\u043e\u0440",
  internal: "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u044f\u044f",
  created: "\u0421\u043e\u0437\u0434\u0430\u043d\u0430",
  noData: "-",
  save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  cancel: "\u041e\u0442\u043c\u0435\u043d\u0430",
  delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
  chooseOrganization: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e",
  chooseUser: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f",
  chooseCourse: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u0443\u0440\u0441",
  empty: "\u0413\u0440\u0443\u043f\u043f\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0433\u0440\u0443\u043f\u043f\u044b...",
  error: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u044b.",
  ok: "OK",
  activeStatus: "\u0410\u043a\u0442\u0438\u0432\u043d\u0430",
  draftStatus: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
  assigned: "\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d",
  completed: "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d",
  confirmDelete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u0443? \u042d\u0442\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435\u043b\u044c\u0437\u044f \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c.",
  confirmRemoveMember: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430 \u0438\u0437 \u0433\u0440\u0443\u043f\u043f\u044b?",
};

const BUTTON_LIGHT =
  "inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_BLUE =
  "inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const ICON_BUTTON =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const CARD_CLASS = "rounded-2xl bg-white p-4 ring-1 ring-slate-200";
const FIELD_CLASS = "rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100";

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  return [];
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getGroupKind(group) {
  const text = normalize([group?.name, group?.code, group?.description].filter(Boolean).join(" "));

  if (text.includes("\u0441\u043e\u0432\u0435\u0442") || text.includes("\u043a\u0443\u0440\u0430\u0442\u043e\u0440") || text.includes("\u0430\u0434\u043c\u0438\u043d") || text.includes("\u0441\u043b\u0443\u0436")) {
    return "service";
  }

  if (text.includes("\u043c\u0435\u0442\u043e\u0434") || text.includes("\u0440\u0430\u0431\u043e\u0447") || text.includes("\u043f\u0440\u043e\u0435\u043a\u0442")) {
    return "work";
  }

  return "learning";
}

function getKindLabel(kind) {
  if (kind === "service") return T.service.slice(0, -2) + "\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430";
  if (kind === "work") return T.work.slice(0, -2) + "\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430";
  return "\u0423\u0447\u0435\u0431\u043d\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430";
}

function formatDate(value) {
  if (!value) {
    return T.noData;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return T.noData;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildCsvValue(value) {
  const prepared = String(value ?? "").replaceAll('"', '""');
  return `"${prepared}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(buildCsvValue).join(";")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function initials(name, fallback = "GR") {
  const source = String(name || fallback).trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function getOrganizationName(organizationsById, organizationId) {
  return organizationsById[organizationId]?.name || T.noData;
}

function hasCurator(members = []) {
  return members.some((member) => {
    const roleText = normalize([
      member.role_code,
      member.role_name,
      member.scope_role_code,
      member.scope_role_name,
      member.user_full_name,
      member.user_email,
    ].filter(Boolean).join(" "));

    return (
      roleText.includes("teacher") ||
      roleText.includes("admin") ||
      roleText.includes("operator") ||
      roleText.includes("curator") ||
      roleText.includes("\u043a\u0443\u0440\u0430\u0442\u043e\u0440") ||
      roleText.includes("\u043f\u0440\u0435\u043f\u043e\u0434\u0430\u0432")
    );
  });
}

function getAttentionItems(group, members = [], enrollments = []) {
  const items = [];

  if (!String(group?.description || "").trim()) {
    items.push(T.noDescription);
  }

  if (!hasCurator(members)) {
    items.push(T.noCurator);
  }

  if (!group?.is_active) {
    items.push("\u0413\u0440\u0443\u043f\u043f\u0430 \u043d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u0430, \u043d\u043e \u043c\u043e\u0436\u0435\u0442 \u0438\u043c\u0435\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0439.");
  }

  if (!members.length && !enrollments.length) {
    items.push("\u0412 \u0433\u0440\u0443\u043f\u043f\u0435 \u043d\u0435\u0442 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432 \u0438 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0439.");
  }

  return items;
}

function StatusPill({ tone = "slate", children }) {
  const classes = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    red: "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-black ring-1 ${classes[tone] || classes.slate}`}>
      {children}
    </span>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className={FIELD_CLASS}>
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 break-words text-sm font-black text-slate-950">{value || T.noData}</div>
    </div>
  );
}

function GroupCard({ title, hint, count, testId, children }) {
  return (
    <section data-testid={testId} className={CARD_CLASS}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
        </div>
        {count !== undefined ? (
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-50 px-2 text-xs font-black text-slate-600 ring-1 ring-slate-200">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function RowLink({ to, children }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
    >
      <span>{children}</span>
      <span aria-hidden="true">{"\u203a"}</span>
    </Link>
  );
}

function GroupDetailDashboard({
  group,
  organization,
  members,
  enrollments,
  users,
  courses,
  busy,
  onClose,
  onToggleActive,
  onDelete,
  onUpdate,
  onAddMember,
  onRemoveMember,
  onAssignCourse,
  onDeleteEnrollment,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: group.name || "",
    code: group.code || "",
    description: group.description || "",
  });
  const [memberUserId, setMemberUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState("assigned");

  useEffect(() => {
    setEditForm({
      name: group.name || "",
      code: group.code || "",
      description: group.description || "",
    });
  }, [group.id, group.name, group.code, group.description]);

  const kind = getGroupKind(group);
  const attentionItems = getAttentionItems(group, members, enrollments);
  const availableUsers = users.filter((candidate) => {
    if (!candidate?.id || candidate.is_active === false) {
      return false;
    }

    return !members.some((member) => member.user_id === candidate.id);
  });
  const activeCourses = courses.filter((course) => course.is_active !== false);

  async function handleEditSubmit(event) {
    event.preventDefault();

    await onUpdate(group.id, {
      name: editForm.name,
      code: editForm.code || null,
      description: editForm.description || null,
    });

    setIsEditing(false);
  }

  async function handleAddMember(event) {
    event.preventDefault();

    if (!memberUserId) {
      return;
    }

    await onAddMember(group.id, memberUserId);
    setMemberUserId("");
  }

  async function handleAssignCourse(event) {
    event.preventDefault();

    if (!courseId) {
      return;
    }

    await onAssignCourse(group, {
      course_id: courseId,
      status: enrollmentStatus,
    });

    setCourseId("");
    setEnrollmentStatus("assigned");
  }

  return (
    <div data-testid="admin-group-detail-content" className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-black text-blue-700 ring-1 ring-blue-100">
            {initials(group.name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-slate-950">{group.name || T.noData}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {group.code || T.noData} <span className="mx-2 text-slate-300">{"\u2022"}</span> {organization?.name || T.noData}
            </p>
          </div>
        </div>

        <div data-testid="admin-group-detail-actions" className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setIsEditing((value) => !value)} disabled={busy} className={ICON_BUTTON}>
            <span className="mr-2">{"\u270e"}</span>{T.edit}
          </button>
          <button type="button" onClick={() => onToggleActive(group)} disabled={busy} className={ICON_BUTTON}>
            <span className="mr-2">{group.is_active ? "\u25cb" : "\u25cf"}</span>{group.is_active ? T.deactivate : T.activate}
          </button>
          <Link to={buildUsersPath({ learning_group_id: group.id })} className={ICON_BUTTON}>
            <span className="mr-2">{"\u2637"}</span>{T.users}
          </Link>
          <Link to={buildEnrollmentsPath({ learning_group_id: group.id })} className={ICON_BUTTON}>
            <span className="mr-2">{"\u25a4"}</span>{T.assignments}
          </Link>
          <Link to={buildDocumentsPath({ learning_group_id: group.id })} className={ICON_BUTTON}>
            <span className="mr-2">{"\u25a1"}</span>{T.documents}
          </Link>
          <button type="button" onClick={onClose} className={ICON_BUTTON}>
            <span className="mr-2">{"\u00d7"}</span>{T.close}
          </button>
          <button type="button" onClick={() => onDelete(group)} disabled={busy} className={ICON_BUTTON}>
            {"\u22ef"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill tone={group.is_active ? "green" : "amber"}>{group.is_active ? T.activeStatus : T.draftStatus}</StatusPill>
        <StatusPill tone={kind === "service" ? "violet" : kind === "work" ? "green" : "blue"}>{getKindLabel(kind)}</StatusPill>
        <StatusPill tone="blue">{members.length} {T.members.toLowerCase()}</StatusPill>
        <StatusPill tone="blue">{enrollments.length} {T.assignments.toLowerCase()}</StatusPill>
        {hasCurator(members) ? <StatusPill tone="green">{"\u0415\u0441\u0442\u044c \u043a\u0443\u0440\u0430\u0442\u043e\u0440"}</StatusPill> : null}
      </div>

      {attentionItems.length ? (
        <div
          data-testid="group-attention-diagnostics"
          className="mt-4 rounded-2xl bg-amber-50/80 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white font-black text-amber-700 ring-1 ring-amber-200">!</span>
            <span className="font-black">{T.attention}</span>
            {attentionItems.map((item) => (
              <span key={item} className="font-medium">
                <span className="mx-2 text-amber-500">{"\u2022"}</span>
                {item}
              </span>
            ))}
            <span className="ml-auto inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-black text-amber-700 ring-1 ring-amber-200">
              {attentionItems.length}
            </span>
          </div>
        </div>
      ) : null}

      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="mt-4 rounded-2xl bg-blue-50/50 p-4 ring-1 ring-blue-100">
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.name}</span>
              <input className={`${INPUT_CLASS} mt-2`} value={editForm.name} onChange={(event) => setEditForm((form) => ({ ...form, name: event.target.value }))} />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.code}</span>
              <input className={`${INPUT_CLASS} mt-2`} value={editForm.code} onChange={(event) => setEditForm((form) => ({ ...form, code: event.target.value }))} />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.description}</span>
              <input className={`${INPUT_CLASS} mt-2`} value={editForm.description} onChange={(event) => setEditForm((form) => ({ ...form, description: event.target.value }))} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={BUTTON_BLUE}>{T.save}</button>
            <button type="button" onClick={() => setIsEditing(false)} className={BUTTON_LIGHT}>{T.cancel}</button>
          </div>
        </form>
      ) : null}

      <div data-testid="group-dashboard-grid" className="mt-4 grid gap-4 xl:grid-cols-3">
        <GroupCard testId="group-profile-card" title={T.profile} hint={T.profileHint}>
          <div className="grid gap-3 md:grid-cols-2">
            <DetailTile label="ID" value={group.id} />
            <DetailTile label={T.name} value={group.name} />
            <DetailTile label={T.code} value={group.code} />
            <DetailTile label={T.type} value={getKindLabel(kind)} />
            <DetailTile label={T.organization} value={organization?.name} />
            <DetailTile label={T.visibility} value={T.internal} />
            <DetailTile label={T.created} value={formatDate(group.created_at)} />
            <DetailTile label={T.updated} value={formatDate(group.updated_at)} />
          </div>
        </GroupCard>

        <GroupCard testId="group-members-card" title={T.roles} hint={T.rolesHint} count={members.length}>
          <div className="space-y-2">
            {members.length ? members.slice(0, 6).map((member) => (
              <div key={member.id || member.user_id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-950">{member.user_full_name || member.user_email}</div>
                  <div className="truncate text-xs font-semibold text-slate-500">{member.user_email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveMember(group.id, member.user_id)}
                  disabled={busy}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-black text-red-600 ring-1 ring-red-100 hover:bg-red-50"
                  title={T.delete}
                >
                  {"\u00d7"}
                </button>
              </div>
            )) : (
              <div className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                {T.empty}
              </div>
            )}

            <Link to={buildUsersPath({ learning_group_id: group.id })} className="mt-3 inline-flex text-sm font-black text-blue-700 hover:text-blue-900">
              {T.users} <span className="ml-2">{"\u2192"}</span>
            </Link>
          </div>
        </GroupCard>

        <GroupCard testId="group-add-member-card" title={T.addMember} hint={T.addMemberHint}>
          <form onSubmit={handleAddMember} className="space-y-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.users}</span>
              <select className={`${INPUT_CLASS} mt-2`} value={memberUserId} onChange={(event) => setMemberUserId(event.target.value)}>
                <option value="">{T.chooseUser}</option>
                {availableUsers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name || candidate.email} / {candidate.email}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={busy || !memberUserId} className={BUTTON_BLUE}>{T.add}</button>
          </form>
        </GroupCard>

        <GroupCard testId="group-related-records-card" title={T.related} hint={T.relatedHint}>
          <div className="space-y-2">
            <RowLink to={buildDocumentsPath({ learning_group_id: group.id })}>{T.documents}</RowLink>
            <RowLink to={buildEnrollmentsPath({ learning_group_id: group.id })}>{T.assignments}</RowLink>
            <RowLink to={buildUsersPath({ learning_group_id: group.id })}>{T.members}</RowLink>
            <RowLink to={buildOrganizationsPath({ q: organization?.id || group.organization_id })}>{T.organization}</RowLink>
          </div>
        </GroupCard>

        <GroupCard testId="group-course-assignment-card" title={T.assignCourse} hint={T.assignCourseHint} count={enrollments.length}>
          <form onSubmit={handleAssignCourse} className="space-y-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.assignCourse}</span>
              <select className={`${INPUT_CLASS} mt-2`} value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                <option value="">{T.chooseCourse}</option>
                {activeCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title || course.name || course.slug}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.status}</span>
              <select className={`${INPUT_CLASS} mt-2`} value={enrollmentStatus} onChange={(event) => setEnrollmentStatus(event.target.value)}>
                <option value="assigned">{T.assigned}</option>
                <option value="active">{T.activeStatus}</option>
              </select>
            </label>
            <button type="submit" disabled={busy || !courseId} className={BUTTON_BLUE}>{T.assign}</button>
          </form>
        </GroupCard>

        <GroupCard testId="group-activity-card" title={T.activity}>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
              <div>
                <div className="font-black text-slate-900">{T.updated}</div>
                <div className="text-xs font-semibold text-slate-500">{formatDate(group.updated_at)}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
              <div>
                <div className="font-black text-slate-900">{T.created}</div>
                <div className="text-xs font-semibold text-slate-500">{formatDate(group.created_at)}</div>
              </div>
            </div>
            {enrollments.slice(0, 3).map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-slate-900">{enrollment.course_title || enrollment.course_id}</div>
                  <div className="truncate text-[11px] font-semibold text-slate-500">{enrollment.user_email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteEnrollment(group.id, enrollment.id)}
                  disabled={busy}
                  className="text-xs font-black text-red-600 hover:text-red-800"
                >
                  {"\u00d7"}
                </button>
              </div>
            ))}
            <Link to={buildAuditPath({ entity_type: "learning_group", entity_id: group.id })} className="inline-flex text-sm font-black text-blue-700 hover:text-blue-900">
              {T.audit} <span className="ml-2">{"\u2192"}</span>
            </Link>
          </div>
        </GroupCard>
      </div>
    </div>
  );
}

export function GroupsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const initialQuery = params.get("q") || "";
  const initialType = params.get("type") || "all";
  const initialStatus = params.get("status") || "all";
  const initialOrganizationId = params.get("organization_id") || "all";

  const [groups, setGroups] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [membersByGroupId, setMembersByGroupId] = useState({});
  const [enrollmentsByGroupId, setEnrollmentsByGroupId] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [organizationFilter, setOrganizationFilter] = useState(initialOrganizationId);
  const [expandedGroupId, setExpandedGroupId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    organization_id: "",
    name: "",
    code: "",
    description: "",
    is_active: true,
  });

  const organizationsById = useMemo(
    () => Object.fromEntries(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );

  const visibleGroups = useMemo(() => {
    const normalizedQuery = normalize(query);

    return groups
      .filter((group) => {
        if (!normalizedQuery) {
          return true;
        }

        const organizationName = getOrganizationName(organizationsById, group.organization_id);

        return normalize([group.name, group.code, group.description, organizationName].filter(Boolean).join(" ")).includes(normalizedQuery);
      })
      .filter((group) => typeFilter === "all" || getGroupKind(group) === typeFilter)
      .filter((group) => {
        if (statusFilter === "active") return group.is_active;
        if (statusFilter === "inactive") return !group.is_active;
        if (statusFilter === "without_curator") return !hasCurator(membersByGroupId[group.id] || []);
        return true;
      })
      .filter((group) => organizationFilter === "all" || group.organization_id === organizationFilter)
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "ru-RU"));
  }, [groups, organizationsById, query, typeFilter, statusFilter, organizationFilter, membersByGroupId]);

  const counts = useMemo(() => {
    return {
      all: groups.length,
      active: groups.filter((group) => group.is_active).length,
      learning: groups.filter((group) => getGroupKind(group) === "learning").length,
      service: groups.filter((group) => getGroupKind(group) === "service").length,
      work: groups.filter((group) => getGroupKind(group) === "work").length,
      withoutCurator: groups.filter((group) => !hasCurator(membersByGroupId[group.id] || [])).length,
    };
  }, [groups, membersByGroupId]);

  const activeFilters = [
    query ? `${T.searchPlaceholder}: ${query}` : "",
    typeFilter !== "all" ? `${T.type}: ${getKindLabel(typeFilter)}` : "",
    statusFilter !== "all" ? `${T.status}: ${statusFilter}` : "",
    organizationFilter !== "all" ? `${T.organization}: ${getOrganizationName(organizationsById, organizationFilter)}` : "",
  ].filter(Boolean);

  async function loadRelatedForGroups(nextGroups) {
    const nextMembers = {};
    const nextEnrollments = {};

    await Promise.all(
      nextGroups.map(async (group) => {
        try {
          nextMembers[group.id] = toArray(await getOrgLearningGroupMembers(group.id));
        } catch {
          nextMembers[group.id] = [];
        }

        try {
          nextEnrollments[group.id] = toArray(await getOrgGroupEnrollments(group.id));
        } catch {
          nextEnrollments[group.id] = [];
        }
      })
    );

    setMembersByGroupId(nextMembers);
    setEnrollmentsByGroupId(nextEnrollments);
  }

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const [groupsResponse, organizationsResponse, coursesResponse, usersResponse] = await Promise.all([
        getOrgLearningGroups(),
        getAdminOrganizations(),
        getAdminCourses({ limit: 300 }),
        getAdminUsers({ limit: 200 }),
      ]);

      const nextGroups = toArray(groupsResponse);
      setGroups(nextGroups);
      setOrganizations(toArray(organizationsResponse));
      setCourses(toArray(coursesResponse));
      setUsers(toArray(usersResponse));

      await loadRelatedForGroups(nextGroups);
    } catch (err) {
      setError(getErrorMessage(err, T.error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  function updateUrl(next = {}) {
    const path = buildGroupsPath({
      q: next.query ?? query,
      type: next.typeFilter ?? typeFilter,
      status: next.statusFilter ?? statusFilter,
      organization_id: next.organizationFilter ?? organizationFilter,
    });

    navigate(path, { replace: true });
  }

  function handleQueryChange(value) {
    setQuery(value);
    updateUrl({ query: value });
  }

  function handleTypeChange(value) {
    setTypeFilter(value);
    updateUrl({ typeFilter: value });
  }

  function handleStatusChange(value) {
    setStatusFilter(value);
    updateUrl({ statusFilter: value });
  }

  function handleOrganizationChange(value) {
    setOrganizationFilter(value);
    updateUrl({ organizationFilter: value });
  }

  function handleResetFilters() {
    setQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setOrganizationFilter("all");
    navigate(buildGroupsPath(), { replace: true });
  }

  function handleExportCsv() {
    const rows = [
      [T.name, T.code, T.type, T.organization, T.members, T.assignments, T.status, T.updated],
      ...visibleGroups.map((group) => [
        group.name || "",
        group.code || "",
        getKindLabel(getGroupKind(group)),
        getOrganizationName(organizationsById, group.organization_id),
        (membersByGroupId[group.id] || []).length,
        (enrollmentsByGroupId[group.id] || []).length,
        group.is_active ? T.activeStatus : T.draftStatus,
        formatDate(group.updated_at),
      ]),
    ];

    downloadCsv(`obrportal-groups-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  async function refreshGroup(groupId) {
    try {
      const [membersResponse, enrollmentsResponse] = await Promise.all([
        getOrgLearningGroupMembers(groupId),
        getOrgGroupEnrollments(groupId),
      ]);

      setMembersByGroupId((current) => ({ ...current, [groupId]: toArray(membersResponse) }));
      setEnrollmentsByGroupId((current) => ({ ...current, [groupId]: toArray(enrollmentsResponse) }));
    } catch {
      /* ignore refresh detail errors */
    }
  }

  async function handleCreateGroup(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      const created = await createOrgLearningGroup({
        organization_id: createForm.organization_id,
        name: createForm.name,
        code: createForm.code || null,
        description: createForm.description || null,
        is_active: createForm.is_active,
      });

      setGroups((current) => [...current, created]);
      setCreateForm({
        organization_id: "",
        name: "",
        code: "",
        description: "",
        is_active: true,
      });
      setIsCreating(false);
      setExpandedGroupId(created.id);
      await refreshGroup(created.id);
      setSuccessMessage("\u0413\u0440\u0443\u043f\u043f\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430.");
    } catch (err) {
      setError(getErrorMessage(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u0443."));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateGroup(groupId, payload) {
    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      const updated = await updateOrgLearningGroup(groupId, payload);
      setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, ...updated } : group)));
      setSuccessMessage("\u0413\u0440\u0443\u043f\u043f\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0430.");
    } catch (err) {
      setError(getErrorMessage(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u0443."));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(group) {
    await handleUpdateGroup(group.id, { is_active: !group.is_active });
  }

  async function handleDeleteGroup(group) {
    if (!window.confirm(T.confirmDelete)) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      await deleteOrgLearningGroup(group.id);
      setGroups((current) => current.filter((item) => item.id !== group.id));
      setExpandedGroupId("");
      setSuccessMessage("\u0413\u0440\u0443\u043f\u043f\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0430.");
    } catch (err) {
      setError(getErrorMessage(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u0443."));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddMember(groupId, userId) {
    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      await addOrgLearningGroupMember(groupId, { user_id: userId });
      await refreshGroup(groupId);
      setSuccessMessage("\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d.");
    } catch (err) {
      setError(getErrorMessage(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(groupId, userId) {
    if (!window.confirm(T.confirmRemoveMember)) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      await removeOrgLearningGroupMember(groupId, userId);
      await refreshGroup(groupId);
      setSuccessMessage("\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a \u0443\u0434\u0430\u043b\u0451\u043d \u0438\u0437 \u0433\u0440\u0443\u043f\u043f\u044b.");
    } catch (err) {
      setError(getErrorMessage(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430."));
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignCourse(group, payload) {
    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await createOrgGroupEnrollments({
        learning_group_id: group.id,
        course_id: payload.course_id,
        status: payload.status || "assigned",
      });

      await refreshGroup(group.id);
      setSuccessMessage(
        `\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0439 \u0441\u043e\u0437\u0434\u0430\u043d\u043e: ${result.created_count ?? 0}, \u043f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u043e: ${result.skipped_count ?? 0}.`
      );
    } catch (err) {
      setError(getErrorMessage(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u043a\u0443\u0440\u0441 \u043d\u0430 \u0433\u0440\u0443\u043f\u043f\u0443."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteEnrollment(groupId, enrollmentId) {
    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      await deleteOrgGroupEnrollment(groupId, enrollmentId);
      await refreshGroup(groupId);
      setSuccessMessage("\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0443\u0434\u0430\u043b\u0435\u043d\u043e.");
    } catch (err) {
      setError(getErrorMessage(err, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435."));
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenGroup(groupId) {
    setExpandedGroupId((current) => (current === groupId ? "" : groupId));

    if (!membersByGroupId[groupId] || !enrollmentsByGroupId[groupId]) {
      await refreshGroup(groupId);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{T.pageTitle}</h1>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {T.systemOk}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-500">{T.pageSubtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={BUTTON_LIGHT} disabled>{T.importGroups}</button>
            <button type="button" onClick={handleExportCsv} disabled={!visibleGroups.length} className={BUTTON_LIGHT}>{T.exportCsv}</button>
            <button type="button" onClick={() => setIsCreating((value) => !value)} className={BUTTON_BLUE}>
              {isCreating ? T.hideForm : T.createGroup}
            </button>
          </div>
        </div>

        {isCreating ? (
          <form onSubmit={handleCreateGroup} className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="grid gap-3 lg:grid-cols-5">
              <label className="block lg:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.name}</span>
                <input className={`${INPUT_CLASS} mt-2`} value={createForm.name} onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))} />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.code}</span>
                <input className={`${INPUT_CLASS} mt-2`} value={createForm.code} onChange={(event) => setCreateForm((form) => ({ ...form, code: event.target.value }))} />
              </label>
              <label className="block lg:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.organization}</span>
                <select className={`${INPUT_CLASS} mt-2`} value={createForm.organization_id} onChange={(event) => setCreateForm((form) => ({ ...form, organization_id: event.target.value }))}>
                  <option value="">{T.chooseOrganization}</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block lg:col-span-4">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.description}</span>
                <input className={`${INPUT_CLASS} mt-2`} value={createForm.description} onChange={(event) => setCreateForm((form) => ({ ...form, description: event.target.value }))} />
              </label>
              <div className="flex items-end">
                <button type="submit" disabled={busy || !createForm.name || !createForm.organization_id} className={BUTTON_BLUE}>
                  {T.createGroup}
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_240px_240px_260px_150px]">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{"\u041f\u043e\u0438\u0441\u043a"}</span>
            <input className={`${INPUT_CLASS} mt-2`} placeholder={T.searchPlaceholder} value={query} onChange={(event) => handleQueryChange(event.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.type}</span>
            <select className={`${INPUT_CLASS} mt-2`} value={typeFilter} onChange={(event) => handleTypeChange(event.target.value)}>
              <option value="all">{T.allTypes}</option>
              <option value="learning">{T.learning}</option>
              <option value="service">{T.service}</option>
              <option value="work">{T.work}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.status}</span>
            <select className={`${INPUT_CLASS} mt-2`} value={statusFilter} onChange={(event) => handleStatusChange(event.target.value)}>
              <option value="all">{T.allStatuses}</option>
              <option value="active">{T.active}</option>
              <option value="inactive">{T.draftStatus}</option>
              <option value="without_curator">{T.withoutCurator}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{T.organization}</span>
            <select className={`${INPUT_CLASS} mt-2`} value={organizationFilter} onChange={(event) => handleOrganizationChange(event.target.value)}>
              <option value="all">{T.allOrganizations}</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" onClick={handleResetFilters} className={BUTTON_LIGHT}>{T.reset}</button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["all", T.all, counts.all],
          ["active", T.active, counts.active],
          ["learning", T.learning, counts.learning],
          ["service", T.service, counts.service],
          ["without_curator", T.withoutCurator, counts.withoutCurator],
        ].map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === "learning" || key === "service" || key === "work") {
                handleTypeChange(key);
              } else if (key === "all") {
                handleResetFilters();
              } else {
                handleStatusChange(key === "without_curator" ? "without_curator" : "active");
              }
            }}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-black ring-1 transition ${
              (key === "all" && typeFilter === "all" && statusFilter === "all") || typeFilter === key || statusFilter === key
                ? "bg-slate-950 text-white ring-slate-950"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{count}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
        {activeFilters.length ? activeFilters.join("  /  ") : T.filtersEmpty}
      </div>

      {error ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-500">
          <span>{T.shownPrefix} {visibleGroups.length} {T.groups}</span>
          <span>{"\u2022"}</span>
          <span>CSV: {visibleGroups.length} {"\u0441\u0442\u0440\u043e\u043a"}</span>
          <button type="button" onClick={handleExportCsv} disabled={!visibleGroups.length} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            {T.exportCsv}
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-sm font-bold text-slate-500">{T.loading}</div>
        ) : (
          <div className="overflow-x-auto">
            <table data-testid="admin-groups-table" className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  <th className="w-14 px-5 py-4"></th>
                  <th className="px-5 py-4">{T.group}</th>
                  <th className="px-5 py-4">{T.type}</th>
                  <th className="px-5 py-4">{T.organization}</th>
                  <th className="px-5 py-4">{T.members}</th>
                  <th className="px-5 py-4">{T.assignments}</th>
                  <th className="px-5 py-4">{T.status}</th>
                  <th className="px-5 py-4">{T.updated}</th>
                  <th className="px-5 py-4 text-right">{T.actions}</th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map((group) => {
                  const isOpen = expandedGroupId === group.id;
                  const members = membersByGroupId[group.id] || [];
                  const enrollments = enrollmentsByGroupId[group.id] || [];
                  const organization = organizationsById[group.organization_id];
                  const kind = getGroupKind(group);

                  return (
                    <Fragment key={`group-row-block-${group.id}`}>
                      <tr className={isOpen ? "bg-blue-50/30" : "bg-white"}>
                        <td className="border-t border-slate-100 px-5 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => handleOpenGroup(group.id)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ring-1 transition ${
                              isOpen ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-blue-700 ring-blue-100 hover:bg-blue-50"
                            }`}
                            aria-label={isOpen ? T.close : T.open}
                          >
                            {isOpen ? "-" : "\u203a"}
                          </button>
                        </td>
                        <td className="border-t border-slate-100 px-5 py-4 align-top">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                              {initials(group.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-950">{group.name || T.noData}</div>
                              <div className="truncate text-xs font-semibold text-slate-500">{group.code || T.noData}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border-t border-slate-100 px-5 py-4 align-top">
                          <StatusPill tone={kind === "service" ? "violet" : kind === "work" ? "green" : "blue"}>{getKindLabel(kind)}</StatusPill>
                        </td>
                        <td className="border-t border-slate-100 px-5 py-4 align-top text-sm font-bold text-slate-700">
                          {organization?.name || T.noData}
                        </td>
                        <td className="border-t border-slate-100 px-5 py-4 align-top text-sm font-black text-slate-800">{members.length}</td>
                        <td className="border-t border-slate-100 px-5 py-4 align-top text-sm font-black text-slate-800">{enrollments.length}</td>
                        <td className="border-t border-slate-100 px-5 py-4 align-top">
                          <StatusPill tone={group.is_active ? "green" : "amber"}>{group.is_active ? T.activeStatus : T.draftStatus}</StatusPill>
                        </td>
                        <td className="border-t border-slate-100 px-5 py-4 align-top text-sm font-semibold text-slate-600">
                          {formatDate(group.updated_at)}
                        </td>
                        <td className="border-t border-slate-100 px-5 py-4 align-top">
                          <div data-testid={`admin-group-row-actions-${group.id}`} className="flex justify-end gap-2 whitespace-nowrap">
                            <button type="button" onClick={() => handleOpenGroup(group.id)} className={isOpen ? BUTTON_BLUE : BUTTON_LIGHT}>
                              {isOpen ? T.close : T.open}
                            </button>
                            <Link to={buildUsersPath({ learning_group_id: group.id })} className={ICON_BUTTON}>{"\u2637"}</Link>
                            <button type="button" onClick={() => handleDeleteGroup(group)} disabled={busy} className={ICON_BUTTON}>{"\u22ef"}</button>
                          </div>
                        </td>
                      </tr>

                      {isOpen ? (
                        <tr key={`group-detail-${group.id}`} className="bg-slate-50/70">
                          <td colSpan={9} className="px-5 pb-5 pt-0">
                            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-blue-100">
                              <GroupDetailDashboard
                                group={group}
                                organization={organization}
                                members={members}
                                enrollments={enrollments}
                                users={users}
                                courses={courses}
                                busy={busy}
                                onClose={() => setExpandedGroupId("")}
                                onToggleActive={handleToggleActive}
                                onDelete={handleDeleteGroup}
                                onUpdate={handleUpdateGroup}
                                onAddMember={handleAddMember}
                                onRemoveMember={handleRemoveMember}
                                onAssignCourse={handleAssignCourse}
                                onDeleteEnrollment={handleDeleteEnrollment}
                              />
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}

                {!visibleGroups.length ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                      {T.empty}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
