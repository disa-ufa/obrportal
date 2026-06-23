import { getApiErrorMessage, getApiErrorStatus, getSafeApiErrorMessage } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  addOrgLearningGroupMember,
  getAdminUsers,
  getOrgLearningGroupMembers,
  removeOrgLearningGroupMember,
} from "../api/client";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { ActionButton } from "../components/ui/ActionButton";
import { Alert } from "../components/ui/Alert";
import { DetailField, formatDetailDate } from "../components/ui/DetailField";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { SmallTable } from "../components/ui/SmallTable";
import { StatusBadge } from "../components/ui/StatusBadge";
import { normalizeSearchValue } from "../utils/search";
import { buildDatedCsvFilename, downloadCsvFile } from "../utils/exportCsv";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { ADMIN_FILTER_CONTROL_SOFT_CLASS } from "../utils/adminClasses";
import { AdminTextInput as TextInput } from "../components/admin/AdminTextInput";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";
import { AdminFormField as Field } from "../components/admin/AdminFormField";
import {
  TABLE_LINK_CLASS,
  buildAuditPath,
  buildDocumentsPath,
  buildEnrollmentsPath,
  buildGroupsPath,
  buildOrganizationsPath,
  buildUsersPath,
} from "../utils/adminLinks";

const EMPTY_GROUP = {
  organization_id: "",
  name: "",
  code: "",
  description: "",
  is_active: true,
};

const ENROLLMENTS_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800";

const SECONDARY_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100";

const GROUP_STATUS_FILTERS = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "inactive", label: "Неактивные" },
];

const GROUP_API_ERROR_MESSAGES = {
  saveFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u0443.",
  createFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u0443.",
  updateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u0443.",
  deleteFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u0443.",
  membersLoadFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432 \u0433\u0440\u0443\u043f\u043f\u044b.",
  addMemberFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430 \u0432 \u0433\u0440\u0443\u043f\u043f\u0443.",
  removeMemberFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430 \u0438\u0437 \u0433\u0440\u0443\u043f\u043f\u044b.",
  accessDenied: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u0443\u0447\u0435\u0431\u043d\u044b\u043c\u0438 \u0433\u0440\u0443\u043f\u043f\u0430\u043c\u0438.",
  groupNotFound: "\u0423\u0447\u0435\u0431\u043d\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430.",
  organizationNotFound: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u0434\u043b\u044f \u0443\u0447\u0435\u0431\u043d\u043e\u0439 \u0433\u0440\u0443\u043f\u043f\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430.",
  userNotFound: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.",
  memberNotFound: "\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a \u0443\u0447\u0435\u0431\u043d\u043e\u0439 \u0433\u0440\u0443\u043f\u043f\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.",
  duplicateName: "\u0423\u0447\u0435\u0431\u043d\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430 \u0441 \u0442\u0430\u043a\u0438\u043c \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435\u043c \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442 \u0432 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0439 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438.",
  duplicateCode: "\u0423\u0447\u0435\u0431\u043d\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430 \u0441 \u0442\u0430\u043a\u0438\u043c \u043a\u043e\u0434\u043e\u043c \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  duplicateMember: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u0443\u0436\u0435 \u0441\u043e\u0441\u0442\u043e\u0438\u0442 \u0432 \u044d\u0442\u043e\u0439 \u0443\u0447\u0435\u0431\u043d\u043e\u0439 \u0433\u0440\u0443\u043f\u043f\u0435.",
  duplicate: "\u0422\u0430\u043a\u0430\u044f \u0443\u0447\u0435\u0431\u043d\u0430\u044f \u0433\u0440\u0443\u043f\u043f\u0430 \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  deleteHasRelations: "\u041d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0443\u0447\u0435\u0431\u043d\u0443\u044e \u0433\u0440\u0443\u043f\u043f\u0443, \u0442\u0430\u043a \u043a\u0430\u043a \u043e\u043d\u0430 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0432 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f\u0445 \u0438\u043b\u0438 \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445.",
  invalidRequest: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0435\u0439 \u0443\u0447\u0435\u0431\u043d\u043e\u0439 \u0433\u0440\u0443\u043f\u043f\u044b.",
};
function formatGroupApiError(err, fallback) {
  const status = getApiErrorStatus(err);
  const message = getApiErrorMessage(err);
  const safeMessage = getSafeApiErrorMessage(message, fallback);
  const normalizedMessage = message.toLowerCase();

  let readableMessage = fallback;

  if (status === "403") {
    readableMessage = GROUP_API_ERROR_MESSAGES.accessDenied;
  } else if (status === "404" && normalizedMessage.includes("organization")) {
    readableMessage = GROUP_API_ERROR_MESSAGES.organizationNotFound;
  } else if (status === "404" && normalizedMessage.includes("user")) {
    readableMessage = GROUP_API_ERROR_MESSAGES.userNotFound;
  } else if (status === "404" && normalizedMessage.includes("member")) {
    readableMessage = GROUP_API_ERROR_MESSAGES.memberNotFound;
  } else if (status === "404") {
    readableMessage = GROUP_API_ERROR_MESSAGES.groupNotFound;
  } else if (status === "409" && normalizedMessage.includes("name")) {
    readableMessage = GROUP_API_ERROR_MESSAGES.duplicateName;
  } else if (status === "409" && normalizedMessage.includes("code")) {
    readableMessage = GROUP_API_ERROR_MESSAGES.duplicateCode;
  } else if (status === "409" && normalizedMessage.includes("member")) {
    readableMessage = GROUP_API_ERROR_MESSAGES.duplicateMember;
  } else if (status === "409") {
    readableMessage = GROUP_API_ERROR_MESSAGES.duplicate;
  } else if (
    status === "400" &&
    (
      normalizedMessage.includes("enrollment") ||
      normalizedMessage.includes("document") ||
      normalizedMessage.includes("relation") ||
      normalizedMessage.includes("foreign key") ||
      normalizedMessage.includes("used")
    )
  ) {
    readableMessage = GROUP_API_ERROR_MESSAGES.deleteHasRelations;
  } else if (status === "422") {
    readableMessage = GROUP_API_ERROR_MESSAGES.invalidRequest;
  } else if (message) {
    readableMessage = safeMessage;
  }

  return `${status} ${readableMessage}`.trim();
}



function buildGroupEnrollmentsHref(groupId) {
  return buildEnrollmentsPath({ learning_group_id: groupId });
}

function getGroupFiltersFromSearch(search) {
  const params = new URLSearchParams(search);

  return {
    q: params.get("q") || "",
    organization_id: params.get("organization_id") || "all",
    status: params.get("status") || "all",
  };
}

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";

function nullableTrim(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function normalizeInitialValues(initialValues) {
  return {
    organization_id: initialValues?.organization_id || "",
    name: initialValues?.name || "",
    code: initialValues?.code || "",
    description: initialValues?.description || "",
    is_active: initialValues?.is_active ?? true,
  };
}

function buildGroupPayload(values) {
  return {
    organization_id: values.organization_id,
    name: values.name.trim(),
    code: nullableTrim(values.code),
    description: nullableTrim(values.description),
    is_active: Boolean(values.is_active),
  };
}

function buildOrganizationsMap(organizations) {
  return organizations.reduce((acc, organization) => {
    acc[organization.id] = organization.name;
    return acc;
  }, {});
}

function buildUserLabel(user) {
  if (!user) {
    return "";
  }

  const name = user.full_name ? `${user.full_name} — ` : "";
  return `${name}${user.email}`;
}

function groupMatchesSearch(group, query, organizationName) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  return [
    group.name,
    group.code,
    group.description,
    organizationName,
    group.is_active ? "active активная" : "inactive неактивная",
  ]
    .map(normalizeSearchValue)
    .some((value) => value.includes(normalizedQuery));
}

function groupMatchesOrganization(group, organizationFilter) {
  if (organizationFilter === "all") {
    return true;
  }

  return group.organization_id === organizationFilter;
}

function groupMatchesStatus(group, statusFilter) {
  if (statusFilter === "active") {
    return group.is_active;
  }

  if (statusFilter === "inactive") {
    return !group.is_active;
  }

  return true;
}

function calculateGroupCounts(items) {
  const counts = {
    all: Array.isArray(items) ? items.length : 0,
    active: 0,
    inactive: 0,
  };

  if (!Array.isArray(items)) {
    return counts;
  }

  items.forEach((group) => {
    if (group.is_active) {
      counts.active += 1;
    } else {
      counts.inactive += 1;
    }
  });

  return counts;
}

function getGroupAttentionItems(group, organizationsMap) {
  const items = [];

  if (!group) {
    return items;
  }

  if (!group.is_active) {
    items.push("Статус: группа неактивна, проверьте актуальность назначений и участников.");
  }

  if (!String(group.code || "").trim()) {
    items.push("Код группы: не заполнен, сложнее искать группу в операционных списках.");
  }

  if (!group.organization_id) {
    items.push("Организация: группа не привязана к организации.");
  } else if (!organizationsMap[group.organization_id]) {
    items.push("Организация: карточка не найдена в загруженном справочнике.");
  }

  if (!String(group.description || "").trim()) {
    items.push("Описание: не заполнено, добавьте контекст обучения или состава группы.");
  }

  return [...new Set(items)];
}

function countGroupsWhere(items, predicate) {
  return Array.isArray(items) ? items.filter(predicate).length : 0;
}

function getLearningGroupOperationsStats({
  groups,
  filteredGroups,
  groupCounts,
  organizations,
  filters,
}) {
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "organization_id") {
      return value && value !== "all";
    }

    if (key === "status") {
      return value && value !== "all";
    }

    return Boolean(String(value || "").trim());
  }).length;

  return {
    total: groups.length,
    matched: groupCounts.all || 0,
    displayed: filteredGroups.length,
    active: groupCounts.active || 0,
    inactive: groupCounts.inactive || 0,
    withOrganization: countGroupsWhere(filteredGroups, (group) => group.organization_id),
    withoutOrganization: countGroupsWhere(filteredGroups, (group) => !group.organization_id),
    withoutCode: countGroupsWhere(filteredGroups, (group) => !String(group.code || "").trim()),
    withoutDescription: countGroupsWhere(
      filteredGroups,
      (group) => !String(group.description || "").trim()
    ),
    organizationsTotal: organizations.length,
    activeFiltersCount,
    filters,
  };
}

function getLearningGroupOperationsDiagnostics({
  operationsStats,
  loading,
  showCreateForm,
  selectedGroup,
  selectedGroupLoading,
  selectedGroupError,
}) {
  const items = [];

  if (loading) {
    items.push("Загрузка: реестр учебных групп сейчас обновляется.");
  }

  if (!loading && operationsStats.displayed === 0) {
    items.push("Реестр: по текущим фильтрам учебные группы не найдены.");
  }

  if (operationsStats.activeFiltersCount > 0) {
    items.push(`Фильтры: включено активных фильтров - ${operationsStats.activeFiltersCount}.`);
  }

  if (operationsStats.inactive > 0) {
    items.push("Статус: есть неактивные учебные группы.");
  }

  if (operationsStats.organizationsTotal === 0) {
    items.push("Организации: нет доступных организаций для создания учебных групп.");
  }

  if (operationsStats.withoutOrganization > 0) {
    items.push("Организация: часть групп не привязана к организации.");
  }

  if (operationsStats.withoutCode > 0) {
    items.push("Код группы: часть групп не имеет кода.");
  }

  if (operationsStats.withoutDescription > 0) {
    items.push("Описание: часть групп не имеет описания.");
  }

  if (showCreateForm) {
    items.push("Создание: открыта форма создания учебной группы.");
  }

  if (selectedGroupLoading) {
    items.push("Карточка группы: загружается детальная информация.");
  }

  if (selectedGroupError) {
    items.push("Карточка группы: последняя загрузка завершилась ошибкой.");
  }

  if (selectedGroup) {
    items.push("Карточка группы: открыта выбранная учебная группа.");
  }

  return [...new Set(items)];
}

function LearningGroupOperationsDiagnostics({
  operationsStats,
  diagnostics,
}) {
  return (
    <SectionCard
      title="Диагностика операционного центра учебных групп"
      subtitle="Контроль активных и неактивных групп, организаций, кодов, описаний, участников, назначений, документов и аудита"
    >
      <div data-testid="learning-group-operations-diagnostics" className="space-y-5">
        <div
          data-testid="learning-group-operations-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Всего / найдено / показано
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {operationsStats.total} / {operationsStats.matched} / {operationsStats.displayed}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Активные / неактивные
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {operationsStats.active} / {operationsStats.inactive}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Организации
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {operationsStats.organizationsTotal}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Активные фильтры
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {operationsStats.activeFiltersCount}
            </div>
          </div>
        </div>

        <div
          data-testid="learning-group-operations-quality"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              С организацией / без
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {operationsStats.withOrganization} / {operationsStats.withoutOrganization}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Без кода
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {operationsStats.withoutCode}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Без описания
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {operationsStats.withoutDescription}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              К массовому назначению
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {operationsStats.active}
            </div>
          </div>
        </div>

        <div
          data-testid="learning-group-operations-attention"
          className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${
            diagnostics.length
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-green-50 text-green-800 ring-green-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">
              Что требует внимания в учебных группах
            </div>
            <span
              data-testid="learning-group-operations-attention-count"
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              Пунктов диагностики: {diagnostics.length}
            </span>
          </div>

          {diagnostics.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {diagnostics.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">
              Критичных замечаний по учебным группам не найдено.
            </p>
          )}
        </div>

        <div
          data-testid="learning-group-operations-links"
          className="flex flex-wrap gap-3"
        >
          <Link
            to={buildGroupsPath({ status: "active" })}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Активные группы
          </Link>

          <Link
            to={buildGroupsPath({ status: "inactive" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Неактивные группы
          </Link>

          <Link
            to={buildOrganizationsPath()}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Организации
          </Link>

          <Link
            to={buildUsersPath()}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Пользователи
          </Link>

          <Link
            to={buildEnrollmentsPath({ action_required: "true" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Проблемные назначения
          </Link>

          <Link
            to={buildDocumentsPath({ action_required: "true" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Проблемные документы
          </Link>

          <Link
            to={buildAuditPath({ entity_type: "learning_group" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Аудит групп
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}

function LearningGroupForm({
  organizations,
  initialValues = EMPTY_GROUP,
  submitLabel = "Сохранить",
  successMessage = "Группа сохранена.",
  errorMessage = GROUP_API_ERROR_MESSAGES.saveFailed,
  onSubmit,
  onCancel,
  onSuccess,
}) {
  const [values, setValues] = useState(() => normalizeInitialValues(initialValues));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sortedOrganizations = useMemo(
    () => [...organizations].sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    [organizations]
  );

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = buildGroupPayload(values);
      const result = await onSubmit(payload);

      setSuccess(successMessage);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(formatGroupApiError(err, errorMessage));
    } finally {
      setLoading(false);
    }
  }

  const isInvalid = !values.organization_id || !values.name.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert title="Не удалось сохранить группу" tone="red">
          {error}
        </Alert>
      )}

      {success && (
        <Alert title="Готово" tone="blue">
          {success}
        </Alert>
      )}

      {sortedOrganizations.length === 0 && (
        <Alert title="Нет организаций" tone="amber">
          Сначала создайте организацию, затем добавьте группу.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Организация" required>
          <select
            value={values.organization_id}
            onChange={(event) => updateField("organization_id", event.target.value)}
            className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
            disabled={loading || sortedOrganizations.length === 0}
            required
          >
            <option value="">Выберите организацию</option>
            {sortedOrganizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Название группы" required>
          <TextInput
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Например, Группа 1"
            maxLength={255}
            disabled={loading}
            required
          />
        </Field>

        <Field label="Код группы">
          <TextInput
            value={values.code}
            onChange={(event) => updateField("code", event.target.value)}
            placeholder="Например, group-1"
            maxLength={64}
            disabled={loading}
          />
        </Field>

        <Field label="Статус">
          <label className="flex h-[50px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(event) => updateField("is_active", event.target.checked)}
              disabled={loading}
            />
            <span>Группа активна</span>
          </label>
        </Field>
      </div>

      <Field label="Описание">
        <textarea
          value={values.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Описание группы"
          maxLength={1024}
          disabled={loading}
          className={TEXTAREA_CLASS}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <ActionButton type="submit" tone="blue" disabled={loading || isInvalid}>
          {loading ? "Сохраняем..." : submitLabel}
        </ActionButton>

        {onCancel && (
          <ActionButton type="button" tone="light" onClick={onCancel} disabled={loading}>
            Отмена
          </ActionButton>
        )}
      </div>
    </form>
  );
}

function LearningGroupMembersPanel({ groupDetail }) {
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function reloadMemberData() {
    if (!groupDetail?.id) {
      setMembers([]);
      setUsers([]);
      setSelectedUserId("");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const [loadedMembers, loadedUsers] = await Promise.all([
        getOrgLearningGroupMembers(groupDetail.id),
        getAdminUsers(),
      ]);

      setMembers(Array.isArray(loadedMembers) ? loadedMembers : []);
      setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
      setSelectedUserId("");
    } catch (err) {
      setError(formatGroupApiError(err, GROUP_API_ERROR_MESSAGES.membersLoadFailed));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadMemberData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupDetail?.id]);

  const memberUserIds = useMemo(
    () => new Set(members.map((member) => member.user_id)),
    [members]
  );

  const availableUsers = useMemo(
    () =>
      users
        .filter((item) => !memberUserIds.has(item.id))
        .sort((left, right) => buildUserLabel(left).localeCompare(buildUserLabel(right), "ru-RU")),
    [users, memberUserIds]
  );

  async function handleAddMember(event) {
    event.preventDefault();

    if (!selectedUserId || !groupDetail?.id) {
      return;
    }

    setActionLoading("add");
    setError("");
    setSuccess("");

    try {
      const created = await addOrgLearningGroupMember(groupDetail.id, {
        user_id: selectedUserId,
      });

      setMembers((current) =>
        [...current.filter((member) => member.user_id !== created.user_id), created].sort((left, right) =>
          left.user_email.localeCompare(right.user_email, "ru-RU")
        )
      );
      setSelectedUserId("");
      setSuccess("Участник добавлен в группу.");
    } catch (err) {
      setError(formatGroupApiError(err, GROUP_API_ERROR_MESSAGES.addMemberFailed));
    } finally {
      setActionLoading("");
    }
  }

  async function handleRemoveMember(userId, userEmail) {
    const confirmed = window.confirm(
      `Удалить участника ${userEmail || userId} из группы?`
    );

    if (!confirmed || !groupDetail?.id) {
      return;
    }

    setActionLoading(userId);
    setError("");
    setSuccess("");

    try {
      await removeOrgLearningGroupMember(groupDetail.id, userId);
      setMembers((current) => current.filter((member) => member.user_id !== userId));
      setSuccess("Участник удалён из группы.");
    } catch (err) {
      setError(formatGroupApiError(err, GROUP_API_ERROR_MESSAGES.removeMemberFailed));
    } finally {
      setActionLoading("");
    }
  }

  if (!groupDetail) {
    return null;
  }

  return (
    <SectionCard
      title="Участники группы"
      subtitle="Список пользователей, закреплённых за выбранной учебной группой."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <form onSubmit={handleAddMember} className="grid flex-1 gap-3 md:grid-cols-[1fr_auto]">
            <Field label="Добавить пользователя">
              <select
                value={selectedUserId}
                onChange={(event) => {
                  setSelectedUserId(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                disabled={loading || actionLoading === "add" || availableUsers.length === 0}
              >
                <option value="">
                  {availableUsers.length === 0
                    ? "Нет доступных пользователей для добавления"
                    : "Выберите пользователя"}
                </option>
                {availableUsers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {buildUserLabel(item)}
                  </option>
                ))}
              </select>
            </Field>

            <ActionButton
              type="submit"
              tone="blue"
              disabled={loading || actionLoading === "add" || !selectedUserId}
            >
              {actionLoading === "add" ? "Добавляем..." : "Добавить участника"}
            </ActionButton>
          </form>

          <ActionButton
            type="button"
            tone="light"
            onClick={reloadMemberData}
            disabled={loading || Boolean(actionLoading)}
          >
            Обновить
          </ActionButton>
        </div>

        {error && (
          <Alert title="Не удалось выполнить действие с участниками" tone="red">
            {error}
          </Alert>
        )}

        {success && (
          <Alert title="Готово" tone="blue">
            {success}
          </Alert>
        )}

        {loading ? (
          <LoadingBlock text="Загружаем участников группы..." />
        ) : (
          <SmallTable
            emptyText="В этой группе пока нет участников."
            rows={members}
            minWidth="820px"
            columns={[
              {
                key: "user",
                title: "Пользователь",
                render: (row) => (
                  <div>
                    <div className="font-medium text-slate-900">{row.user_email}</div>
                    <div className="text-xs text-slate-500">{row.user_id}</div>
                  </div>
                ),
              },
              {
                key: "full_name",
                title: "ФИО",
                render: (row) => row.user_full_name || "—",
              },
              {
                key: "status",
                title: "Статус",
                render: (row) => (
                  <StatusBadge tone={row.user_is_active ? "green" : "gray"}>
                    {row.user_is_active ? "active" : "inactive"}
                  </StatusBadge>
                ),
              },
              {
                key: "created_at",
                title: "Добавлен",
                render: (row) => formatDetailDate(row.created_at),
              },
              {
                key: "actions",
                title: "Действия",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={buildUsersPath({ q: row.user_email })}
                      className={TABLE_LINK_CLASS}
                    >
                      Пользователь
                    </Link>

                    <Link
                      to={buildDocumentsPath({ user_id: row.user_id })}
                      className={TABLE_LINK_CLASS}
                    >
                      Документы
                    </Link>

                    <Link
                      to={buildEnrollmentsPath({ user_id: row.user_id })}
                      className={TABLE_LINK_CLASS}
                    >
                      Назначения
                    </Link>

                    <ActionButton
                      type="button"
                      tone="red"
                      onClick={() => handleRemoveMember(row.user_id, row.user_email)}
                      disabled={Boolean(actionLoading)}
                    >
                      {actionLoading === row.user_id ? "Удаляем..." : "Удалить"}
                    </ActionButton>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>
    </SectionCard>
  );
}

function LearningGroupDetailPanel({
  groupDetail,
  organizations,
  loading,
  error,
  onClose,
  onUpdateGroup,
  onDeleteGroup,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const organizationsMap = useMemo(() => buildOrganizationsMap(organizations), [organizations]);
  const groupAttentionItems = getGroupAttentionItems(groupDetail, organizationsMap);

  function handleClose() {
    setIsEditing(false);
    setActionError("");
    onClose();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Удалить группу? Действие нельзя отменить."
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setActionError("");

    try {
      await onDeleteGroup(groupDetail.id);
      setIsEditing(false);
    } catch (err) {
      setActionError(formatGroupApiError(err, GROUP_API_ERROR_MESSAGES.deleteFailed));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SectionCard
      title="Карточка группы"
      subtitle="Детальные данные из GET /api/v1/org/groups/{group_id}."
    >
      {!groupDetail && !loading && !error && (
        <p className="text-sm text-slate-600">
          Выберите группу в таблице, чтобы открыть карточку.
        </p>
      )}

      {loading && <LoadingBlock text="Загружаем карточку группы..." />}

      {error && (
        <Alert title="Не удалось загрузить группу" tone="red">
          {error}
        </Alert>
      )}

      {groupDetail && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {groupDetail.name}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Организация: {organizationsMap[groupDetail.organization_id] || groupDetail.organization_id}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isEditing && (
                <ActionButton
                  type="button"
                  tone="blue"
                  onClick={() => setIsEditing(true)}
                >
                  Редактировать
                </ActionButton>
              )}

              {!isEditing && (
                <ActionButton
                  type="button"
                  tone="red"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Удаляем..." : "Удалить"}
                </ActionButton>
              )}

              {!isEditing && (
                <Link
                  to={buildOrganizationsPath({
                    q: organizationsMap[groupDetail.organization_id] || groupDetail.organization_id,
                  })}
                  className={SECONDARY_LINK_CLASS}
                >
                  Организация
                </Link>
              )}

              {!isEditing && (
                <Link
                  to={buildGroupEnrollmentsHref(groupDetail.id)}
                  className={ENROLLMENTS_LINK_CLASS}
                >
                  Назначения
                </Link>
              )}

              <ActionButton
                type="button"
                tone="light"
                onClick={handleClose}
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
            <LearningGroupForm
              organizations={organizations}
              initialValues={groupDetail}
              submitLabel="Сохранить изменения"
              successMessage="Группа обновлена."
              errorMessage={GROUP_API_ERROR_MESSAGES.updateFailed}
              onSubmit={(payload) => onUpdateGroup(groupDetail.id, payload)}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => setIsEditing(false)}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="blue">group</StatusBadge>
                <StatusBadge tone={groupDetail.is_active ? "green" : "gray"}>
                  {groupDetail.is_active ? "active" : "inactive"}
                </StatusBadge>
                <StatusBadge tone={groupDetail.code ? "green" : "gray"}>
                  code: {groupDetail.code ? "filled" : "empty"}
                </StatusBadge>
              </div>

              {groupAttentionItems.length > 0 && (
                <div
                  data-testid="group-attention-diagnostics"
                  className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">
                      Что требует внимания в группе
                    </div>
                    <span
                      data-testid="group-attention-count"
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                    >
                      Пунктов внимания: {groupAttentionItems.length}
                    </span>
                  </div>
                  <p
                    data-testid="group-attention-diagnostics-note"
                    className="mt-2 leading-6"
                  >
                    Диагностика основана на статусе, коде, организации и описании группы.
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {groupAttentionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                data-testid="group-related-records-links"
                className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"
              >
                <div className="font-semibold text-slate-900">
                  Связанные записи группы
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Быстрые переходы к организации, назначениям и документам, связанным с выбранной группой.
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    data-testid="group-organization-link"
                    to={buildOrganizationsPath({
                      q: organizationsMap[groupDetail.organization_id] || groupDetail.organization_id,
                    })}
                    className={SECONDARY_LINK_CLASS}
                  >
                    Организация группы
                  </Link>

                  <Link
                    data-testid="group-enrollments-link"
                    to={buildGroupEnrollmentsHref(groupDetail.id)}
                    className={ENROLLMENTS_LINK_CLASS}
                  >
                    Назначения группы
                  </Link>

                  <Link
                    data-testid="group-action-required-enrollments-link"
                    to={buildEnrollmentsPath({
                      learning_group_id: groupDetail.id,
                      action_required: "true",
                    })}
                    className="inline-flex items-center justify-center rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                  >
                    Проблемные назначения
                  </Link>

                  <Link
                    data-testid="group-action-required-documents-link"
                    to={buildDocumentsPath({
                      learning_group_id: groupDetail.id,
                      action_required: "true",
                    })}
                    className="inline-flex items-center justify-center rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                  >
                    Проблемные документы
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailField label="ID" value={groupDetail.id} />
                <DetailField
                  label="Организация"
                  value={organizationsMap[groupDetail.organization_id] || groupDetail.organization_id}
                />
                <DetailField label="Название" value={groupDetail.name} />
                <DetailField label="Код" value={groupDetail.code} />
                <DetailField label="Создана" value={formatDetailDate(groupDetail.created_at)} />
                <DetailField label="Обновлена" value={formatDetailDate(groupDetail.updated_at)} />
              </div>

              <DetailField label="Описание" value={groupDetail.description} />
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}

export function GroupsPage({
  user,
  groups,
  organizations,
  loading,
  selectedGroup,
  selectedGroupLoading,
  selectedGroupError,
  onOpenGroup,
  onCloseGroup,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onRefreshAdminData,
  onRefreshGroups,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getGroupFiltersFromSearch(location.search);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilters.q);
  const [organizationFilter, setOrganizationFilter] = useState(initialFilters.organization_id);
  const [statusFilter, setStatusFilter] = useState(initialFilters.status);

  const organizationsMap = useMemo(() => buildOrganizationsMap(organizations), [organizations]);
  const sortedOrganizations = useMemo(
    () => [...organizations].sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    [organizations]
  );

  useEffect(() => {
    const nextFilters = getGroupFiltersFromSearch(location.search);

    setSearchQuery(nextFilters.q);
    setOrganizationFilter(nextFilters.organization_id);
    setStatusFilter(nextFilters.status);
  }, [location.search]);

  const baseFilteredGroups = useMemo(
    () => groups.filter((group) => (
      groupMatchesSearch(group, searchQuery, organizationsMap[group.organization_id] || "")
      && groupMatchesOrganization(group, organizationFilter)
    )),
    [groups, searchQuery, organizationFilter, organizationsMap]
  );

  const groupCounts = useMemo(() => calculateGroupCounts(baseFilteredGroups), [baseFilteredGroups]);

  const filteredGroups = useMemo(
    () => baseFilteredGroups.filter((group) => groupMatchesStatus(group, statusFilter)),
    [baseFilteredGroups, statusFilter]
  );

  const hasActiveFilters =
    Boolean(searchQuery.trim()) || organizationFilter !== "all" || statusFilter !== "all";

  const learningGroupOperationsFilters = useMemo(
    () => ({
      q: searchQuery,
      organization_id: organizationFilter,
      status: statusFilter,
    }),
    [searchQuery, organizationFilter, statusFilter]
  );

  const learningGroupOperationsStats = useMemo(
    () =>
      getLearningGroupOperationsStats({
        groups,
        filteredGroups,
        groupCounts,
        organizations,
        filters: learningGroupOperationsFilters,
      }),
    [groups, filteredGroups, groupCounts, organizations, learningGroupOperationsFilters]
  );

  const learningGroupOperationsDiagnostics = useMemo(
    () =>
      getLearningGroupOperationsDiagnostics({
        operationsStats: learningGroupOperationsStats,
        loading,
        showCreateForm,
        selectedGroup,
        selectedGroupLoading,
        selectedGroupError,
      }),
    [
      learningGroupOperationsStats,
      loading,
      showCreateForm,
      selectedGroup,
      selectedGroupLoading,
      selectedGroupError,
    ]
  );

  function buildGroupFilters(overrides = {}) {
    return {
      q: overrides.q ?? searchQuery,
      organization_id: overrides.organization_id ?? organizationFilter,
      status: overrides.status ?? statusFilter,
    };
  }

  function navigateToGroupFilters(filters, options = { replace: true }) {
    const nextPath = buildGroupsPath(filters);
    const currentPath = `${location.pathname}${location.search}`;

    if (currentPath === nextPath) {
      return;
    }

    navigate(nextPath, options);
  }

  function handleSearchChange(value) {
    setSearchQuery(value);
    navigateToGroupFilters(buildGroupFilters({ q: value }));
  }

  function handleOrganizationChange(value) {
    setOrganizationFilter(value);
    navigateToGroupFilters(buildGroupFilters({ organization_id: value }));
  }

  function handleStatusChange(value) {
    setStatusFilter(value);
    navigateToGroupFilters(buildGroupFilters({ status: value }));
  }

  function resetFilters() {
    setSearchQuery("");
    setOrganizationFilter("all");
    setStatusFilter("all");
    navigateToGroupFilters({}, { replace: true });
  }

  function refreshGroupsFastPath() {
    if (onRefreshGroups) {
      onRefreshGroups();
      return;
    }

    onRefreshAdminData();
  }

  function handleExportGroupsCsv() {
    const rows = filteredGroups.map((group) => ({
      id: group.id,
      name: group.name || "",
      code: group.code || "",
      organization_name: organizationsMap[group.organization_id] || "",
      organization_id: group.organization_id || "",
      is_active: group.is_active ? "yes" : "no",
      description: group.description || "",
      created_at: group.created_at || "",
      updated_at: group.updated_at || "",
    }));

    downloadCsvFile(
      buildDatedCsvFilename("obrportal-admin-groups"),
      GROUP_CSV_EXPORT_COLUMNS,
      rows
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Группы обучающихся"
        subtitle="Справочник групп организаций из /api/v1/org/groups."
      >
        {!user ? (
          <p className="text-slate-600">
            Войдите под admin, чтобы увидеть группы.
          </p>
        ) : (
          <div className="space-y-5">
            <AdminPageActions
              loading={loading}
              onRefresh={refreshGroupsFastPath}
              primaryLabel={showCreateForm ? "Скрыть форму" : "Добавить группу"}
              primaryTone={showCreateForm ? "light" : "blue"}
              onPrimaryClick={() => setShowCreateForm((current) => !current)}
            />

            {showCreateForm && (
              <AdminCreatePanel
                title="Новая группа"
                subtitle="Группа привязывается к существующей организации."
              >
                <LearningGroupForm
                  organizations={organizations}
                  submitLabel="Создать группу"
                  successMessage="Группа создана."
                  errorMessage={GROUP_API_ERROR_MESSAGES.createFailed}
                  onSubmit={onCreateGroup}
                  onCancel={() => setShowCreateForm(false)}
                  onSuccess={() => setShowCreateForm(false)}
                />
              </AdminCreatePanel>
            )}

            <AdminFilterPanel
              columnsClassName="lg:grid-cols-[1fr_300px_220px_auto]"
              onReset={resetFilters}
              resetDisabled={!hasActiveFilters}
              summary={getShownSummary(filteredGroups.length, groups.length)}
            >
              <AdminFilterField label="Поиск" className="block space-y-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Название, код, описание или организация"
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                />
              </AdminFilterField>

              <AdminFilterField label="Организация" className="block space-y-2">
                <select
                  value={organizationFilter}
                  onChange={(event) => handleOrganizationChange(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                >
                  <option value="all">Все организации</option>
                  {sortedOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </AdminFilterField>

              <AdminFilterField label="Статус" className="block space-y-2">
                <select
                  value={statusFilter}
                  onChange={(event) => handleStatusChange(event.target.value)}
                  className={ADMIN_FILTER_CONTROL_SOFT_CLASS}
                >
                  <option value="all">Все статусы</option>
                  <option value="active">Только активные</option>
                  <option value="inactive">Только неактивные</option>
                </select>
              </AdminFilterField>
            </AdminFilterPanel>

            <AdminQuickFilterButtons
              items={GROUP_STATUS_FILTERS}
              activeValue={statusFilter}
              counts={groupCounts}
              disabled={loading}
              onChange={handleStatusChange}
              getCount={(item, counts) =>
                item.value === "active"
                  ? counts.active || 0
                  : item.value === "inactive"
                    ? counts.inactive || 0
                    : counts.all || 0}
            />

            <div
              data-testid="admin-groups-export-summary"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">Экспорт групп</div>
                <p className="mt-1 text-xs text-slate-600">
                  CSV содержит текущую выборку после поиска, фильтра организации и статуса:
                  {" "}{filteredGroups.length} из {groups.length}.
                </p>
              </div>

              <ActionButton
                type="button"
                tone="light"
                onClick={handleExportGroupsCsv}
                disabled={loading || filteredGroups.length === 0}
                data-testid="admin-groups-export-csv-button"
              >
                Скачать CSV
              </ActionButton>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <span>Показано групп: {filteredGroups.length}</span>
              <span>Всего по текущему поиску и организации: {groupCounts.all || 0}</span>
            </div>

            <LearningGroupOperationsDiagnostics
              operationsStats={learningGroupOperationsStats}
              diagnostics={learningGroupOperationsDiagnostics}
            />

            {loading ? (
              <LoadingBlock text="Загружаем группы..." />
            ) : (
              <SmallTable
                emptyText={getFilteredEmptyText(
                  hasActiveFilters,
                  "Групп по фильтру нет.",
                  "Групп пока нет."
                )}
                rows={filteredGroups}
                selectedRowId={selectedGroup?.id}
                minWidth="980px"
                columns={[
                  { key: "name", title: "Название" },
                  {
                    key: "organization",
                    title: "Организация",
                    render: (row) => organizationsMap[row.organization_id] || row.organization_id,
                  },
                  { key: "code", title: "Код" },
                  {
                    key: "status",
                    title: "Статус",
                    render: (row) => (
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge tone="blue">group</StatusBadge>
                        <StatusBadge tone={row.is_active ? "green" : "gray"}>
                          {row.is_active ? "active" : "inactive"}
                        </StatusBadge>
                      </div>
                    ),
                  },
                  {
                    key: "actions",
                    title: "Действия",
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => onOpenGroup(row.id)}
                          disabled={selectedGroupLoading}
                        >
                          {selectedGroup?.id === row.id ? "Открыта" : "Открыть"}
                        </ActionButton>

                        <Link
                          to={buildOrganizationsPath({
                            q: organizationsMap[row.organization_id] || row.organization_id,
                          })}
                          className={TABLE_LINK_CLASS}
                        >
                          Организация
                        </Link>

                        <Link
                          to={buildGroupEnrollmentsHref(row.id)}
                          className={ENROLLMENTS_LINK_CLASS}
                        >
                          Назначения
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </SectionCard>

      {user && (
        <LearningGroupDetailPanel
          groupDetail={selectedGroup}
          organizations={organizations}
          loading={selectedGroupLoading}
          error={selectedGroupError}
          onClose={onCloseGroup}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={onDeleteGroup}
        />
      )}

      {user && selectedGroup && !selectedGroupLoading && !selectedGroupError && (
        <LearningGroupMembersPanel groupDetail={selectedGroup} />
      )}
    </div>
  );
}
