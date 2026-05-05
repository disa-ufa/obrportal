import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  activateAdminCourse,
  createAdminCourse,
  deactivateAdminCourse,
  deleteAdminCourse,
  getAdminCourses,
  updateAdminCourse,
} from "../api/client";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminMetricCard } from "../components/admin/AdminWorkCenter";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";
import { ActionButton } from "../components/ui/ActionButton";
import { Alert } from "../components/ui/Alert";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { buildCoursesPath, buildEnrollmentsPath } from "../utils/adminLinks";
import { ADMIN_FILTER_CONTROL_SOFT_CLASS } from "../utils/adminClasses";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";

const RU = {
  all: "\u0412\u0441\u0435",
  activePlural: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
  inactivePlural: "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
  active: "\u0410\u043a\u0442\u0438\u0432\u043d\u0430",
  inactive: "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u0430",
  certificate: "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442",
  pageTitle: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
  pageSubtitle:
    "\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043a\u0443\u0440\u0441\u0430\u043c\u0438, \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c\u044e, \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u043c\u0438 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430\u043c\u0438 \u0438 \u043f\u0435\u0440\u0435\u0445\u043e\u0434\u043e\u043c \u043a \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f\u043c.",
  hideForm: "\u0421\u043a\u0440\u044b\u0442\u044c \u0444\u043e\u0440\u043c\u0443",
  addProgram: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443",
  totalPrograms: "\u0412\u0441\u0435\u0433\u043e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c",
  totalProgramsHint:
    "\u041f\u043e \u0442\u0435\u043a\u0443\u0449\u0435\u043c\u0443 \u043f\u043e\u0438\u0441\u043a\u0443 \u0431\u0435\u0437 \u0444\u0438\u043b\u044c\u0442\u0440\u0430 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u0438",
  activeHint:
    "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435 \u0438 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f\u0445",
  inactiveHint:
    "\u0421\u043a\u0440\u044b\u0442\u044b \u0438\u043b\u0438 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043e\u0442\u043a\u043b\u044e\u0447\u0435\u043d\u044b",
  newProgram: "\u041d\u043e\u0432\u0430\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430",
  newProgramSubtitle:
    "\u0421\u043e\u0437\u0434\u0430\u0451\u0442 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0432 Admin API.",
  createProgram: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443",
  creating: "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c...",
  clear: "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c",
  search: "\u041f\u043e\u0438\u0441\u043a",
  searchPlaceholder: "Slug, \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435, \u0444\u043e\u0440\u043c\u0430\u0442, \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
  status: "\u0421\u0442\u0430\u0442\u0443\u0441",
  allStatuses: "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b",
  apply: "\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c...",
  error: "\u041e\u0448\u0438\u0431\u043a\u0430",
  done: "\u0413\u043e\u0442\u043e\u0432\u043e",
  listTitle: "\u0421\u043f\u0438\u0441\u043e\u043a \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c",
  listSubtitle:
    "\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0438 \u0438\u0437 GET /api/v1/admin/courses \u0441 \u0431\u044b\u0441\u0442\u0440\u044b\u043c\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f\u043c\u0438.",
  loadingPrograms: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b...",
  programsNotFound: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b",
  filteredEmpty:
    "\u041f\u043e\u0434 \u0442\u0435\u043a\u0443\u0449\u0438\u0435 \u0444\u0438\u043b\u044c\u0442\u0440\u044b \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043d\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0442.",
  defaultEmpty:
    "\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u043f\u0435\u0440\u0432\u0443\u044e \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u0443\u044e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443.",
  title: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435",
  titlePlaceholder: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b",
  description: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
  descriptionPlaceholder:
    "\u041a\u0440\u0430\u0442\u043a\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0434\u043b\u044f \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430 \u0438 \u043b\u0438\u0447\u043d\u043e\u0433\u043e \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0430",
  hours: "\u041e\u0431\u044a\u0435\u043c, \u0447\u0430\u0441\u043e\u0432",
  format: "\u0424\u043e\u0440\u043c\u0430\u0442",
  formatPlaceholder: "online / mixed / \u043e\u0447\u043d\u043e-\u0437\u0430\u043e\u0447\u043d\u043e",
  documentType: "\u0418\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
  documentPlaceholder:
    "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442 / \u0423\u0434\u043e\u0441\u0442\u043e\u0432\u0435\u0440\u0435\u043d\u0438\u0435",
  volume: "\u041e\u0431\u044a\u0435\u043c",
  createdAt: "\u0421\u043e\u0437\u0434\u0430\u043d\u0430",
  updatedAt: "\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0430",
  publicCard: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430",
  courseEnrollments: "\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u043a\u0443\u0440\u0441\u0430",
  edit: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  running: "\u0412\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u043c...",
  deactivate: "\u0414\u0435\u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  activate: "\u0410\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
  save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  saving: "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c...",
  cancel: "\u041e\u0442\u043c\u0435\u043d\u0430",
  loadFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b.",
  enterSlug: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 slug \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b.",
  enterTitle: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b.",
  createdMessage: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430",
  createFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443.",
  updatedMessage: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0430",
  updateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443.",
  activatedMessage: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u0430",
  deactivatedMessage: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0434\u0435\u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u0430",
  statusChangeFailed:
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b.",
  deleteConfirmPrefix: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443",
  deleteConfirmSuffix: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435\u043b\u044c\u0437\u044f \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c.",
  deletedMessage: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0430",
  deleteFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443.",
};

const COURSE_ACTIVE_FILTERS = [
  { value: "", label: RU.all },
  { value: "true", label: RU.activePlural },
  { value: "false", label: RU.inactivePlural },
];

const EMPTY_COURSE_FORM = {
  slug: "",
  title: "",
  description: "",
  hours: "",
  format: "",
  document_type: RU.certificate,
  is_active: true,
};

const EMPTY_EDIT_FORM = {
  slug: "",
  title: "",
  description: "",
  hours: "",
  format: "",
  document_type: "",
  is_active: true,
};

const CARD_LINK_CLASS =
  "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100";

function normalizeHoursInput(value) {
  if (`${value}`.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function getCourseFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    is_active: params.get("is_active") || "",
  };
}

function calculateCourseCounts(items) {
  const counts = {
    all: Array.isArray(items) ? items.length : 0,
    active: 0,
    inactive: 0,
  };

  if (!Array.isArray(items)) {
    return counts;
  }

  items.forEach((course) => {
    if (course.is_active) {
      counts.active += 1;
    } else {
      counts.inactive += 1;
    }
  });

  return counts;
}

function buildEditForm(course) {
  return {
    slug: course.slug || "",
    title: course.title || "",
    description: course.description || "",
    hours: course.hours ?? "",
    format: course.format || "",
    document_type: course.document_type || "",
    is_active: Boolean(course.is_active),
  };
}

function getCourseStatusTone(course) {
  return course.is_active ? "green" : "gray";
}

function getCourseStatusLabel(course) {
  return course.is_active ? RU.active : RU.inactive;
}

function CourseFormFields({ values, onChange, prefix = "" }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Slug
        </span>
        <input
          type="text"
          value={values.slug}
          onChange={(event) => onChange("slug", event.target.value)}
          placeholder="povyshenie-kvalifikatsii"
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.title}
        </span>
        <input
          type="text"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder={RU.titlePlaceholder}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.description}
        </span>
        <textarea
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          rows={4}
          placeholder={RU.descriptionPlaceholder}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.hours}
        </span>
        <input
          type="number"
          min="1"
          max="10000"
          value={values.hours}
          onChange={(event) => onChange("hours", event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.format}
        </span>
        <input
          type="text"
          value={values.format}
          onChange={(event) => onChange("format", event.target.value)}
          placeholder={RU.formatPlaceholder}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.documentType}
        </span>
        <input
          type="text"
          value={values.document_type}
          onChange={(event) => onChange("document_type", event.target.value)}
          placeholder={RU.documentPlaceholder}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <input
          id={`${prefix}is-active`}
          type="checkbox"
          checked={values.is_active}
          onChange={(event) => onChange("is_active", event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="font-semibold">{RU.active}</span>
      </label>
    </div>
  );
}

function CourseCard({
  course,
  isEditing,
  isActionRunning,
  editForm,
  onEditFieldChange,
  onStartEdit,
  onEditSubmit,
  onCancelEdit,
  onToggleActive,
  onDelete,
}) {
  return (
    <article className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={getCourseStatusTone(course)}>
          {getCourseStatusLabel(course)}
        </StatusBadge>

        {course.format && (
          <StatusBadge tone="blue">
            {course.format}
          </StatusBadge>
        )}

        {course.document_type && (
          <StatusBadge tone="violet">
            {course.document_type}
          </StatusBadge>
        )}
      </div>

      {!isEditing ? (
        <>
          <div className="mt-4">
            <h2 className="text-xl font-bold text-slate-900">{course.title}</h2>
            <div className="mt-1 break-all text-sm text-slate-500">
              /courses/{course.slug}
            </div>

            {course.description && (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {course.description}
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {RU.volume}
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {course.hours ? `${course.hours} \u0447.` : "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {RU.createdAt}
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {formatDateTime(course.created_at)}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {RU.updatedAt}
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {formatDateTime(course.updated_at)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {course.slug && (
              <Link
                to={`/courses/${encodeURIComponent(course.slug)}`}
                className={CARD_LINK_CLASS}
              >
                {RU.publicCard}
              </Link>
            )}

            <Link
              to={buildEnrollmentsPath({ course_id: course.id })}
              className={CARD_LINK_CLASS}
            >
              {RU.courseEnrollments}
            </Link>

            <ActionButton
              type="button"
              tone="blue"
              onClick={() => onStartEdit(course)}
              disabled={isActionRunning}
            >
              {RU.edit}
            </ActionButton>

            <ActionButton
              type="button"
              tone="light"
              onClick={() => onToggleActive(course)}
              disabled={isActionRunning}
            >
              {isActionRunning
                ? RU.running
                : course.is_active
                  ? RU.deactivate
                  : RU.activate}
            </ActionButton>

            <ActionButton
              type="button"
              tone="red"
              onClick={() => onDelete(course)}
              disabled={isActionRunning}
            >
              {RU.delete}
            </ActionButton>
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => onEditSubmit(event, course.id)}
          className="mt-5 space-y-4 rounded-3xl bg-white p-5 ring-1 ring-blue-100"
        >
          <CourseFormFields
            values={editForm}
            onChange={onEditFieldChange}
            prefix="edit-"
          />

          <div className="flex flex-wrap gap-3">
            <ActionButton type="submit" tone="blue" disabled={isActionRunning}>
              {isActionRunning ? RU.saving : RU.save}
            </ActionButton>

            <ActionButton
              type="button"
              tone="light"
              onClick={onCancelEdit}
              disabled={isActionRunning}
            >
              {RU.cancel}
            </ActionButton>
          </div>
        </form>
      )}
    </article>
  );
}

export function AdminCoursesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getCourseFiltersFromSearch(location.search);

  const [courses, setCourses] = useState([]);
  const [courseCounts, setCourseCounts] = useState({
    all: 0,
    active: 0,
    inactive: 0,
  });
  const [filterQuery, setFilterQuery] = useState(initialFilters.q);
  const [filterActive, setFilterActive] = useState(initialFilters.is_active);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionCourseId, setActionCourseId] = useState("");
  const [editingCourseId, setEditingCourseId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState(EMPTY_COURSE_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  const hasActiveFilters = Boolean(filterQuery || filterActive);
  const activeCount = courseCounts.active || 0;
  const inactiveCount = courseCounts.inactive || 0;

  function buildFilters(overrides = {}) {
    return {
      q: overrides.q ?? filterQuery,
      is_active: overrides.is_active ?? filterActive,
    };
  }

  async function navigateToCourseFilters(filters, options = {}) {
    const nextPath = buildCoursesPath(filters);
    const currentPath = `${location.pathname}${location.search}`;

    if (currentPath === nextPath) {
      await loadData(filters);
      return;
    }

    navigate(nextPath, options);
  }

  async function loadData(filters = null) {
    try {
      setLoading(true);
      setError("");

      const activeFilters = { limit: 300, ...(filters ?? buildFilters()) };
      const countFilters = { ...activeFilters, is_active: "" };

      const [response, countResponse] = await Promise.all([
        getAdminCourses(activeFilters),
        getAdminCourses(countFilters),
      ]);

      setCourses(Array.isArray(response) ? response : []);
      setCourseCounts(calculateCourseCounts(Array.isArray(countResponse) ? countResponse : []));
    } catch (err) {
      setError(`${err.status || ""} ${err.message || RU.loadFailed}`.trim());
      setCourseCounts({ all: 0, active: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const nextFilters = getCourseFiltersFromSearch(location.search);

    setFilterQuery(nextFilters.q);
    setFilterActive(nextFilters.is_active);

    loadData(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(EMPTY_COURSE_FORM);
  }

  function resetEditState() {
    setEditingCourseId("");
    setEditForm(EMPTY_EDIT_FORM);
  }

  function buildPayload(values) {
    return {
      slug: values.slug.trim(),
      title: values.title.trim(),
      description: values.description.trim() || null,
      hours: normalizeHoursInput(values.hours),
      format: values.format.trim() || null,
      document_type: values.document_type.trim() || null,
      is_active: Boolean(values.is_active),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.slug.trim()) {
      setError(RU.enterSlug);
      return;
    }

    if (!form.title.trim()) {
      setError(RU.enterTitle);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const created = await createAdminCourse(buildPayload(form));

      setSuccessMessage(`${RU.createdMessage}: ${created.title}`);
      resetForm();
      setShowCreateForm(false);
      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || RU.createFailed}`.trim());
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit(course) {
    setError("");
    setSuccessMessage("");
    setEditingCourseId(course.id);
    setEditForm(buildEditForm(course));
  }

  async function handleEditSubmit(event, courseId) {
    event.preventDefault();

    if (!editForm.slug.trim()) {
      setError(RU.enterSlug);
      return;
    }

    if (!editForm.title.trim()) {
      setError(RU.enterTitle);
      return;
    }

    try {
      setActionCourseId(courseId);
      setError("");
      setSuccessMessage("");

      const updated = await updateAdminCourse(courseId, buildPayload(editForm));

      setSuccessMessage(`${RU.updatedMessage}: ${updated.title}`);
      resetEditState();
      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || RU.updateFailed}`.trim());
    } finally {
      setActionCourseId("");
    }
  }

  async function handleToggleActive(course) {
    try {
      setActionCourseId(course.id);
      setError("");
      setSuccessMessage("");

      const updated = course.is_active
        ? await deactivateAdminCourse(course.id)
        : await activateAdminCourse(course.id);

      setSuccessMessage(
        updated.is_active
          ? `${RU.activatedMessage}: ${updated.title}`
          : `${RU.deactivatedMessage}: ${updated.title}`
      );

      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || RU.statusChangeFailed}`.trim());
    } finally {
      setActionCourseId("");
    }
  }

  async function handleDelete(course) {
    const confirmed = window.confirm(
      `${RU.deleteConfirmPrefix} "${course.title}"? ${RU.deleteConfirmSuffix}`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionCourseId(course.id);
      setError("");
      setSuccessMessage("");

      await deleteAdminCourse(course.id);

      if (editingCourseId === course.id) {
        resetEditState();
      }

      setSuccessMessage(`${RU.deletedMessage}: ${course.title}`);
      await loadData(buildFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || RU.deleteFailed}`.trim());
    } finally {
      setActionCourseId("");
    }
  }

  async function handleApplyFilter(event) {
    event.preventDefault();
    await navigateToCourseFilters(buildFilters());
  }

  async function handleQuickActiveFilter(nextActive) {
    setFilterActive(nextActive);
    await navigateToCourseFilters(buildFilters({ is_active: nextActive }));
  }

  async function handleResetFilter() {
    setFilterQuery("");
    setFilterActive("");
    await navigateToCourseFilters({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={RU.pageTitle}
        subtitle={RU.pageSubtitle}
        action={
          <AdminPageActions
            loading={loading}
            onRefresh={() => loadData(buildFilters())}
            primaryLabel={showCreateForm ? RU.hideForm : RU.addProgram}
            primaryTone={showCreateForm ? "light" : "blue"}
            onPrimaryClick={() => setShowCreateForm((current) => !current)}
          />
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <AdminMetricCard
              title={RU.totalPrograms}
              value={courseCounts.all || 0}
              hint={RU.totalProgramsHint}
              to={buildCoursesPath()}
              tone="blue"
            />
            <AdminMetricCard
              title={RU.activePlural}
              value={activeCount}
              hint={RU.activeHint}
              to={buildCoursesPath({ is_active: "true" })}
              tone="green"
            />
            <AdminMetricCard
              title={RU.inactivePlural}
              value={inactiveCount}
              hint={RU.inactiveHint}
              to={buildCoursesPath({ is_active: "false" })}
              tone={inactiveCount ? "amber" : "gray"}
            />
          </div>

          {showCreateForm && (
            <AdminCreatePanel
              title={RU.newProgram}
              subtitle={RU.newProgramSubtitle}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <CourseFormFields values={form} onChange={updateField} prefix="create-" />

                <div className="flex flex-wrap gap-3 pt-2">
                  <ActionButton type="submit" tone="blue" disabled={saving}>
                    {saving ? RU.saving : RU.createProgram}
                  </ActionButton>

                  <ActionButton
                    type="button"
                    tone="light"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    {RU.clear}
                  </ActionButton>
                </div>
              </form>
            </AdminCreatePanel>
          )}

          <AdminFilterPanel
            columnsClassName="lg:grid-cols-[1fr_220px_auto]"
            onReset={handleResetFilter}
            resetDisabled={!hasActiveFilters}
            summary={getShownSummary(courses.length, courseCounts.all || courses.length)}
          >
            <AdminFilterField label={RU.search} className="block space-y-2">
              <input
                type="search"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder={RU.searchPlaceholder}
                className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
              />
            </AdminFilterField>

            <AdminFilterField label={RU.status} className="block space-y-2">
              <select
                value={filterActive}
                onChange={(event) => setFilterActive(event.target.value)}
                className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
              >
                <option value="">{RU.allStatuses}</option>
                <option value="true">{RU.activePlural}</option>
                <option value="false">{RU.inactivePlural}</option>
              </select>
            </AdminFilterField>

            <ActionButton type="button" tone="blue" onClick={handleApplyFilter} disabled={loading}>
              {loading ? RU.loading : RU.apply}
            </ActionButton>
          </AdminFilterPanel>

          <AdminQuickFilterButtons
            items={COURSE_ACTIVE_FILTERS}
            activeValue={filterActive}
            counts={courseCounts}
            disabled={loading}
            onChange={handleQuickActiveFilter}
            getCount={(item, counts) =>
              item.value === "true"
                ? counts.active || 0
                : item.value === "false"
                  ? counts.inactive || 0
                  : counts.all || 0}
          />

          {error && (
            <Alert title={RU.error} tone="red">
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert title={RU.done} tone="green">
              {successMessage}
            </Alert>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={RU.listTitle}
        subtitle={RU.listSubtitle}
      >
        {loading ? (
          <LoadingBlock text={RU.loadingPrograms} />
        ) : courses.length === 0 ? (
          <AdminEmptyState
            title={RU.programsNotFound}
            description={getFilteredEmptyText(
              hasActiveFilters,
              RU.filteredEmpty,
              RU.defaultEmpty
            )}
            onReset={handleResetFilter}
            showReset={hasActiveFilters}
          />
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isEditing={editingCourseId === course.id}
                isActionRunning={actionCourseId === course.id}
                editForm={editForm}
                onEditFieldChange={updateEditField}
                onStartEdit={handleStartEdit}
                onEditSubmit={handleEditSubmit}
                onCancelEdit={resetEditState}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
