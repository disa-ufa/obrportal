import { getApiErrorMessage } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createAdminEnrollment,
  createAdminGroupEnrollments,
  deleteAdminEnrollment,
  getAdminCourses,
  getAdminEnrollments,
  getAdminOrganizations,
  getAdminUsers,
  getAdminWorklistSummary,
  getOrgLearningGroupMembers,
  getOrgLearningGroups,
  updateAdminEnrollment,
} from "../api/client";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";
import { AdminSummaryCard, AdminWorkflowLink } from "../components/admin/AdminWorkCenter";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";
import { AdminFormField } from "../components/admin/AdminFormField";
import {
  buildCoursesPath,
  buildDocumentsPath,
  buildEnrollmentsPath,
  buildGroupsPath,
  buildOrganizationsPath,
} from "../utils/adminLinks";

const ENROLLMENT_STATUSES = [
  { value: "assigned", label: "Назначен" },
  { value: "active", label: "В процессе" },
  { value: "completed", label: "Завершен" },
  { value: "cancelled", label: "Отменен" },
];

const ENROLLMENT_STATUS_FILTERS = [
  { value: "", label: "Все" },
  { value: "assigned", label: "Назначены" },
  { value: "active", label: "В процессе" },
  { value: "completed", label: "Завершены" },
  { value: "cancelled", label: "Отменены" },
];

const INPUT_CLASS =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const BUTTON_PRIMARY_CLASS =
  "rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_DARK_CLASS =
  "rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_LIGHT_CLASS =
  "rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_RED_CLASS =
  "rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60";

const ENROLLMENT_API_ERROR_MESSAGES = {
  loadFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f.",
  createFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435.",
  bulkCreateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u043c\u0430\u0441\u0441\u043e\u0432\u043e\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435.",
  updateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435.",
  completeFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435.",
  deleteFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435.",
  accessDenied: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f\u043c\u0438.",
  notFound: "\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0438\u043b\u0438 \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0439 \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.",
  duplicate: "\u0422\u0430\u043a\u043e\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442 \u0434\u043b\u044f \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f \u0438 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b.",
  invalidStatus: "\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f.",
  noFields: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f.",
  groupNotFound: "\u0423\u0447\u0435\u0431\u043d\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430.",
  groupEmpty: "\u0412 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0439 \u0443\u0447\u0435\u0431\u043d\u043e\u0439 \u0433\u0440\u0443\u043f\u043f\u0435 \u043d\u0435\u0442 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432.",
  groupWrongOrganization: "\u0423\u0447\u0435\u0431\u043d\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430 \u043e\u0442\u043d\u043e\u0441\u0438\u0442\u0441\u044f \u043a \u0434\u0440\u0443\u0433\u043e\u0439 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438.",
  userNotInGroup: "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043d\u0435 \u0441\u043e\u0441\u0442\u043e\u0438\u0442 \u0432 \u0443\u043a\u0430\u0437\u0430\u043d\u043d\u043e\u0439 \u0443\u0447\u0435\u0431\u043d\u043e\u0439 \u0433\u0440\u0443\u043f\u043f\u0435.",
  deleteHasDocuments: "\u041d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435, \u043a \u043a\u043e\u0442\u043e\u0440\u043e\u043c\u0443 \u0443\u0436\u0435 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u044b \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b.",
  invalidRequest: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0435\u0439 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f.",
};


function getStatusLabel(value) {
  return ENROLLMENT_STATUSES.find((item) => item.value === value)?.label || value;
}
function formatEnrollmentApiError(err, fallback) {
  const status = err?.status ? `${err.status}` : "";
  const message = getApiErrorMessage(err);
  const normalizedMessage = message.toLowerCase();

  let readableMessage = fallback;

  if (status === "403") {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.accessDenied;
  } else if (status === "404") {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.notFound;
  } else if (status === "409") {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.duplicate;
  } else if (status === "422" && normalizedMessage.includes("status")) {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.invalidStatus;
  } else if (status === "422") {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.invalidRequest;
  } else if (status === "400" && normalizedMessage.includes("no fields")) {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.noFields;
  } else if (status === "400" && normalizedMessage.includes("no members")) {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.groupEmpty;
  } else if (status === "400" && normalizedMessage.includes("another organization")) {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.groupWrongOrganization;
  } else if (status === "400" && normalizedMessage.includes("not a member")) {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.userNotInGroup;
  } else if (status === "400" && normalizedMessage.includes("documents")) {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.deleteHasDocuments;
  } else if (normalizedMessage.includes("learning group not found")) {
    readableMessage = ENROLLMENT_API_ERROR_MESSAGES.groupNotFound;
  } else if (message) {
    readableMessage = message;
  }

  return `${status} ${readableMessage}`.trim();
}

function getEnrollmentFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    user_id: params.get("user_id") || "",
    course_id: params.get("course_id") || "",
    organization_id: params.get("organization_id") || "",
    status: params.get("status") || "",
    learning_group_id: params.get("learning_group_id") || "",
    action_required: params.get("action_required") === "true" ? "true" : "",
  };
}

function getStatusTone(value) {
  if (value === "completed") {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (value === "active") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (value === "cancelled") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getEnrollmentActionRequiredHint(enrollment) {
  if (enrollment?.status === "assigned") {
    return {
      title: "Назначение ожидает старта обучения",
      description: "Проверьте слушателя, программу и группу. Если обучение началось, переведите назначение в работу.",
      toneClass: "bg-amber-50 text-amber-800 ring-amber-200",
    };
  }

  if (enrollment?.status === "completed") {
    return {
      title: "Завершённое обучение ожидает документ",
      description: "Проверьте итоговый документ по назначению: черновик, публикацию, файл и публичную проверку.",
      toneClass: "bg-green-50 text-green-800 ring-green-200",
    };
  }

  return null;
}

function getEnrollmentAttentionItems(enrollment, organization) {
  const items = [];

  if (!enrollment) {
    return items;
  }

  const documentProfileStatus = getOrganizationDocumentProfileStatus(organization);

  if (enrollment.status === "assigned") {
    items.push("Старт обучения: назначение ещё не переведено в работу.");

    if (!enrollment.started_at) {
      items.push("Дата старта: не заполнена, проверьте фактическое начало обучения.");
    }
  }

  if (enrollment.status === "completed") {
    items.push("Итоговый документ: завершённое обучение нужно проверить в реестре документов.");

    if (!enrollment.completed_at) {
      items.push("Дата завершения: не заполнена, проверьте корректность статуса.");
    }
  }

  if (!enrollment.organization_id) {
    items.push("Организация: не указана, PDF будет использовать fallback-настройки приложения.");
  } else if (!organization) {
    items.push("Организация: карточка не найдена в загруженном справочнике, обновите данные.");
  } else if (documentProfileStatus.missing.length > 0) {
    items.push(`PDF-профиль организации: не заполнено полей — ${documentProfileStatus.missing.length}.`);
  }

  if (!enrollment.learning_group_id) {
    items.push("Группа: назначение без учебной группы, проверьте контекст группового обучения.");
  }

  return [...new Set(items)];
}

const USER_ROLE_LABELS = {
  admin: "Администратор",
  learner_fl: "Физлицо",
  learner_org: "Слушатель ЮЛ",
  org_rep: "Представитель ЮЛ",
  teacher: "Преподаватель",
  methodist: "Методист",
  finance_operator: "Финансы",
  edo_operator: "ЭДО",
  frdo_operator: "ФРДО",
};

function getUserRoleCodes(user) {
  if (!user || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles.map((role) => role.code).filter(Boolean);
}

function isLearnerUser(user) {
  const roleCodes = getUserRoleCodes(user);

  return (
    user?.email === "learner@obrportal.local" ||
    roleCodes.includes("learner_fl") ||
    roleCodes.includes("learner_org")
  );
}

function isAdminUser(user) {
  return user?.email === "admin@obrportal.local" || getUserRoleCodes(user).includes("admin");
}

function getUserRoleLabel(user) {
  const roleCodes = getUserRoleCodes(user);

  if (roleCodes.length === 0) {
    return "без роли";
  }

  return roleCodes.map((code) => USER_ROLE_LABELS[code] || code).join(", ");
}

function getUserSortRank(user) {
  if (isLearnerUser(user)) {
    return 0;
  }

  if (isAdminUser(user)) {
    return 2;
  }

  return 1;
}

function buildUserLabel(user) {
  if (!user) {
    return "";
  }

  const fullName = user.full_name ? ` - ${user.full_name}` : "";
  const roles = getUserRoleLabel(user);

  return `${user.email}${fullName} [${roles}]`;
}

function buildCourseLabel(course) {
  if (!course) {
    return "";
  }

  return `${course.title}${course.slug ? ` - ${course.slug}` : ""}`;
}

function buildOrganizationsMap(organizations) {
  return organizations.reduce((acc, organization) => {
    acc[organization.id] = organization;
    return acc;
  }, {});
}

function buildGroupsMap(groups) {
  return groups.reduce((acc, group) => {
    acc[group.id] = group;
    return acc;
  }, {});
}

function groupHasMember(groupId, userId, membersByGroupId) {
  if (!groupId || !userId) {
    return false;
  }

  return (membersByGroupId[groupId] || []).some((member) => member.user_id === userId);
}

function buildGroupLabel(group, organizationsById = {}) {
  if (!group) {
    return "";
  }

  const organization = organizationsById[group.organization_id];
  const code = group.code ? ` - ${group.code}` : "";
  const organizationName = organization?.name ? ` (${organization.name})` : "";

  return `${group.name}${code}${organizationName}`;
}

const DOCUMENT_PROFILE_FIELDS = [
  "document_issuer_name",
  "document_signer_position",
  "document_signer_name",
  "document_basis",
  "document_place",
];

function getOrganizationDocumentProfileStatus(organization) {
  if (!organization) {
    return {
      label: "PDF: настройки приложения",
      description: "Организация не выбрана. Итоговый PDF будет использовать fallback-настройки приложения.",
      toneClass: "bg-slate-50 text-slate-700 ring-slate-200",
      missing: DOCUMENT_PROFILE_FIELDS,
    };
  }

  const missing = DOCUMENT_PROFILE_FIELDS.filter((field) => !String(organization[field] || "").trim());

  if (missing.length === 0) {
    return {
      label: "PDF: профиль организации заполнен",
      description: "Итоговый PDF возьмёт реквизиты, подписанта, основание и место выдачи из выбранной организации.",
      toneClass: "bg-green-50 text-green-800 ring-green-200",
      missing,
    };
  }

  return {
    label: "PDF: профиль организации заполнен частично",
    description: "PDF использует заполненные реквизиты организации, а недостающие значения возьмёт из fallback-настроек приложения.",
    toneClass: "bg-amber-50 text-amber-900 ring-amber-200",
    missing,
  };
}

function OrganizationDocumentProfileHint({ organization, testId }) {
  const status = getOrganizationDocumentProfileStatus(organization);

  return (
    <div
      data-testid={testId}
      className={`rounded-2xl p-4 text-sm ring-1 ${status.toneClass}`}
    >
      <div className="font-semibold">{status.label}</div>
      <p className="mt-1 leading-6">{status.description}</p>
      {organization && status.missing.length > 0 && (
        <p className="mt-2 text-xs leading-5">
          Не заполнено полей профиля PDF: {status.missing.length}.
        </p>
      )}
    </div>
  );
}

function sortByLabel(left, right, getLabel) {
  return getLabel(left).localeCompare(getLabel(right), "ru-RU");
}

function getAvailableGroups(
  groups,
  organizationId,
  selectedGroupId = "",
  userId = "",
  membersByGroupId = {}
) {
  return groups
    .filter((group) => group.is_active || group.id === selectedGroupId)
    .filter((group) => !organizationId || group.organization_id === organizationId)
    .filter((group) => {
      if (group.id === selectedGroupId) {
        return true;
      }

      return groupHasMember(group.id, userId, membersByGroupId);
    })
    .sort((left, right) => left.name.localeCompare(right.name, "ru-RU"));
}

function buildEditForm(enrollment) {
  return {
    organization_id: enrollment.organization_id || "",
    learning_group_id: enrollment.learning_group_id || "",
    status: enrollment.status || "assigned",
    started_at: enrollment.started_at ? enrollment.started_at.slice(0, 16) : "",
    completed_at: enrollment.completed_at ? enrollment.completed_at.slice(0, 16) : "",
  };
}

function normalizeDateTime(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function EnrollmentSummaryCards({ statusCounts, users, courses, groups }) {
  const activeCoursesCount = courses.filter((course) => course.is_active).length;
  const activeGroupsCount = groups.filter((group) => group.is_active).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminSummaryCard
        title="Всего назначений"
        value={statusCounts.all || 0}
        hint="По текущему набору фильтров."
        to={buildEnrollmentsPath()}
      />
      <AdminSummaryCard
        title="В процессе"
        value={statusCounts.active || 0}
        hint="Назначения со статусом active."
        to={buildEnrollmentsPath({ status: "active" })}
      />
      <AdminSummaryCard
        title="Завершено"
        value={statusCounts.completed || 0}
        hint="Готовы к документам и проверке."
        to={buildEnrollmentsPath({ status: "completed" })}
      />
      <AdminSummaryCard
        title="Справочники"
        value={`${users.length}/${activeCoursesCount}/${activeGroupsCount}`}
        hint="Пользователи / активные программы / активные группы."
      />
    </div>
  );
}

function EnrollmentWorkflowPanel({ statusCounts, courses, groups }) {
  const firstActiveCourse = courses.find((course) => course.is_active);
  const firstActiveGroup = groups.find((group) => group.is_active);

  return (
    <SectionCard
      title="Рабочие сценарии"
      subtitle="Быстрые переходы для администратора учебных назначений."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AdminWorkflowLink
          title="Новые назначения"
          description={`Проверить назначенные записи: ${statusCounts.assigned || 0}.`}
          to={buildEnrollmentsPath({ status: "assigned" })}
        />
        <AdminWorkflowLink
          title="Завершённые обучения"
          description={`Открыть записи completed: ${statusCounts.completed || 0}.`}
          to={buildEnrollmentsPath({ status: "completed" })}
        />
        <AdminWorkflowLink
          title="Программы"
          description="Перейти к рабочему центру курсов и активным программам."
          to={buildCoursesPath(firstActiveCourse ? { q: firstActiveCourse.slug || firstActiveCourse.title } : {})}
        />
        <AdminWorkflowLink
          title="Группы"
          description="Проверить учебные группы перед массовым назначением."
          to={buildGroupsPath(firstActiveGroup ? { organization_id: firstActiveGroup.organization_id } : {})}
        />
      </div>
    </SectionCard>
  );
}

export function AdminEnrollmentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getEnrollmentFiltersFromSearch(location.search);

  const [enrollments, setEnrollments] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupMembersByGroupId, setGroupMembersByGroupId] = useState({});

  const [filterQuery, setFilterQuery] = useState(initialFilters.q);
  const [filterUserId, setFilterUserId] = useState(initialFilters.user_id);
  const [filterCourseId, setFilterCourseId] = useState(initialFilters.course_id);
  const [filterOrganizationId, setFilterOrganizationId] = useState(initialFilters.organization_id);
  const [filterStatus, setFilterStatus] = useState(initialFilters.status);
  const [filterGroupId, setFilterGroupId] = useState(initialFilters.learning_group_id);
  const [filterActionRequired, setFilterActionRequired] = useState(initialFilters.action_required);
  const [statusCounts, setStatusCounts] = useState({ all: 0 });
  const [actionRequiredCount, setActionRequiredCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [actionEnrollmentId, setActionEnrollmentId] = useState("");
  const [editingEnrollmentId, setEditingEnrollmentId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    user_id: "",
    course_id: "",
    organization_id: "",
    learning_group_id: "",
    status: "assigned",
    started_at: "",
    completed_at: "",
  });

  const [bulkForm, setBulkForm] = useState({
    learning_group_id: "",
    course_id: "",
    status: "assigned",
    started_at: "",
    completed_at: "",
  });

  const [editForm, setEditForm] = useState({
    organization_id: "",
    learning_group_id: "",
    status: "assigned",
    started_at: "",
    completed_at: "",
  });

  const activeCourses = useMemo(
    () => courses.filter((course) => course.is_active),
    [courses]
  );

  const organizationsById = useMemo(
    () => buildOrganizationsMap(organizations),
    [organizations]
  );

  const groupsById = useMemo(
    () => buildGroupsMap(groups),
    [groups]
  );

  const sortedUsers = useMemo(
    () =>
      [...users].sort((left, right) => {
        const rankDiff = getUserSortRank(left) - getUserSortRank(right);

        if (rankDiff !== 0) {
          return rankDiff;
        }

        return sortByLabel(left, right, buildUserLabel);
      }),
    [users]
  );

  const preferredCreateUser = useMemo(
    () =>
      sortedUsers.find((user) => user.email === "learner@obrportal.local") ||
      sortedUsers.find(isLearnerUser) ||
      null,
    [sortedUsers]
  );

  const sortedCourses = useMemo(
    () => [...courses].sort((left, right) => sortByLabel(left, right, buildCourseLabel)),
    [courses]
  );

  const sortedOrganizations = useMemo(
    () => [...organizations].sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    [organizations]
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((left, right) =>
      buildGroupLabel(left, organizationsById).localeCompare(buildGroupLabel(right, organizationsById), "ru-RU")
    ),
    [groups, organizationsById]
  );

  const bulkFormGroups = useMemo(
    () =>
      [...groups]
        .filter((group) => group.is_active)
        .sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    [groups]
  );

  const editingEnrollment = useMemo(
    () => enrollments.find((item) => item.id === editingEnrollmentId) || null,
    [enrollments, editingEnrollmentId]
  );

  const createFormGroups = useMemo(
    () =>
      getAvailableGroups(
        groups,
        form.organization_id,
        form.learning_group_id,
        form.user_id,
        groupMembersByGroupId
      ),
    [groups, form.organization_id, form.learning_group_id, form.user_id, groupMembersByGroupId]
  );

  const editFormGroups = useMemo(
    () =>
      getAvailableGroups(
        groups,
        editForm.organization_id,
        editForm.learning_group_id,
        editingEnrollment?.user_id || "",
        groupMembersByGroupId
      ),
    [
      groups,
      editForm.organization_id,
      editForm.learning_group_id,
      editingEnrollment?.user_id,
      groupMembersByGroupId,
    ]
  );

  const showActionRequiredOnly = filterActionRequired === "true";
  const visibleEnrollments = enrollments;

  function buildFilters(overrides = {}) {
    return {
      q: overrides.q ?? filterQuery,
      user_id: overrides.user_id ?? filterUserId,
      course_id: overrides.course_id ?? filterCourseId,
      organization_id: overrides.organization_id ?? filterOrganizationId,
      status: overrides.status ?? filterStatus,
      learning_group_id: overrides.learning_group_id ?? filterGroupId,
      action_required: overrides.action_required ?? filterActionRequired,
    };
  }

  async function navigateToEnrollmentFilters(filters, options = {}) {
    const nextPath = buildEnrollmentsPath(filters);
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

      const [
        enrollmentsResponse,
        usersResponse,
        coursesResponse,
        organizationsResponse,
        groupsResponse,
        worklistSummaryResponse,
      ] = await Promise.all([
        getAdminEnrollments(activeFilters),
        getAdminUsers(),
        getAdminCourses({ limit: 300 }),
        getAdminOrganizations(),
        getOrgLearningGroups(),
        getAdminWorklistSummary({
          enrollments_user_id: activeFilters.user_id,
          enrollments_course_id: activeFilters.course_id,
          enrollments_organization_id: activeFilters.organization_id,
          enrollments_learning_group_id: activeFilters.learning_group_id,
          enrollments_q: activeFilters.q,
        }),
      ]);

      const loadedGroups = Array.isArray(groupsResponse) ? groupsResponse : [];
      const loadedGroupMembersByGroupId = Object.fromEntries(
        await Promise.all(
          loadedGroups.map(async (group) => {
            const members = await getOrgLearningGroupMembers(group.id);
            return [group.id, Array.isArray(members) ? members : []];
          })
        )
      );

      const enrollmentsSummary = worklistSummaryResponse?.enrollments || {};

      setEnrollments(Array.isArray(enrollmentsResponse) ? enrollmentsResponse : []);
      setStatusCounts({
        all: enrollmentsSummary.total || 0,
        assigned: enrollmentsSummary.assigned || 0,
        active: enrollmentsSummary.active || 0,
        completed: enrollmentsSummary.completed || 0,
        cancelled: enrollmentsSummary.cancelled || 0,
      });
      setActionRequiredCount(enrollmentsSummary.action_required || 0);
      setUsers(Array.isArray(usersResponse) ? usersResponse : []);
      setCourses(Array.isArray(coursesResponse) ? coursesResponse : []);
      setOrganizations(Array.isArray(organizationsResponse) ? organizationsResponse : []);
      setGroups(loadedGroups);
      setGroupMembersByGroupId(loadedGroupMembersByGroupId);
    } catch (err) {
      setError(formatEnrollmentApiError(err, ENROLLMENT_API_ERROR_MESSAGES.loadFailed));
      setStatusCounts({ all: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const queryFilters = getEnrollmentFiltersFromSearch(location.search);

    setFilterQuery(queryFilters.q);
    setFilterUserId(queryFilters.user_id);
    setFilterCourseId(queryFilters.course_id);
    setFilterOrganizationId(queryFilters.organization_id);
    setFilterStatus(queryFilters.status);
    setFilterGroupId(queryFilters.learning_group_id);
    setFilterActionRequired(queryFilters.action_required);

    if (queryFilters.learning_group_id) {
      setBulkForm((current) => ({
        ...current,
        learning_group_id: queryFilters.learning_group_id,
      }));
    }

    loadData(queryFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Автозаполнение формы назначения для чистой demo-базы.
  useEffect(() => {
    if (loading) {
      return;
    }

    setForm((current) => {
      if (
        current.user_id ||
        current.course_id ||
        current.organization_id ||
        current.learning_group_id ||
        current.started_at ||
        current.completed_at
      ) {
        return current;
      }

      const next = { ...current };

      if (preferredCreateUser) {
        next.user_id = preferredCreateUser.id;
      }

      if (activeCourses.length === 1) {
        next.course_id = activeCourses[0].id;
      }

      if (sortedOrganizations.length === 1) {
        next.organization_id = sortedOrganizations[0].id;
      }

      const availableGroups = getAvailableGroups(
        groups,
        next.organization_id,
        "",
        next.user_id,
        groupMembersByGroupId
      );

      if (availableGroups.length === 1) {
        next.learning_group_id = availableGroups[0].id;
        next.organization_id = availableGroups[0].organization_id;
      }

      return next;
    });
  }, [
    loading,
    preferredCreateUser,
    activeCourses,
    sortedOrganizations,
    groups,
    groupMembersByGroupId,
  ]);

  function updateField(field, value) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "organization_id") {
        const selectedGroup = groupsById[next.learning_group_id];

        if (!value || (selectedGroup && selectedGroup.organization_id !== value)) {
          next.learning_group_id = "";
        }
      }

      if (field === "learning_group_id") {
        const selectedGroup = groupsById[value];

        if (selectedGroup) {
          next.organization_id = selectedGroup.organization_id;
        }
      }

      if (field === "user_id") {
        const selectedGroup = groupsById[next.learning_group_id];

        if (
          !value ||
          (selectedGroup && !groupHasMember(selectedGroup.id, value, groupMembersByGroupId))
        ) {
          next.learning_group_id = "";
        }
      }

      return next;
    });
  }

  function updateEditField(field, value) {
    setEditForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "organization_id") {
        const selectedGroup = groupsById[next.learning_group_id];

        if (!value || (selectedGroup && selectedGroup.organization_id !== value)) {
          next.learning_group_id = "";
        }
      }

      if (field === "learning_group_id") {
        const selectedGroup = groupsById[value];

        if (selectedGroup) {
          next.organization_id = selectedGroup.organization_id;
        }
      }

      return next;
    });
  }

  function resetForm() {
    setForm({
      user_id: "",
      course_id: "",
      organization_id: "",
      learning_group_id: "",
      status: "assigned",
      started_at: "",
      completed_at: "",
    });
  }

  function resetEditState() {
    setEditingEnrollmentId("");
    setEditForm({
      organization_id: "",
      learning_group_id: "",
      status: "assigned",
      started_at: "",
      completed_at: "",
    });
  }

  function buildCreatePayload(values) {
    return {
      user_id: values.user_id,
      course_id: values.course_id,
      organization_id: values.organization_id || null,
      learning_group_id: values.learning_group_id || null,
      status: values.status,
      started_at: normalizeDateTime(values.started_at),
      completed_at: normalizeDateTime(values.completed_at),
    };
  }

  function buildUpdatePayload(values) {
    return {
      organization_id: values.organization_id || null,
      learning_group_id: values.learning_group_id || null,
      status: values.status,
      started_at: normalizeDateTime(values.started_at),
      completed_at: normalizeDateTime(values.completed_at),
    };
  }

  function getEnrollmentGroupName(enrollment) {
    if (enrollment.learning_group_name) {
      return enrollment.learning_group_name;
    }

    return groupsById[enrollment.learning_group_id]?.name || "-";
  }

  function getEnrollmentFilterPath(overrides = {}) {
    return buildEnrollmentsPath({
      ...buildFilters(),
      ...overrides,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.user_id) {
      setError("Выберите пользователя.");
      return;
    }

    if (!form.course_id) {
      setError("Выберите программу.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const created = await createAdminEnrollment(buildCreatePayload(form));

      setSuccessMessage(`Назначение создано: ${created.user_email} → ${created.course_title}`);
      resetForm();
      await loadData(buildFilters());
    } catch (err) {
      setError(formatEnrollmentApiError(err, ENROLLMENT_API_ERROR_MESSAGES.createFailed));
    } finally {
      setSaving(false);
    }
  }

  function resetBulkForm() {
    setBulkForm({
      learning_group_id: "",
      course_id: "",
      status: "assigned",
      started_at: "",
      completed_at: "",
    });
  }

  function updateBulkField(field, value) {
    setBulkForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildBulkCreatePayload(values) {
    return {
      learning_group_id: values.learning_group_id,
      course_id: values.course_id,
      status: values.status,
      started_at: normalizeDateTime(values.started_at),
      completed_at: normalizeDateTime(values.completed_at),
    };
  }

  async function handleBulkSubmit(event) {
    event.preventDefault();

    if (!bulkForm.learning_group_id) {
      setError("Выберите учебную группу.");
      return;
    }

    if (!bulkForm.course_id) {
      setError("Выберите программу.");
      return;
    }

    try {
      setBulkSaving(true);
      setError("");
      setSuccessMessage("");

      const result = await createAdminGroupEnrollments(buildBulkCreatePayload(bulkForm));
      const nextGroupId = result.learning_group_id || bulkForm.learning_group_id;
      const nextCourseId = result.course_id || bulkForm.course_id;

      setSuccessMessage(
        `Массовое назначение завершено: создано ${result.created_count || 0}, пропущено ${result.skipped_count || 0}.`
      );

      setFilterQuery("");
      setFilterUserId("");
      setFilterCourseId(nextCourseId);
      setFilterStatus("");
      setFilterGroupId(nextGroupId);
      resetBulkForm();

      await navigateToEnrollmentFilters(
        {
          course_id: nextCourseId,
          learning_group_id: nextGroupId,
        },
        { replace: true }
      );
    } catch (err) {
      setError(formatEnrollmentApiError(err, ENROLLMENT_API_ERROR_MESSAGES.bulkCreateFailed));
    } finally {
      setBulkSaving(false);
    }
  }


  async function handleCompleteEnrollment(enrollment) {
    if (!enrollment || enrollment.status === "completed") {
      return;
    }

    const confirmed = window.confirm(
      "Завершить обучение по этому назначению?\\n\\nБудет проставлен статус completed и создан черновик документа."
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionEnrollmentId(enrollment.id);
      setError("");
      setSuccessMessage("");

      const updated = await updateAdminEnrollment(enrollment.id, {
        status: "completed",
      });

      await loadData(buildFilters());

      setSuccessMessage(
        `Обучение завершено: ${updated.user_email} → ${updated.course_title}. Черновик документа создан.`
      );
    } catch (err) {
      setError(formatEnrollmentApiError(err, ENROLLMENT_API_ERROR_MESSAGES.completeFailed));
    } finally {
      setActionEnrollmentId("");
    }
  }

  function handleStartEdit(enrollment) {
    setError("");
    setSuccessMessage("");
    setEditingEnrollmentId(enrollment.id);
    setEditForm(buildEditForm(enrollment));
  }

  async function handleEditSubmit(event, enrollmentId) {
    event.preventDefault();

    try {
      setActionEnrollmentId(enrollmentId);
      setError("");
      setSuccessMessage("");

      const updated = await updateAdminEnrollment(enrollmentId, buildUpdatePayload(editForm));

      setSuccessMessage(`Назначение обновлено: ${updated.user_email} → ${updated.course_title}`);
      resetEditState();
      await loadData(buildFilters());
    } catch (err) {
      setError(formatEnrollmentApiError(err, ENROLLMENT_API_ERROR_MESSAGES.updateFailed));
    } finally {
      setActionEnrollmentId("");
    }
  }

  async function handleDelete(enrollment) {
    const confirmed = window.confirm(
      `Удалить назначение "${enrollment.user_email} → ${enrollment.course_title}"? Действие нельзя отменить.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionEnrollmentId(enrollment.id);
      setError("");
      setSuccessMessage("");

      await deleteAdminEnrollment(enrollment.id);

      if (editingEnrollmentId === enrollment.id) {
        resetEditState();
      }

      setSuccessMessage(`Назначение удалено: ${enrollment.user_email} → ${enrollment.course_title}`);
      await loadData(buildFilters());
    } catch (err) {
      setError(formatEnrollmentApiError(err, ENROLLMENT_API_ERROR_MESSAGES.deleteFailed));
    } finally {
      setActionEnrollmentId("");
    }
  }

  async function handleApplyFilter(event) {
    event.preventDefault();
    await navigateToEnrollmentFilters(buildFilters());
  }

  async function handleQuickStatusFilter(status) {
    setFilterStatus(status);
    await navigateToEnrollmentFilters(buildFilters({ status }));
  }

  async function handleToggleActionRequiredFilter() {
    const nextActionRequired = showActionRequiredOnly ? "" : "true";
    setFilterActionRequired(nextActionRequired);
    await navigateToEnrollmentFilters(buildFilters({ action_required: nextActionRequired }));
  }

  async function handleResetFilter() {
    setFilterQuery("");
    setFilterUserId("");
    setFilterCourseId("");
    setFilterOrganizationId("");
    setFilterStatus("");
    setFilterGroupId("");
    setFilterActionRequired("");
    await navigateToEnrollmentFilters({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Администрирование
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Назначения на программы
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Управление связкой пользователь → программа: назначение обучения,
          изменение статуса, привязка к организации и учебной группе.
        </p>
      </section>

      {error && (
        <Alert title="Ошибка" tone="red">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert title="Готово" tone="green">
          {successMessage}
        </Alert>
      )}

      <EnrollmentSummaryCards
        statusCounts={statusCounts}
        users={users}
        courses={courses}
        groups={groups}
      />

      <EnrollmentWorkflowPanel
        statusCounts={statusCounts}
        courses={courses}
        groups={groups}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)]">
        <div className="space-y-6">
        <SectionCard title="Создать назначение" subtitle="POST /api/v1/admin/enrollments">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <AdminFormField contentClassName="mt-2" label="Пользователь">
                <select
                  value={form.user_id}
                  onChange={(event) => updateField("user_id", event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Выберите пользователя</option>
                  {sortedUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {buildUserLabel(user)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Слушатели отображаются выше администраторов. В demo-режиме автоматически подставляется learner@obrportal.local.
                </p>
              </AdminFormField>

              <AdminFormField contentClassName="mt-2" label="Программа">
                <select
                  value={form.course_id}
                  onChange={(event) => updateField("course_id", event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Выберите программу</option>
                  {activeCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {buildCourseLabel(course)}
                    </option>
                  ))}
                </select>
              </AdminFormField>

              <AdminFormField contentClassName="mt-2" label="Организация">
                <select
                  value={form.organization_id}
                  onChange={(event) => updateField("organization_id", event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Без организации</option>
                  {sortedOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </AdminFormField>

              <OrganizationDocumentProfileHint
                organization={organizationsById[form.organization_id]}
                testId="enrollment-create-document-profile-hint"
              />

              <AdminFormField contentClassName="mt-2" label="Учебная группа">
                <select
                  value={form.learning_group_id}
                  onChange={(event) => updateField("learning_group_id", event.target.value)}
                  className={INPUT_CLASS}
                  disabled={groups.length === 0 || !form.user_id}
                >
                  <option value="">
                    {!form.user_id
                      ? "Сначала выберите пользователя"
                      : groups.length === 0
                        ? "Групп пока нет"
                        : "Без группы"}
                  </option>
                  {createFormGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {buildGroupLabel(group, organizationsById)}
                    </option>
                  ))}
                </select>
              </AdminFormField>

              <AdminFormField contentClassName="mt-2" label="Статус">
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className={INPUT_CLASS}
                >
                  {ENROLLMENT_STATUSES.map((statusItem) => (
                    <option key={statusItem.value} value={statusItem.value}>
                      {statusItem.label}
                    </option>
                  ))}
                </select>
              </AdminFormField>

              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField contentClassName="mt-2" label="Начато">
                  <input
                    type="datetime-local"
                    value={form.started_at}
                    onChange={(event) => updateField("started_at", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </AdminFormField>

                <AdminFormField contentClassName="mt-2" label="Завершено">
                  <input
                    type="datetime-local"
                    value={form.completed_at}
                    onChange={(event) => updateField("completed_at", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </AdminFormField>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={saving} className={BUTTON_PRIMARY_CLASS}>
                {saving ? "Сохраняем..." : "Создать назначение"}
              </button>

              <button type="button" onClick={resetForm} disabled={saving} className={BUTTON_LIGHT_CLASS}>
                Очистить
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Массовое назначение группе" subtitle="POST /api/v1/admin/enrollments/group">
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <p className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-100">
              Выберите учебную группу и программу. Система создаст назначения для всех участников группы, а дубликаты пропустит.
            </p>

            <div className="grid gap-4">
              <AdminFormField contentClassName="mt-2" label="Учебная группа">
                <select
                  value={bulkForm.learning_group_id}
                  onChange={(event) => updateBulkField("learning_group_id", event.target.value)}
                  className={INPUT_CLASS}
                  disabled={bulkFormGroups.length === 0}
                >
                  <option value="">
                    {bulkFormGroups.length === 0 ? "Групп пока нет" : "Выберите группу"}
                  </option>
                  {bulkFormGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {buildGroupLabel(group, organizationsById)}
                    </option>
                  ))}
                </select>
              </AdminFormField>

              <AdminFormField contentClassName="mt-2" label="Программа">
                <select
                  value={bulkForm.course_id}
                  onChange={(event) => updateBulkField("course_id", event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Выберите программу</option>
                  {activeCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {buildCourseLabel(course)}
                    </option>
                  ))}
                </select>
              </AdminFormField>

              <AdminFormField contentClassName="mt-2" label="Статус">
                <select
                  value={bulkForm.status}
                  onChange={(event) => updateBulkField("status", event.target.value)}
                  className={INPUT_CLASS}
                >
                  {ENROLLMENT_STATUSES.map((statusItem) => (
                    <option key={statusItem.value} value={statusItem.value}>
                      {statusItem.label}
                    </option>
                  ))}
                </select>
              </AdminFormField>

              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField contentClassName="mt-2" label="Начато">
                  <input
                    type="datetime-local"
                    value={bulkForm.started_at}
                    onChange={(event) => updateBulkField("started_at", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </AdminFormField>

                <AdminFormField contentClassName="mt-2" label="Завершено">
                  <input
                    type="datetime-local"
                    value={bulkForm.completed_at}
                    onChange={(event) => updateBulkField("completed_at", event.target.value)}
                    className={INPUT_CLASS}
                  />
                </AdminFormField>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={bulkSaving} className={BUTTON_DARK_CLASS}>
                {bulkSaving ? "Назначаем..." : "Назначить группе"}
              </button>

              <button type="button" onClick={resetBulkForm} disabled={bulkSaving} className={BUTTON_LIGHT_CLASS}>
                Очистить
              </button>
            </div>
          </form>
        </SectionCard>
        </div>

        <SectionCard title="Список назначений" subtitle="GET /api/v1/admin/enrollments">
          <form onSubmit={handleApplyFilter} className="mb-5 grid gap-3 xl:grid-cols-[1.15fr_1fr_1fr_1fr_1fr_1fr_auto_auto]">
            <input
              type="search"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Поиск: e-mail, ФИО, курс, группа"
              className={INPUT_CLASS}
            />

            <select
              value={filterUserId}
              onChange={(event) => setFilterUserId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Все пользователи</option>
              {sortedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {buildUserLabel(user)}
                </option>
              ))}
            </select>

            <select
              value={filterCourseId}
              onChange={(event) => setFilterCourseId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Все программы</option>
              {sortedCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {buildCourseLabel(course)}
                </option>
              ))}
            </select>

            <select
              value={filterOrganizationId}
              onChange={(event) => setFilterOrganizationId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Все организации</option>
              {sortedOrganizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Все статусы</option>
              {ENROLLMENT_STATUSES.map((statusItem) => (
                <option key={statusItem.value} value={statusItem.value}>
                  {statusItem.label}
                </option>
              ))}
            </select>

            <select
              value={filterGroupId}
              onChange={(event) => setFilterGroupId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Все группы</option>
              {sortedGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {buildGroupLabel(group, organizationsById)}
                </option>
              ))}
            </select>

            <button type="submit" className={BUTTON_DARK_CLASS}>
              Применить
            </button>

            <button type="button" onClick={handleResetFilter} className={BUTTON_LIGHT_CLASS}>
              Сбросить
            </button>
          </form>

          <AdminQuickFilterButtons
              items={ENROLLMENT_STATUS_FILTERS}
              activeValue={filterStatus}
              counts={statusCounts}
              disabled={loading}
              onChange={handleQuickStatusFilter}
              className="mb-5 flex flex-wrap gap-2"
            />

          <div
            data-testid="enrollments-worklist-summary-note"
            className="mb-5 text-xs text-slate-500"
          >
            Счётчики быстрых фильтров рассчитаны по текущим фильтрам страницы.
          </div>

          <div className="mb-5">
            <button
              type="button"
              data-testid="enrollments-action-required-filter"
              onClick={handleToggleActionRequiredFilter}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                showActionRequiredOnly
                  ? "bg-amber-600 text-white ring-amber-600"
                  : "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100"
              }`}
            >
              <span>{"\u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f"}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  showActionRequiredOnly ? "bg-white/20 text-white" : "bg-white text-amber-800"
                }`}
              >
                {actionRequiredCount}
              </span>
            </button>
          </div>

          {showActionRequiredOnly && (
            <div
              data-testid="enrollments-action-required-banner"
              className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">
                    Включён режим контроля назначений
                  </div>
                  <p className="mt-1 leading-6 text-amber-800">
                    Показаны только назначения со статусами «назначен» и «завершен».
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleActionRequiredFilter}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
                >
                  Показать все назначения
                </button>
              </div>
            </div>
          )}

          <div className="mb-5 flex flex-wrap gap-3 text-sm text-slate-500">
            <span>Показано назначений: {visibleEnrollments.length}</span>
            <span>Всего по текущим фильтрам: {statusCounts.all || 0}</span>
            <span>{"\u0422\u0440\u0435\u0431\u0443\u044e\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f"}: {actionRequiredCount}</span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загружаем назначения...
            </div>
          ) : visibleEnrollments.length === 0 ? (
            <AdminEmptyState
              title={
                showActionRequiredOnly
                  ? "Назначения, требующие действия, не найдены"
                  : "Назначения не найдены"
              }
              description={
                showActionRequiredOnly
                  ? "В текущей выборке нет назначений со статусами «назначен» или «завершен», которые требуют внимания администратора."
                  : "Измените фильтры или назначьте пользователя на образовательную программу."
              }
              resetLabel={
                showActionRequiredOnly
                  ? "Показать все назначения"
                  : "Сбросить фильтр"
              }
              onReset={showActionRequiredOnly ? handleToggleActionRequiredFilter : handleResetFilter}
            />

          ) : (
            <div className="space-y-4">
              {visibleEnrollments.map((enrollment) => {
                const isEditing = editingEnrollmentId === enrollment.id;
                const isActionRunning = actionEnrollmentId === enrollment.id;
                const enrollmentActionHint = getEnrollmentActionRequiredHint(enrollment);
                const enrollmentOrganization = organizationsById[enrollment.organization_id] || null;
                const enrollmentProfileStatus = getOrganizationDocumentProfileStatus(enrollmentOrganization);
                const enrollmentAttentionItems = getEnrollmentAttentionItems(
                  enrollment,
                  enrollmentOrganization
                );

                return (
                  <article
                    key={enrollment.id}
                    className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-200"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getStatusTone(enrollment.status)}`}>
                        {getStatusLabel(enrollment.status)}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {enrollment.course_slug}
                      </span>
                    </div>

                    {!isEditing ? (
                      <>
                        <div className="mt-4">
                          <h2 className="text-xl font-bold text-slate-900">
                            {enrollment.course_title}
                          </h2>
                          <div className="mt-1 text-sm text-slate-500">
                            {enrollment.user_email}
                            {enrollment.user_full_name ? ` - ${enrollment.user_full_name}` : ""}
                          </div>
                        </div>

                        {enrollmentActionHint && (
                          <div
                            data-testid="enrollment-action-required-hint"
                            className={`mt-4 rounded-2xl p-4 text-sm ring-1 ${enrollmentActionHint.toneClass}`}
                          >
                            <div className="font-semibold">
                              {enrollmentActionHint.title}
                            </div>
                            <p className="mt-1 leading-6">
                              {enrollmentActionHint.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {enrollment.status === "assigned" && (
                                <button
                                  type="button"
                                  data-testid="enrollment-action-required-primary-action"
                                  onClick={() => handleStartEdit(enrollment)}
                                  disabled={isActionRunning}
                                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Проверить назначение
                                </button>
                              )}

                              {enrollment.status === "completed" && (
                                <Link
                                  data-testid="enrollment-action-required-documents-link"
                                  to={buildDocumentsPath({
                                    enrollment_id: enrollment.id,
                                    action_required: "true",
                                  })}
                                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                                >
                                  Открыть документы
                                </Link>
                              )}
                            </div>
                          </div>
                        )}

                        {enrollmentAttentionItems.length > 0 && (
                          <div
                            data-testid="enrollment-attention-fields"
                            className={`mt-4 rounded-2xl p-4 text-sm ring-1 ${enrollmentActionHint?.toneClass || "bg-amber-50 text-amber-900 ring-amber-200"}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-semibold text-slate-900">
                                Что требует внимания в назначении
                              </div>
                              <span
                                data-testid="enrollment-attention-count"
                                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                              >
                                Пунктов внимания: {enrollmentAttentionItems.length}
                              </span>
                            </div>
                            <p
                              data-testid="enrollment-attention-diagnostics-note"
                              className="mt-2 leading-6"
                            >
                              Диагностика основана на статусе, датах, группе, организации и PDF-профиле организации.
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                              {enrollmentAttentionItems.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Организация
                            </div>
                            {enrollment.organization_id ? (
                              <Link
                                data-testid="enrollment-organization-link"
                                to={buildOrganizationsPath({ organization_id: enrollment.organization_id })}
                                className="mt-2 inline-flex font-semibold text-blue-700 transition hover:text-blue-900"
                              >
                                {enrollment.organization_name || "Открыть организацию"}
                              </Link>
                            ) : (
                              <div className="mt-2 font-semibold text-slate-900">
                                -
                              </div>
                            )}
                            <div
                              data-testid="enrollment-list-document-profile-status"
                              className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${enrollmentProfileStatus.toneClass}`}
                            >
                              {enrollmentProfileStatus.label}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Группа
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {getEnrollmentGroupName(enrollment)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Начато
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(enrollment.started_at)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Завершено
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(enrollment.completed_at)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link
                            to={buildDocumentsPath({ enrollment_id: enrollment.id })}
                            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                          >
                            Документы
                          </Link>

                          {enrollment.course_slug && (
                            <Link
                              to={`/courses/${encodeURIComponent(enrollment.course_slug)}`}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Курс
                            </Link>
                          )}

                          {enrollment.user_id && (
                            <Link
                              to={getEnrollmentFilterPath({
                                q: "",
                                user_id: enrollment.user_id,
                                course_id: "",
                                status: "",
                                learning_group_id: "",
                              })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Назначения слушателя
                            </Link>
                          )}

                          {enrollment.course_id && (
                            <Link
                              to={getEnrollmentFilterPath({
                                q: "",
                                user_id: "",
                                course_id: enrollment.course_id,
                                status: "",
                                learning_group_id: "",
                              })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Назначения курса
                            </Link>
                          )}

                          {enrollment.learning_group_id && (
                            <Link
                              to={getEnrollmentFilterPath({
                                q: "",
                                user_id: "",
                                course_id: "",
                                status: "",
                                learning_group_id: enrollment.learning_group_id,
                              })}
                              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                              Назначения группы
                            </Link>
                          )}

                          {enrollment.status !== "completed" && enrollment.status !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleCompleteEnrollment(enrollment)}
                              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                            >
                              Завершить обучение
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEdit(enrollment)}
                            disabled={isActionRunning}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Редактировать
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(enrollment)}
                            disabled={isActionRunning}
                            className={BUTTON_RED_CLASS}
                          >
                            {isActionRunning ? "Удаляем..." : "Удалить"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <form
                        onSubmit={(event) => handleEditSubmit(event, enrollment.id)}
                        className="mt-5 space-y-4 rounded-[2rem] bg-white p-5 ring-1 ring-blue-100"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <AdminFormField contentClassName="mt-2" label="Организация">
                            <select
                              value={editForm.organization_id}
                              onChange={(event) => updateEditField("organization_id", event.target.value)}
                              className={INPUT_CLASS}
                            >
                              <option value="">Без организации</option>
                              {sortedOrganizations.map((organization) => (
                                <option key={organization.id} value={organization.id}>
                                  {organization.name}
                                </option>
                              ))}
                            </select>
                          </AdminFormField>

                          <OrganizationDocumentProfileHint
                            organization={organizationsById[editForm.organization_id]}
                            testId="enrollment-edit-document-profile-hint"
                          />

                          <AdminFormField contentClassName="mt-2" label="Учебная группа">
                            <select
                              value={editForm.learning_group_id}
                              onChange={(event) => updateEditField("learning_group_id", event.target.value)}
                              className={INPUT_CLASS}
                              disabled={groups.length === 0}
                            >
                              <option value="">
                                {groups.length === 0 ? "Групп пока нет" : "Без группы"}
                              </option>
                              {editFormGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {buildGroupLabel(group, organizationsById)}
                                </option>
                              ))}
                            </select>
                          </AdminFormField>

                          <AdminFormField contentClassName="mt-2" label="Статус">
                            <select
                              value={editForm.status}
                              onChange={(event) => updateEditField("status", event.target.value)}
                              className={INPUT_CLASS}
                            >
                              {ENROLLMENT_STATUSES.map((statusItem) => (
                                <option key={statusItem.value} value={statusItem.value}>
                                  {statusItem.label}
                                </option>
                              ))}
                            </select>
                          </AdminFormField>

                          <AdminFormField contentClassName="mt-2" label="Начато">
                            <input
                              type="datetime-local"
                              value={editForm.started_at}
                              onChange={(event) => updateEditField("started_at", event.target.value)}
                              className={INPUT_CLASS}
                            />
                          </AdminFormField>

                          <AdminFormField contentClassName="mt-2" label="Завершено">
                            <input
                              type="datetime-local"
                              value={editForm.completed_at}
                              onChange={(event) => updateEditField("completed_at", event.target.value)}
                              className={INPUT_CLASS}
                            />
                          </AdminFormField>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isActionRunning}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isActionRunning ? "Сохраняем..." : "Сохранить"}
                          </button>

                          <button
                            type="button"
                            onClick={resetEditState}
                            disabled={isActionRunning}
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
