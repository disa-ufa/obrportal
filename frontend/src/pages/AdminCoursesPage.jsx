import { getApiErrorMessage, getApiErrorStatus, getSafeApiErrorMessage } from "../utils/apiErrors";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  activateAdminCourse,
  createAdminCourse,
  createAdminCourseLesson,
  createAdminCourseModule,
  deactivateAdminCourse,
  deleteAdminCourse,
  deleteAdminCourseLesson,
  deleteAdminCourseModule,
  getAdminCourseLessons,
  getAdminCourseModules,
  getAdminCourses,
  updateAdminCourse,
  updateAdminCourseLesson,
  updateAdminCourseModule,
} from "../api/client";
import { formatRuDateTime as formatDateTime } from "../utils/dateFormat";
import { AdminCreatePanel } from "../components/admin/AdminCreatePanel";
import { AdminEmptyState } from "../components/admin/AdminEmptyState";
import { AdminMetricCard } from "../components/admin/AdminWorkCenter";
import { AdminFilterField } from "../components/admin/AdminFilterField";
import { AdminFilterPanel } from "../components/admin/AdminFilterPanel";
import { AdminPageActions } from "../components/admin/AdminPageActions";
import { AdminQuickFilterButtons } from "../components/admin/AdminQuickFilterButtons";
import { AdminActiveFiltersSummary } from "../components/admin/AdminActiveFiltersSummary";
import { ActionButton } from "../components/ui/ActionButton";
import { Alert } from "../components/ui/Alert";
import { LoadingBlock } from "../components/ui/LoadingBlock";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { buildAuditPath, buildCoursesPath, buildDocumentsPath, buildEnrollmentsPath } from "../utils/adminLinks";
import { ADMIN_FILTER_CONTROL_SOFT_CLASS } from "../utils/adminClasses";
import { getFilteredEmptyText, getShownSummary } from "../utils/tableText";
import { buildDatedCsvFilename, downloadCsvFile } from "../utils/exportCsv";

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
  courseModules: "\u041c\u043e\u0434\u0443\u043b\u0438 \u043a\u0443\u0440\u0441\u0430",
  courseModulesHint:
    "\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b: \u043f\u043e\u0440\u044f\u0434\u043e\u043a, \u0441\u0442\u0430\u0442\u0443\u0441 \u0438 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043c\u043e\u0434\u0443\u043b\u0435\u0439.",
  modulesNotFound: "\u041c\u043e\u0434\u0443\u043b\u0438 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u044b.",
  moduleNumber: "\u041c\u043e\u0434\u0443\u043b\u044c",
  moduleActive: "\u0410\u043a\u0442\u0438\u0432\u0435\u043d",
  moduleInactive: "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u0435\u043d",
  moduleDescriptionMissing: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043d\u0435 \u0437\u0430\u0434\u0430\u043d\u043e.",
  courseLessons: "\u0423\u0440\u043e\u043a\u0438 \u043c\u043e\u0434\u0443\u043b\u044f",
  courseLessonsHint:
    "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0438 \u0437\u0430\u043d\u044f\u0442\u0438\u044f, \u0438\u0437 \u043a\u043e\u0442\u043e\u0440\u044b\u0445 \u0441\u043e\u0441\u0442\u043e\u0438\u0442 \u043c\u043e\u0434\u0443\u043b\u044c.",
  lessonsNotFound: "\u0423\u0440\u043e\u043a\u0438 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u044b.",
  lessonNumber: "\u0423\u0440\u043e\u043a",
  lessonRequired: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439",
  lessonOptional: "\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439",
  lessonDescriptionMissing: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0443\u0440\u043e\u043a\u0430 \u043d\u0435 \u0437\u0430\u0434\u0430\u043d\u043e.",
  lessonContentUrl: "\u0421\u0441\u044b\u043b\u043a\u0430",
  lessonContentText: "\u0422\u0435\u043a\u0441\u0442",
  lessonTypeText: "\u0422\u0435\u043a\u0441\u0442",
  lessonTypeVideo: "\u0412\u0438\u0434\u0435\u043e",
  lessonTypeFile: "\u0424\u0430\u0439\u043b",
  lessonTypeLink: "\u0421\u0441\u044b\u043b\u043a\u0430",
  lessonTypeAssignment: "\u0417\u0430\u0434\u0430\u043d\u0438\u0435",
  addLesson: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0443\u0440\u043e\u043a",
  createLesson: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0443\u0440\u043e\u043a",
  lessonTitle: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0443\u0440\u043e\u043a\u0430",
  lessonTitlePlaceholder: "\u0412\u0432\u043e\u0434\u043d\u044b\u0439 \u0443\u0440\u043e\u043a",
  lessonDescription: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0443\u0440\u043e\u043a\u0430",
  lessonDescriptionPlaceholder: "\u041a\u0440\u0430\u0442\u043a\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0437\u0430\u043d\u044f\u0442\u0438\u044f",
  lessonContentType: "\u0422\u0438\u043f \u043a\u043e\u043d\u0442\u0435\u043d\u0442\u0430",
  lessonContentUrlPlaceholder: "https://example.com/material",
  lessonContentTextPlaceholder: "\u0422\u0435\u043a\u0441\u0442 \u0443\u0440\u043e\u043a\u0430 \u0438\u043b\u0438 \u0438\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u044f",
  lessonPosition: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f",
  lessonCreatedMessage: "\u0423\u0440\u043e\u043a \u0441\u043e\u0437\u0434\u0430\u043d",
  lessonUpdatedMessage: "\u0423\u0440\u043e\u043a \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d",
  lessonDeletedMessage: "\u0423\u0440\u043e\u043a \u0443\u0434\u0430\u043b\u0451\u043d",
  lessonCreateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0443\u0440\u043e\u043a.",
  lessonUpdateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0443\u0440\u043e\u043a.",
  lessonDeleteFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0443\u0440\u043e\u043a.",
  lessonTitleRequired: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0443\u0440\u043e\u043a\u0430.",
  lessonPositionRequired: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u0443\u0440\u043e\u043a\u0430.",
  lessonPositionDuplicate: "\u0423\u0440\u043e\u043a \u0441 \u0442\u0430\u043a\u043e\u0439 \u043f\u043e\u0437\u0438\u0446\u0438\u0435\u0439 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u0432 \u044d\u0442\u043e\u043c \u043c\u043e\u0434\u0443\u043b\u0435.",
  lessonIsRequiredLabel: "\u0423\u0440\u043e\u043a \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d \u0434\u043b\u044f \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u044f",
  addModule: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043c\u043e\u0434\u0443\u043b\u044c",
  createModule: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043c\u043e\u0434\u0443\u043b\u044c",
  moduleTitle: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043c\u043e\u0434\u0443\u043b\u044f",
  moduleTitlePlaceholder: "\u0412\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u0432 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443",
  moduleDescription: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043c\u043e\u0434\u0443\u043b\u044f",
  moduleDescriptionPlaceholder: "\u041a\u0440\u0430\u0442\u043a\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0442\u0435\u043c \u0438 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432",
  modulePosition: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f",
  moduleCreatedMessage: "\u041c\u043e\u0434\u0443\u043b\u044c \u0441\u043e\u0437\u0434\u0430\u043d",
  moduleUpdatedMessage: "\u041c\u043e\u0434\u0443\u043b\u044c \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d",
  moduleDeletedMessage: "\u041c\u043e\u0434\u0443\u043b\u044c \u0443\u0434\u0430\u043b\u0451\u043d",
  moduleCreateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043c\u043e\u0434\u0443\u043b\u044c.",
  moduleUpdateFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043c\u043e\u0434\u0443\u043b\u044c.",
  moduleDeleteFailed: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043c\u043e\u0434\u0443\u043b\u044c.",
  moduleDeleteConfirmPrefix: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043c\u043e\u0434\u0443\u043b\u044c",
  moduleTitleRequired: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043c\u043e\u0434\u0443\u043b\u044f.",
  modulePositionRequired: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u043c\u043e\u0434\u0443\u043b\u044f.",
  modulePositionDuplicate: "\u041c\u043e\u0434\u0443\u043b\u044c \u0441 \u0442\u0430\u043a\u043e\u0439 \u043f\u043e\u0437\u0438\u0446\u0438\u0435\u0439 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u0432 \u044d\u0442\u043e\u043c \u043a\u0443\u0440\u0441\u0435.",
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
  accessDenied: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430\u043c\u0438.",
  courseNotFound: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430 \u0438\u043b\u0438 \u0443\u0436\u0435 \u0443\u0434\u0430\u043b\u0435\u043d\u0430.",
  courseSlugDuplicate: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u0441 \u0442\u0430\u043a\u0438\u043c slug \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442.",
  courseSlugInvalid: "Slug \u0434\u043e\u043b\u0436\u0435\u043d \u043d\u0430\u0447\u0438\u043d\u0430\u0442\u044c\u0441\u044f \u0441\u043e \u0441\u0442\u0440\u043e\u0447\u043d\u043e\u0439 \u043b\u0430\u0442\u0438\u043d\u0441\u043a\u043e\u0439 \u0431\u0443\u043a\u0432\u044b \u0438\u043b\u0438 \u0446\u0438\u0444\u0440\u044b \u0438 \u0441\u043e\u0434\u0435\u0440\u0436\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u0442\u0440\u043e\u0447\u043d\u044b\u0435 \u043b\u0430\u0442\u0438\u043d\u0441\u043a\u0438\u0435 \u0431\u0443\u043a\u0432\u044b, \u0446\u0438\u0444\u0440\u044b \u0438 \u0434\u0435\u0444\u0438\u0441\u044b.",
  courseDeleteHasEnrollments: "\u041d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443, \u043f\u043e \u043a\u043e\u0442\u043e\u0440\u043e\u0439 \u0443\u0436\u0435 \u0435\u0441\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f\u043c.",
  courseDeleteHasDocuments: "\u041d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443, \u043a \u043a\u043e\u0442\u043e\u0440\u043e\u0439 \u0443\u0436\u0435 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u044b \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b.",
};

const COURSE_ACTIVE_FILTERS = [
  { value: "", label: RU.all },
  { value: "true", label: RU.activePlural },
  { value: "false", label: RU.inactivePlural },
];

const COURSE_CSV_EXPORT_COLUMNS = [
  { key: "id", title: "ID" },
  { key: "slug", title: "Slug" },
  { key: "title", title: "Название" },
  { key: "is_active", title: "Активна" },
  { key: "hours", title: "Объем, часов" },
  { key: "format", title: "Формат" },
  { key: "document_type", title: "Итоговый документ" },
  { key: "modules_count", title: "Модулей" },
  { key: "lessons_count", title: "Уроков" },
  { key: "public_url", title: "Публичная карточка" },
  { key: "description", title: "Описание" },
  { key: "created_at", title: "Создана" },
  { key: "updated_at", title: "Обновлена" },
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

const EMPTY_MODULE_CREATE_FORM = {
  title: "",
  description: "",
  position: "",
  is_active: true,
};

const EMPTY_LESSON_CREATE_FORM = {
  title: "",
  description: "",
  content_type: "text",
  content_url: "",
  content_text: "",
  position: "",
  is_required: true,
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
function formatCourseApiError(err, fallback) {
  const status = getApiErrorStatus(err);
  const message = getApiErrorMessage(err);
  const safeMessage = getSafeApiErrorMessage(message, fallback);
  const normalizedMessage = message.toLowerCase();

  let readableMessage = fallback;

  if (status === "403") {
    readableMessage = RU.accessDenied;
  } else if (status === "404") {
    readableMessage = RU.courseNotFound;
  } else if (status === "409" && normalizedMessage.includes("slug")) {
    readableMessage = RU.courseSlugDuplicate;
  } else if (status === "400" && normalizedMessage.includes("enrollments")) {
    readableMessage = RU.courseDeleteHasEnrollments;
  } else if (status === "400" && normalizedMessage.includes("documents")) {
    readableMessage = RU.courseDeleteHasDocuments;
  } else if (status === "422" && normalizedMessage.includes("slug")) {
    readableMessage = RU.courseSlugInvalid;
  } else if (message) {
    readableMessage = safeMessage;
  }

  return `${status} ${readableMessage}`.trim();
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

function normalizeModulePositionInput(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function buildModuleCreateForm(modules) {
  const nextPosition = Array.isArray(modules)
    ? modules.reduce((maxPosition, module) => Math.max(maxPosition, Number(module.position) || 0), 0) + 1
    : 1;

  return {
    ...EMPTY_MODULE_CREATE_FORM,
    position: `${nextPosition}`,
  };
}

function buildModuleEditForm(module) {
  return {
    title: module.title || "",
    description: module.description || "",
    position: module.position ? `${module.position}` : "",
    is_active: Boolean(module.is_active),
  };
}

function formatCourseModuleApiError(err, fallback) {
  const status = getApiErrorStatus(err);
  const message = getApiErrorMessage(err);
  const safeMessage = getSafeApiErrorMessage(message, fallback);
  const normalizedMessage = message.toLowerCase();

  let readableMessage = fallback;

  if (status === "403") {
    readableMessage = RU.accessDenied;
  } else if (status === "404") {
    readableMessage = RU.courseNotFound;
  } else if (status === "409" && normalizedMessage.includes("position")) {
    readableMessage = RU.modulePositionDuplicate;
  } else if (message) {
    readableMessage = safeMessage;
  }

  return `${status} ${readableMessage}`.trim();
}

function CourseModuleFormFields({ values, onChange, prefix = "" }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_160px]">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.moduleTitle}
        </span>
        <input
          id={`${prefix}module-title`}
          type="text"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder={RU.moduleTitlePlaceholder}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.modulePosition}
        </span>
        <input
          id={`${prefix}module-position`}
          type="number"
          min="1"
          max="10000"
          value={values.position}
          onChange={(event) => onChange("position", event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.moduleDescription}
        </span>
        <textarea
          id={`${prefix}module-description`}
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          rows={3}
          placeholder={RU.moduleDescriptionPlaceholder}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 md:col-span-2">
        <input
          id={`${prefix}module-is-active`}
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

function buildLessonCreateForm(lessons) {
  const nextPosition = Array.isArray(lessons)
    ? lessons.reduce((maxPosition, lesson) => Math.max(maxPosition, Number(lesson.position) || 0), 0) + 1
    : 1;

  return {
    ...EMPTY_LESSON_CREATE_FORM,
    position: `${nextPosition}`,
  };
}

function buildLessonEditForm(lesson) {
  return {
    title: lesson.title || "",
    description: lesson.description || "",
    content_type: lesson.content_type || "text",
    content_url: lesson.content_url || "",
    content_text: lesson.content_text || "",
    position: lesson.position ? `${lesson.position}` : "",
    is_required: Boolean(lesson.is_required),
    is_active: Boolean(lesson.is_active),
  };
}

function formatCourseLessonApiError(err, fallback) {
  const status = getApiErrorStatus(err);
  const message = getApiErrorMessage(err);
  const safeMessage = getSafeApiErrorMessage(message, fallback);
  const normalizedMessage = message.toLowerCase();

  let readableMessage = fallback;

  if (status === "403") {
    readableMessage = RU.accessDenied;
  } else if (status === "404") {
    readableMessage = RU.moduleNotFound || RU.courseNotFound;
  } else if (status === "409" && normalizedMessage.includes("position")) {
    readableMessage = RU.lessonPositionDuplicate;
  } else if (message) {
    readableMessage = safeMessage;
  }

  return `${status} ${readableMessage}`.trim();
}

function getLessonContentTypeLabel(contentType) {
  const normalized = `${contentType || ""}`.toLowerCase();

  const labels = {
    text: RU.lessonTypeText,
    video: RU.lessonTypeVideo,
    file: RU.lessonTypeFile,
    link: RU.lessonTypeLink,
    assignment: RU.lessonTypeAssignment,
  };

  return labels[normalized] || normalized || "-";
}

function CourseLessonFormFields({ values, onChange, prefix = "" }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_180px_140px]">
      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.lessonTitle}
        </span>
        <input
          id={`${prefix}lesson-title`}
          type="text"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder={RU.lessonTitlePlaceholder}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.lessonPosition}
        </span>
        <input
          id={`${prefix}lesson-position`}
          type="number"
          min="1"
          max="10000"
          value={values.position}
          onChange={(event) => onChange("position", event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.lessonContentType}
        </span>
        <select
          id={`${prefix}lesson-content-type`}
          value={values.content_type}
          onChange={(event) => onChange("content_type", event.target.value)}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        >
          <option value="text">{RU.lessonTypeText}</option>
          <option value="video">{RU.lessonTypeVideo}</option>
          <option value="file">{RU.lessonTypeFile}</option>
          <option value="link">{RU.lessonTypeLink}</option>
          <option value="assignment">{RU.lessonTypeAssignment}</option>
        </select>
      </label>

      <label className="block md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.lessonContentUrl}
        </span>
        <input
          id={`${prefix}lesson-content-url`}
          type="text"
          value={values.content_url}
          onChange={(event) => onChange("content_url", event.target.value)}
          placeholder={RU.lessonContentUrlPlaceholder}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block md:col-span-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.lessonDescription}
        </span>
        <textarea
          id={`${prefix}lesson-description`}
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          rows={3}
          placeholder={RU.lessonDescriptionPlaceholder}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block md:col-span-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {RU.lessonContentText}
        </span>
        <textarea
          id={`${prefix}lesson-content-text`}
          value={values.content_text}
          onChange={(event) => onChange("content_text", event.target.value)}
          rows={4}
          placeholder={RU.lessonContentTextPlaceholder}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 md:col-span-3">
        <input
          id={`${prefix}lesson-is-required`}
          type="checkbox"
          checked={values.is_required}
          onChange={(event) => onChange("is_required", event.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="font-semibold">{RU.lessonIsRequiredLabel}</span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 md:col-span-3">
        <input
          id={`${prefix}lesson-is-active`}
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

function countCoursesWhere(items, predicate) {
  return Array.isArray(items) ? items.filter(predicate).length : 0;
}

function getAdminCourseCatalogStats({
  courses,
  courseCounts,
  courseModulesByCourseId,
  courseLessonsByModuleId,
  filters,
}) {
  const allModules = Object.values(courseModulesByCourseId || {}).flat();
  const allLessons = Object.values(courseLessonsByModuleId || {}).flat();
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return {
    total: courseCounts.all || courses.length || 0,
    displayed: courses.length,
    active: courseCounts.active || 0,
    inactive: courseCounts.inactive || 0,
    coursesWithoutModules: countCoursesWhere(
      courses,
      (course) => !(courseModulesByCourseId[course.id] || []).length
    ),
    modulesTotal: allModules.length,
    activeModules: countCoursesWhere(allModules, (module) => module.is_active),
    inactiveModules: countCoursesWhere(allModules, (module) => !module.is_active),
    modulesWithoutLessons: countCoursesWhere(
      allModules,
      (module) => !(courseLessonsByModuleId[module.id] || []).length
    ),
    lessonsTotal: allLessons.length,
    activeLessons: countCoursesWhere(allLessons, (lesson) => lesson.is_active),
    inactiveLessons: countCoursesWhere(allLessons, (lesson) => !lesson.is_active),
    requiredLessons: countCoursesWhere(allLessons, (lesson) => lesson.is_required),
    optionalLessons: countCoursesWhere(allLessons, (lesson) => !lesson.is_required),
    coursesWithPublicCard: countCoursesWhere(courses, (course) => course.slug),
    coursesWithDocumentType: countCoursesWhere(courses, (course) => course.document_type),
    activeFiltersCount,
    filters,
  };
}

function getAdminCourseCatalogDiagnostics({
  catalogStats,
  loading,
  saving,
  actionCourseId,
  editingCourseId,
  showCreateForm,
  moduleCreatingCourseId,
  moduleActionId,
  editingModuleId,
  lessonCreatingModuleId,
  lessonActionId,
  editingLessonId,
  error,
  successMessage,
}) {
  const items = [];

  if (loading) {
    items.push("Загрузка: каталог курсов сейчас обновляется.");
  }

  if (!loading && catalogStats.displayed === 0) {
    items.push("Каталог: по текущим фильтрам курсы не найдены.");
  }

  if (catalogStats.activeFiltersCount > 0) {
    items.push(`Фильтры: включено активных фильтров - ${catalogStats.activeFiltersCount}.`);
  }

  if (catalogStats.inactive > 0) {
    items.push("Публикация: есть неактивные курсы, скрытые из публичного каталога.");
  }

  if (catalogStats.coursesWithoutModules > 0) {
    items.push("Структура: есть курсы без модулей.");
  }

  if (catalogStats.modulesWithoutLessons > 0) {
    items.push("Структура: есть модули без уроков.");
  }

  if (catalogStats.requiredLessons === 0 && catalogStats.lessonsTotal > 0) {
    items.push("Прохождение: в текущей выборке нет обязательных уроков.");
  }

  if (catalogStats.inactiveModules > 0) {
    items.push("Модули: есть неактивные модули.");
  }

  if (catalogStats.inactiveLessons > 0) {
    items.push("Уроки: есть неактивные уроки.");
  }

  if (catalogStats.coursesWithPublicCard < catalogStats.displayed) {
    items.push("Публичный каталог: часть курсов не имеет slug для публичной карточки.");
  }

  if (catalogStats.coursesWithDocumentType < catalogStats.displayed) {
    items.push("Итоговые документы: у части курсов не указан тип итогового документа.");
  }

  if (showCreateForm || saving) {
    items.push("Создание: открыта форма создания курса или выполняется сохранение.");
  }

  if (editingCourseId || actionCourseId) {
    items.push("Курс: выполняется редактирование, активация, деактивация или удаление.");
  }

  if (moduleCreatingCourseId || moduleActionId || editingModuleId) {
    items.push("Модули: выполняется создание, редактирование или удаление модуля.");
  }

  if (lessonCreatingModuleId || lessonActionId || editingLessonId) {
    items.push("Уроки: выполняется создание, редактирование или удаление урока.");
  }

  if (error) {
    items.push("Ошибка: последняя операция с каталогом курсов завершилась ошибкой.");
  }

  if (successMessage) {
    items.push("Готово: последняя операция с курсом, модулем или уроком завершилась успешно.");
  }

  return [...new Set(items)];
}


const COURSE_BUILDER_READINESS_LABELS = {
  stage: "\u041a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440 \u043a\u0443\u0440\u0441\u043e\u0432 \u00b7 \u041a\u0443\u0440\u0441 \u2192 \u041c\u043e\u0434\u0443\u043b\u0438 \u2192 \u0423\u0440\u043e\u043a\u0438",
  title: "\u0413\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c \u043a\u0443\u0440\u0441\u0430 \u043a \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438",
  subtitle: "\u041f\u0430\u043d\u0435\u043b\u044c \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u043c\u043e\u0436\u043d\u043e \u043b\u0438 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e \u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c \u043a\u0443\u0440\u0441 \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u0438 \u043d\u0430\u0437\u043d\u0430\u0447\u0430\u0442\u044c \u0435\u0433\u043e \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f\u043c.",
  publishable: "\u041c\u043e\u0436\u043d\u043e \u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c",
  blocked: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0438",
  checksPassed: "\u041f\u0440\u043e\u0432\u0435\u0440\u043e\u043a \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u043e",
  blockers: "\u0411\u043b\u043e\u043a\u0435\u0440\u044b \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438",
  noBlockers: "\u041a\u0440\u0438\u0442\u0438\u0447\u043d\u044b\u0445 \u0431\u043b\u043e\u043a\u0435\u0440\u043e\u0432 \u043d\u0435\u0442.",
  structure: "\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430",
  modules: "\u041c\u043e\u0434\u0443\u043b\u0438",
  lessons: "\u0423\u0440\u043e\u043a\u0438",
  requiredLessons: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435",
  activeLessons: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
  checklist: "\u0427\u0435\u043a-\u043b\u0438\u0441\u0442",
};

function getCourseBuilderReadiness(course, modules = [], lessonsByModuleId = {}) {
  const courseModules = Array.isArray(modules) ? modules : [];
  const allLessons = courseModules.flatMap((module) =>
    Array.isArray(lessonsByModuleId?.[module.id]) ? lessonsByModuleId[module.id] : []
  );
  const activeModules = courseModules.filter((module) => module.is_active);
  const activeLessons = allLessons.filter((lesson) => lesson.is_active);
  const requiredLessons = allLessons.filter((lesson) => lesson.is_required);
  const activeRequiredLessons = allLessons.filter((lesson) => lesson.is_active && lesson.is_required);

  const checks = [
    {
      key: "slug",
      label: "Slug \u0434\u043b\u044f \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u0439 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438",
      passed: Boolean(`${course.slug || ""}`.trim()),
      blocker: true,
    },
    {
      key: "title",
      label: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b",
      passed: Boolean(`${course.title || ""}`.trim()),
      blocker: true,
    },
    {
      key: "description",
      label: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0434\u043b\u044f \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430",
      passed: Boolean(`${course.description || ""}`.trim()),
      blocker: true,
    },
    {
      key: "format",
      label: "\u0424\u043e\u0440\u043c\u0430\u0442 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
      passed: Boolean(`${course.format || ""}`.trim()),
      blocker: true,
    },
    {
      key: "document_type",
      label: "\u0422\u0438\u043f \u0438\u0442\u043e\u0433\u043e\u0432\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
      passed: Boolean(`${course.document_type || ""}`.trim()),
      blocker: true,
    },
    {
      key: "modules",
      label: "\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u043c\u043e\u0434\u0443\u043b\u044c",
      passed: courseModules.length > 0,
      blocker: true,
    },
    {
      key: "active_modules",
      label: "\u0415\u0441\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u043c\u043e\u0434\u0443\u043b\u044c",
      passed: activeModules.length > 0,
      blocker: true,
    },
    {
      key: "lessons",
      label: "\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u0443\u0440\u043e\u043a",
      passed: allLessons.length > 0,
      blocker: true,
    },
    {
      key: "active_lessons",
      label: "\u0415\u0441\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u0443\u0440\u043e\u043a",
      passed: activeLessons.length > 0,
      blocker: true,
    },
    {
      key: "required_lessons",
      label: "\u0415\u0441\u0442\u044c \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0443\u0440\u043e\u043a",
      passed: requiredLessons.length > 0,
      blocker: true,
    },
    {
      key: "active_required_lessons",
      label: "\u0415\u0441\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439 \u0443\u0440\u043e\u043a",
      passed: activeRequiredLessons.length > 0,
      blocker: true,
    },
  ];

  const passedChecks = checks.filter((check) => check.passed);
  const blockers = checks.filter((check) => check.blocker && !check.passed);
  const readinessPercent = Math.round((passedChecks.length / checks.length) * 100);

  return {
    checks,
    passedChecks,
    blockers,
    readinessPercent,
    publishable: blockers.length === 0,
    modulesTotal: courseModules.length,
    lessonsTotal: allLessons.length,
    activeModules: activeModules.length,
    activeLessons: activeLessons.length,
    requiredLessons: requiredLessons.length,
  };
}

function CourseBuilderReadinessPanel({ course, modules, lessonsByModuleId }) {
  const readiness = getCourseBuilderReadiness(course, modules, lessonsByModuleId);

  return (
    <section
      data-testid="course-builder-readiness-panel"
      className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {COURSE_BUILDER_READINESS_LABELS.stage}
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {COURSE_BUILDER_READINESS_LABELS.title}
          </h3>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
            {COURSE_BUILDER_READINESS_LABELS.subtitle}
          </p>
        </div>

        <StatusBadge tone={readiness.publishable ? "green" : "red"}>
          {readiness.publishable
            ? COURSE_BUILDER_READINESS_LABELS.publishable
            : COURSE_BUILDER_READINESS_LABELS.blocked}
        </StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_READINESS_LABELS.checksPassed}
          </div>
          <div
            data-testid="course-builder-readiness-score"
            className="mt-2 text-2xl font-bold text-slate-900"
          >
            {readiness.passedChecks.length}/{readiness.checks.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {readiness.readinessPercent}%
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_READINESS_LABELS.modules}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {readiness.activeModules}/{readiness.modulesTotal}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_READINESS_LABELS.lessons}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {readiness.activeLessons}/{readiness.lessonsTotal}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_READINESS_LABELS.requiredLessons}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {readiness.requiredLessons}
          </div>
        </div>
      </div>

      <div
        data-testid="course-builder-readiness-blockers"
        className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 ring-1 ring-slate-200"
      >
        <div className="font-semibold text-slate-900">
          {COURSE_BUILDER_READINESS_LABELS.blockers}
        </div>
        {readiness.blockers.length === 0 ? (
          <p className="mt-2 text-slate-600">
            {COURSE_BUILDER_READINESS_LABELS.noBlockers}
          </p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
            {readiness.blockers.map((blocker) => (
              <li key={blocker.key}>{blocker.label}</li>
            ))}
          </ul>
        )}
      </div>

      <div
        data-testid="course-builder-readiness-checklist"
        className="mt-4 flex flex-wrap gap-2"
      >
        {readiness.checks.map((check) => (
          <StatusBadge key={check.key} tone={check.passed ? "green" : "gray"}>
            {check.passed ? "\u2713" : "\u2022"} {check.label}
          </StatusBadge>
        ))}
      </div>
    </section>
  );
}


const COURSE_BUILDER_CARD_UX_LABELS = {
  title: "\u041a\u0430\u0440\u0442\u0430 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438 \u043a\u0443\u0440\u0441\u0430",
  subtitle:
    "\u0411\u044b\u0441\u0442\u0440\u044b\u0439 \u043e\u0431\u0437\u043e\u0440 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043d\u043e\u0439 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438: \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f, \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430, \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430, \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0438 \u0430\u0443\u0434\u0438\u0442.",
  basic: "\u041e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f",
  structure: "\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u043a\u0443\u0440\u0441\u0430",
  publicCard: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430",
  enrollments: "\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f",
  audit: "\u0410\u0443\u0434\u0438\u0442",
  modules: "\u041c\u043e\u0434\u0443\u043b\u0435\u0439",
  lessons: "\u0423\u0440\u043e\u043a\u043e\u0432",
  activeModules: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u043c\u043e\u0434\u0443\u043b\u0435\u0439",
  activeLessons: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0443\u0440\u043e\u043a\u043e\u0432",
  requiredLessons: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u0443\u0440\u043e\u043a\u043e\u0432",
  openPublicCard: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u0443\u044e \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443",
  noPublicCard: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0431\u0435\u0437 slug.",
  openEnrollments: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f",
  openAudit: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0430\u0443\u0434\u0438\u0442 \u043a\u0443\u0440\u0441\u0430",
};

function getCourseBuilderCardUxFacts(course, modules = [], lessonsByModuleId = {}) {
  const courseModules = Array.isArray(modules) ? modules : [];
  const allLessons = courseModules.flatMap((module) =>
    Array.isArray(lessonsByModuleId?.[module.id]) ? lessonsByModuleId[module.id] : []
  );

  return {
    modulesTotal: courseModules.length,
    lessonsTotal: allLessons.length,
    activeModules: courseModules.filter((module) => module.is_active).length,
    activeLessons: allLessons.filter((lesson) => lesson.is_active).length,
    requiredLessons: allLessons.filter((lesson) => lesson.is_required).length,
    publicPath: course.slug ? `/courses/${encodeURIComponent(course.slug)}` : "",
    enrollmentsPath: buildEnrollmentsPath({ course_id: course.id }),
    auditPath: buildAuditPath({ entity_type: "course" }),
  };
}

function CourseBuilderCardUxPanel({ course, modules, lessonsByModuleId }) {
  const facts = getCourseBuilderCardUxFacts(course, modules, lessonsByModuleId);

  return (
    <section
      data-testid="course-builder-card-ux-panel"
      className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Stage 77.2 ? Course Builder UX
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {COURSE_BUILDER_CARD_UX_LABELS.title}
          </h3>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
            {COURSE_BUILDER_CARD_UX_LABELS.subtitle}
          </p>
        </div>

        <StatusBadge tone={course.is_active ? "green" : "gray"}>
          {course.is_active ? RU.active : RU.inactive}
        </StatusBadge>
      </div>

      <div
        data-testid="course-builder-card-ux-sections"
        className="mt-4 grid gap-3 lg:grid-cols-5"
      >
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_CARD_UX_LABELS.basic}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {course.title || "-"}
          </div>
          <div className="mt-1 break-all text-xs text-slate-500">
            {course.slug ? `/courses/${course.slug}` : "slug \u043d\u0435 \u0437\u0430\u0434\u0430\u043d"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_CARD_UX_LABELS.structure}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {facts.modulesTotal} / {facts.lessonsTotal}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {COURSE_BUILDER_CARD_UX_LABELS.modules} / {COURSE_BUILDER_CARD_UX_LABELS.lessons}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_CARD_UX_LABELS.activeModules}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {facts.activeModules}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {COURSE_BUILDER_CARD_UX_LABELS.activeLessons}: {facts.activeLessons}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_CARD_UX_LABELS.requiredLessons}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {facts.requiredLessons}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {RU.documentType}: {course.document_type || "-"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_CARD_UX_LABELS.publicCard}
          </div>
          {facts.publicPath ? (
            <Link
              data-testid="course-builder-card-ux-public-link"
              to={facts.publicPath}
              className="mt-2 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
            >
              {COURSE_BUILDER_CARD_UX_LABELS.openPublicCard}
            </Link>
          ) : (
            <div className="mt-2 text-xs text-slate-500">
              {COURSE_BUILDER_CARD_UX_LABELS.noPublicCard}
            </div>
          )}
        </div>
      </div>

      <div
        data-testid="course-builder-card-ux-quick-actions"
        className="mt-4 flex flex-wrap gap-3"
      >
        {facts.publicPath ? (
          <Link to={facts.publicPath} className={adminLinkClass}>
            {COURSE_BUILDER_CARD_UX_LABELS.openPublicCard}
          </Link>
        ) : null}

        <Link to={facts.enrollmentsPath} className={adminLinkClass}>
          {COURSE_BUILDER_CARD_UX_LABELS.openEnrollments}
        </Link>

        <Link to={facts.auditPath} className={adminLinkClass}>
          {COURSE_BUILDER_CARD_UX_LABELS.openAudit}
        </Link>
      </div>
    </section>
  );
}


const COURSE_BUILDER_MODULE_LESSON_UX_LABELS = {
  stage: "Stage 77.3 \u00b7 Module/Lesson UX",
  title: "\u0421\u0432\u043e\u0434\u043a\u0430 \u043c\u043e\u0434\u0443\u043b\u044f",
  subtitle:
    "\u0411\u044b\u0441\u0442\u0440\u0430\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b \u043c\u043e\u0434\u0443\u043b\u044f: \u0443\u0440\u043e\u043a\u0438, \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u0438 \u043a\u043e\u043d\u0442\u0435\u043d\u0442.",
  ready: "\u041c\u043e\u0434\u0443\u043b\u044c \u0433\u043e\u0442\u043e\u0432",
  needsWork: "\u041d\u0443\u0436\u043d\u0430 \u0434\u043e\u0440\u0430\u0431\u043e\u0442\u043a\u0430",
  lessons: "\u0423\u0440\u043e\u043a\u0438",
  activeLessons: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
  inactiveLessons: "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
  requiredLessons: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435",
  optionalLessons: "\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435",
  lessonMap: "\u041a\u0430\u0440\u0442\u0430 \u0443\u0440\u043e\u043a\u043e\u0432",
  attention: "\u0427\u0442\u043e \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f",
  noIssues: "\u0417\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u0439 \u043f\u043e \u043c\u043e\u0434\u0443\u043b\u044e \u043d\u0435\u0442.",
  moduleInactive: "\u041c\u043e\u0434\u0443\u043b\u044c \u043d\u0435\u0430\u043a\u0442\u0438\u0432\u0435\u043d \u0438 \u043d\u0435 \u043f\u043e\u043f\u0430\u0434\u0435\u0442 \u0432 \u043f\u0440\u043e\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u0435.",
  moduleDescriptionMissing: "\u041d\u0435 \u0437\u0430\u0434\u0430\u043d\u043e \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043c\u043e\u0434\u0443\u043b\u044f.",
  moduleWithoutLessons: "\u0412 \u043c\u043e\u0434\u0443\u043b\u0435 \u043d\u0435\u0442 \u0443\u0440\u043e\u043a\u043e\u0432.",
  moduleWithoutRequiredLessons: "\u0412 \u043c\u043e\u0434\u0443\u043b\u0435 \u043d\u0435\u0442 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u0443\u0440\u043e\u043a\u043e\u0432.",
  lessonTitleMissing: "\u0443\u0440\u043e\u043a \u0431\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f",
  textContentMissing: "\u0442\u0435\u043a\u0441\u0442\u043e\u0432\u044b\u0439 \u0443\u0440\u043e\u043a \u0431\u0435\u0437 \u0442\u0435\u043a\u0441\u0442\u0430",
  urlContentMissing: "\u0443\u0440\u043e\u043a \u0441\u043e \u0441\u0441\u044b\u043b\u043a\u043e\u0439/\u0444\u0430\u0439\u043b\u043e\u043c/\u0432\u0438\u0434\u0435\u043e \u0431\u0435\u0437 URL",
  assignmentContentMissing: "\u0437\u0430\u0434\u0430\u043d\u0438\u0435 \u0431\u0435\u0437 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f \u0438 \u0442\u0435\u043a\u0441\u0442\u0430",
};

function getCourseBuilderLessonContentIssue(lesson) {
  const contentType = `${lesson.content_type || ""}`.toLowerCase();
  const hasText = Boolean(`${lesson.content_text || ""}`.trim());
  const hasUrl = Boolean(`${lesson.content_url || ""}`.trim());
  const hasDescription = Boolean(`${lesson.description || ""}`.trim());

  if (contentType === "text" && !hasText) {
    return COURSE_BUILDER_MODULE_LESSON_UX_LABELS.textContentMissing;
  }

  if (["video", "file", "link"].includes(contentType) && !hasUrl) {
    return COURSE_BUILDER_MODULE_LESSON_UX_LABELS.urlContentMissing;
  }

  if (contentType === "assignment" && !hasDescription && !hasText) {
    return COURSE_BUILDER_MODULE_LESSON_UX_LABELS.assignmentContentMissing;
  }

  return "";
}

function getCourseBuilderModuleLessonUxFacts(module, lessons = []) {
  const moduleLessons = Array.isArray(lessons) ? lessons : [];
  const activeLessons = moduleLessons.filter((lesson) => lesson.is_active);
  const requiredLessons = moduleLessons.filter((lesson) => lesson.is_required);
  const inactiveLessons = moduleLessons.filter((lesson) => !lesson.is_active);
  const optionalLessons = moduleLessons.filter((lesson) => !lesson.is_required);

  const issues = [];

  if (!module.is_active) {
    issues.push(COURSE_BUILDER_MODULE_LESSON_UX_LABELS.moduleInactive);
  }

  if (!`${module.description || ""}`.trim()) {
    issues.push(COURSE_BUILDER_MODULE_LESSON_UX_LABELS.moduleDescriptionMissing);
  }

  if (moduleLessons.length === 0) {
    issues.push(COURSE_BUILDER_MODULE_LESSON_UX_LABELS.moduleWithoutLessons);
  }

  if (moduleLessons.length > 0 && requiredLessons.length === 0) {
    issues.push(COURSE_BUILDER_MODULE_LESSON_UX_LABELS.moduleWithoutRequiredLessons);
  }

  moduleLessons.forEach((lesson) => {
    const lessonLabel = `${RU.lessonNumber} ${lesson.position || lesson.id}`;

    if (!`${lesson.title || ""}`.trim()) {
      issues.push(`${lessonLabel}: ${COURSE_BUILDER_MODULE_LESSON_UX_LABELS.lessonTitleMissing}`);
    }

    const contentIssue = getCourseBuilderLessonContentIssue(lesson);

    if (contentIssue) {
      issues.push(`${lessonLabel}: ${contentIssue}`);
    }
  });

  return {
    issues,
    ready: issues.length === 0,
    lessonsTotal: moduleLessons.length,
    activeLessons: activeLessons.length,
    inactiveLessons: inactiveLessons.length,
    requiredLessons: requiredLessons.length,
    optionalLessons: optionalLessons.length,
  };
}

function CourseBuilderModuleLessonUxPanel({ module, lessons }) {
  const facts = getCourseBuilderModuleLessonUxFacts(module, lessons);
  const moduleLessons = Array.isArray(lessons) ? lessons : [];

  return (
    <section
      data-testid="course-builder-module-lesson-ux-panel"
      className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.stage}
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-900">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.title}
          </h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.subtitle}
          </p>
        </div>

        <StatusBadge tone={facts.ready ? "green" : "red"}>
          {facts.ready
            ? COURSE_BUILDER_MODULE_LESSON_UX_LABELS.ready
            : COURSE_BUILDER_MODULE_LESSON_UX_LABELS.needsWork}
        </StatusBadge>
      </div>

      <div
        data-testid="course-builder-module-lesson-ux-metrics"
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.lessons}
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {facts.lessonsTotal}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.activeLessons}
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {facts.activeLessons}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.inactiveLessons}
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {facts.inactiveLessons}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.requiredLessons}
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {facts.requiredLessons}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.optionalLessons}
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {facts.optionalLessons}
          </div>
        </div>
      </div>

      <div
        data-testid="course-builder-module-lesson-ux-attention"
        className={`mt-4 rounded-2xl p-4 text-sm leading-6 ring-1 ${
          facts.issues.length
            ? "bg-amber-50 text-amber-900 ring-amber-200"
            : "bg-green-50 text-green-800 ring-green-200"
        }`}
      >
        <div className="font-semibold text-slate-900">
          {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.attention}
        </div>

        {facts.issues.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {facts.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.noIssues}
          </p>
        )}
      </div>

      {moduleLessons.length ? (
        <div
          data-testid="course-builder-module-lesson-ux-map"
          className="mt-4"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_MODULE_LESSON_UX_LABELS.lessonMap}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {moduleLessons.map((lesson) => (
              <StatusBadge
                key={lesson.id}
                tone={lesson.is_active ? (lesson.is_required ? "green" : "blue") : "gray"}
              >
                {lesson.position}. {getLessonContentTypeLabel(lesson.content_type)}
                {lesson.is_required ? " ? " + RU.lessonRequired : ""}
              </StatusBadge>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AdminCourseCatalogDiagnostics({
  catalogStats,
  diagnostics,
}) {
  return (
    <SectionCard
      title="Диагностика административного каталога курсов"
      subtitle="Контроль активности, структуры модулей и уроков, обязательных материалов, публичного каталога, назначений и итоговых документов"
    >
      <div data-testid="admin-course-catalog-diagnostics" className="space-y-5">
        <div
          data-testid="admin-course-catalog-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Всего / показано
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.total} / {catalogStats.displayed}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Активные / неактивные
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.active} / {catalogStats.inactive}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Модули / уроки
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.modulesTotal} / {catalogStats.lessonsTotal}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Активные фильтры
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {catalogStats.activeFiltersCount}
            </div>
          </div>
        </div>

        <div
          data-testid="admin-course-catalog-structure"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Курсы без модулей
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.coursesWithoutModules}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Модули без уроков
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.modulesWithoutLessons}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Обязательные уроки
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.requiredLessons}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Итоговый документ
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.coursesWithDocumentType}
            </div>
          </div>
        </div>

        <div
          data-testid="admin-course-catalog-attention"
          className={`rounded-2xl p-4 text-sm leading-6 ring-1 ${
            diagnostics.length
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-green-50 text-green-800 ring-green-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">
              Что требует внимания в административном каталоге курсов
            </div>
            <span
              data-testid="admin-course-catalog-attention-count"
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
              Критичных замечаний по административному каталогу курсов не найдено.
            </p>
          )}
        </div>

        <div
          data-testid="admin-course-catalog-links"
          className="flex flex-wrap gap-3"
        >
          <Link
            to={buildCoursesPath({ is_active: "true" })}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Активные курсы
          </Link>

          <Link
            to={buildCoursesPath({ is_active: "false" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Неактивные курсы
          </Link>

          <Link
            to="/catalog"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Публичный каталог
          </Link>

          <Link
            to={buildEnrollmentsPath({ status: "active" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Активное обучение
          </Link>

          <Link
            to={buildEnrollmentsPath({ status: "completed" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Завершённое обучение
          </Link>

          <Link
            to={buildDocumentsPath({ status: "draft" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Черновики документов
          </Link>

          <Link
            to={buildAuditPath({ entity_type: "course" })}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Аудит курсов
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}

function CourseCard({
  course,
  modules = [],
  lessonsByModuleId = {},
  lessonCreateFormsByModuleId,
  lessonEditFormsByLessonId,
  editingLessonId,
  lessonCreatingModuleId,
  lessonActionId,
  moduleCreateForm,
  moduleEditFormsByModuleId,
  editingModuleId,
  isModuleCreating,
  moduleActionId,
  isEditing,
  isActionRunning,
  editForm,
  onEditFieldChange,
  onStartEdit,
  onEditSubmit,
  onCancelEdit,
  onToggleActive,
  onDelete,
  onModuleCreateFieldChange,
  onModuleCreateSubmit,
  onModuleCreateReset,
  onModuleEditStart,
  onModuleEditFieldChange,
  onModuleEditSubmit,
  onModuleEditCancel,
  onModuleDelete,
  onLessonCreateFieldChange,
  onLessonCreateSubmit,
  onLessonCreateReset,
  onLessonEditStart,
  onLessonEditFieldChange,
  onLessonEditSubmit,
  onLessonEditCancel,
  onLessonDelete,
}) {
  const courseModules = Array.isArray(modules) ? modules : [];

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

      <CourseBuilderReadinessPanel
        course={course}
        modules={courseModules}
        lessonsByModuleId={lessonsByModuleId}
      />

      <CourseBuilderCardUxPanel
        course={course}
        modules={courseModules}
        lessonsByModuleId={lessonsByModuleId}
      />

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

          <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {RU.courseModules}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {RU.courseModulesHint}
                </p>
              </div>

              <StatusBadge tone={courseModules.length ? "blue" : "gray"}>
                {courseModules.length}
              </StatusBadge>
            </div>

            {courseModules.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {RU.modulesNotFound}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {courseModules.map((module) => {
                  const isModuleEditing = editingModuleId === module.id;
                  const isModuleActionRunning = moduleActionId === module.id;
                  const moduleEditForm =
                    moduleEditFormsByModuleId?.[module.id] || buildModuleEditForm(module);
                  const moduleLessons = Array.isArray(lessonsByModuleId?.[module.id])
                    ? lessonsByModuleId[module.id]
                    : [];
                  const lessonCreateForm =
                    lessonCreateFormsByModuleId?.[module.id] ||
                    buildLessonCreateForm(moduleLessons);
                  const isLessonCreating = lessonCreatingModuleId === module.id;

                  return (
                    <div
                      key={module.id}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                    >
                      {!isModuleEditing ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {RU.moduleNumber} {module.position}
                              </div>
                              <div className="mt-1 text-sm font-bold text-slate-900">
                                {module.title}
                              </div>
                            </div>

                            <StatusBadge tone={module.is_active ? "green" : "gray"}>
                              {module.is_active ? RU.moduleActive : RU.moduleInactive}
                            </StatusBadge>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {module.description || RU.moduleDescriptionMissing}
                          </p>

                          <CourseBuilderModuleLessonUxPanel
                            module={module}
                            lessons={moduleLessons}
                          />

                          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">
                                  {RU.courseLessons}
                                </h4>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {RU.courseLessonsHint}
                                </p>
                              </div>

                              <StatusBadge tone={moduleLessons.length ? "blue" : "gray"}>
                                {moduleLessons.length}
                              </StatusBadge>
                            </div>

                            {moduleLessons.length === 0 ? (
                              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                {RU.lessonsNotFound}
                              </p>
                            ) : (
                              <div className="mt-4 space-y-3">
                                {moduleLessons.map((lesson) => {
                                  const isLessonEditing = editingLessonId === lesson.id;
                                  const isLessonActionRunning = lessonActionId === lesson.id;
                                  const lessonEditForm =
                                    lessonEditFormsByLessonId?.[lesson.id] ||
                                    buildLessonEditForm(lesson);

                                  return (
                                    <div
                                      key={lesson.id}
                                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                                    >
                                      {!isLessonEditing ? (
                                        <>
                                          <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {RU.lessonNumber} {lesson.position}
                                              </div>
                                              <div className="mt-1 text-sm font-bold text-slate-900">
                                                {lesson.title}
                                              </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                              <StatusBadge tone="blue">
                                                {getLessonContentTypeLabel(lesson.content_type)}
                                              </StatusBadge>
                                              <StatusBadge tone={lesson.is_required ? "green" : "gray"}>
                                                {lesson.is_required ? RU.lessonRequired : RU.lessonOptional}
                                              </StatusBadge>
                                              <StatusBadge tone={lesson.is_active ? "green" : "gray"}>
                                                {lesson.is_active ? RU.moduleActive : RU.moduleInactive}
                                              </StatusBadge>
                                            </div>
                                          </div>

                                          <p className="mt-3 text-sm leading-6 text-slate-600">
                                            {lesson.description || RU.lessonDescriptionMissing}
                                          </p>

                                          {lesson.content_url && (
                                            <div className="mt-3 text-xs text-slate-500">
                                              <span className="font-semibold text-slate-700">
                                                {RU.lessonContentUrl}:
                                              </span>{" "}
                                              {lesson.content_url}
                                            </div>
                                          )}

                                          {lesson.content_text && (
                                            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">
                                              <span className="font-semibold text-slate-700">
                                                {RU.lessonContentText}:
                                              </span>{" "}
                                              {lesson.content_text}
                                            </div>
                                          )}

                                          <div className="mt-4 flex flex-wrap gap-3">
                                            <ActionButton
                                              type="button"
                                              tone="blue"
                                              onClick={() => onLessonEditStart(lesson)}
                                              disabled={
                                                isLessonCreating ||
                                                Boolean(editingLessonId) ||
                                                Boolean(lessonActionId)
                                              }
                                            >
                                              {RU.edit}
                                            </ActionButton>

                                            <ActionButton
                                              type="button"
                                              tone="red"
                                              onClick={() => onLessonDelete(lesson)}
                                              disabled={
                                                isLessonCreating ||
                                                Boolean(editingLessonId) ||
                                                Boolean(lessonActionId)
                                              }
                                            >
                                              {RU.delete}
                                            </ActionButton>
                                          </div>
                                        </>
                                      ) : (
                                        <form
                                          onSubmit={(event) => onLessonEditSubmit(event, lesson)}
                                          className="space-y-4"
                                        >
                                          <CourseLessonFormFields
                                            values={lessonEditForm}
                                            onChange={(field, value) =>
                                              onLessonEditFieldChange(lesson.id, field, value)
                                            }
                                            prefix={`lesson-${lesson.id}-edit-`}
                                          />

                                          <div className="flex flex-wrap gap-3">
                                            <ActionButton
                                              type="submit"
                                              tone="blue"
                                              disabled={isLessonActionRunning}
                                            >
                                              {isLessonActionRunning ? RU.saving : RU.save}
                                            </ActionButton>

                                            <ActionButton
                                              type="button"
                                              tone="light"
                                              onClick={onLessonEditCancel}
                                              disabled={isLessonActionRunning}
                                            >
                                              {RU.cancel}
                                            </ActionButton>
                                          </div>
                                        </form>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <form
                              onSubmit={(event) => onLessonCreateSubmit(event, module, moduleLessons)}
                              className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                            >
                              <div>
                                <h5 className="text-sm font-bold text-slate-900">
                                  {RU.addLesson}
                                </h5>
                                <p className="mt-1 text-xs text-slate-500">
                                  POST /api/v1/admin/course-modules/{module.id}/lessons
                                </p>
                              </div>

                              <CourseLessonFormFields
                                values={lessonCreateForm}
                                onChange={(field, value) =>
                                  onLessonCreateFieldChange(module.id, field, value)
                                }
                                prefix={`module-${module.id}-lesson-create-`}
                              />

                              <div className="flex flex-wrap gap-3">
                                <ActionButton
                                  type="submit"
                                  tone="blue"
                                  disabled={isLessonCreating || Boolean(editingLessonId) || Boolean(lessonActionId)}
                                >
                                  {isLessonCreating ? RU.saving : RU.createLesson}
                                </ActionButton>

                                <ActionButton
                                  type="button"
                                  tone="light"
                                  onClick={() => onLessonCreateReset(module.id, moduleLessons)}
                                  disabled={isLessonCreating || Boolean(editingLessonId) || Boolean(lessonActionId)}
                                >
                                  {RU.clear}
                                </ActionButton>
                              </div>
                            </form>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <ActionButton
                              type="button"
                              tone="blue"
                              onClick={() => onModuleEditStart(module)}
                              disabled={isModuleCreating || Boolean(moduleActionId)}
                            >
                              {RU.edit}
                            </ActionButton>

                            <ActionButton
                              type="button"
                              tone="red"
                              onClick={() => onModuleDelete(module)}
                              disabled={isModuleCreating || Boolean(moduleActionId)}
                            >
                              {RU.delete}
                            </ActionButton>
                          </div>
                        </>
                      ) : (
                        <form
                          onSubmit={(event) => onModuleEditSubmit(event, module)}
                          className="space-y-4"
                        >
                          <CourseModuleFormFields
                            values={moduleEditForm}
                            onChange={(field, value) =>
                              onModuleEditFieldChange(module.id, field, value)
                            }
                            prefix={`module-${module.id}-edit-`}
                          />

                          <div className="flex flex-wrap gap-3">
                            <ActionButton type="submit" tone="blue" disabled={isModuleActionRunning}>
                              {isModuleActionRunning ? RU.saving : RU.save}
                            </ActionButton>

                            <ActionButton
                              type="button"
                              tone="light"
                              onClick={onModuleEditCancel}
                              disabled={isModuleActionRunning}
                            >
                              {RU.cancel}
                            </ActionButton>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <form
              onSubmit={(event) => onModuleCreateSubmit(event, course)}
              className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {RU.addModule}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    POST /api/v1/admin/courses/{course.id}/modules
                  </p>
                </div>
              </div>

              <CourseModuleFormFields
                values={moduleCreateForm || EMPTY_MODULE_CREATE_FORM}
                onChange={(field, value) => onModuleCreateFieldChange(course.id, field, value)}
                prefix={`course-${course.id}-create-`}
              />

              <div className="flex flex-wrap gap-3">
                <ActionButton type="submit" tone="blue" disabled={isModuleCreating}>
                  {isModuleCreating ? RU.saving : RU.createModule}
                </ActionButton>

                <ActionButton
                  type="button"
                  tone="light"
                  onClick={() => onModuleCreateReset(course.id, courseModules)}
                  disabled={isModuleCreating}
                >
                  {RU.clear}
                </ActionButton>
              </div>
            </form>
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
  const { onRefreshCourses } = arguments[0] || {};
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = getCourseFiltersFromSearch(location.search);

  const [courses, setCourses] = useState([]);
  const [courseModulesByCourseId, setCourseModulesByCourseId] = useState({});
  const [courseLessonsByModuleId, setCourseLessonsByModuleId] = useState({});
  const [lessonCreateFormsByModuleId, setLessonCreateFormsByModuleId] = useState({});
  const [lessonEditFormsByLessonId, setLessonEditFormsByLessonId] = useState({});
  const [editingLessonId, setEditingLessonId] = useState("");
  const [lessonCreatingModuleId, setLessonCreatingModuleId] = useState("");
  const [lessonActionId, setLessonActionId] = useState("");
  const [moduleCreateFormsByCourseId, setModuleCreateFormsByCourseId] = useState({});
  const [moduleEditFormsByModuleId, setModuleEditFormsByModuleId] = useState({});
  const [editingModuleId, setEditingModuleId] = useState("");
  const [moduleCreatingCourseId, setModuleCreatingCourseId] = useState("");
  const [moduleActionId, setModuleActionId] = useState("");
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

  const activeCourseFilterItems = useMemo(() => {
    const items = [];

    if (filterQuery.trim()) {
      items.push({ key: "q", label: "Поиск", value: filterQuery.trim() });
    }

    if (filterActive) {
      const status = COURSE_ACTIVE_FILTERS.find((item) => item.value === filterActive);
      items.push({
        key: "is_active",
        label: "Статус",
        value: status?.label || (filterActive === "true" ? RU.activePlural : RU.inactivePlural),
      });
    }

    return items;
  }, [filterQuery, filterActive]);

  const hasActiveFilters = Boolean(filterQuery || filterActive);
  const activeCount = courseCounts.active || 0;
  const inactiveCount = courseCounts.inactive || 0;

  const adminCourseCatalogFilters = useMemo(
    () => ({
      q: filterQuery,
      is_active: filterActive,
    }),
    [filterQuery, filterActive]
  );

  const adminCourseCatalogStats = useMemo(
    () =>
      getAdminCourseCatalogStats({
        courses,
        courseCounts,
        courseModulesByCourseId,
        courseLessonsByModuleId,
        filters: adminCourseCatalogFilters,
      }),
    [
      courses,
      courseCounts,
      courseModulesByCourseId,
      courseLessonsByModuleId,
      adminCourseCatalogFilters,
    ]
  );

  const adminCourseCatalogDiagnostics = useMemo(
    () =>
      getAdminCourseCatalogDiagnostics({
        catalogStats: adminCourseCatalogStats,
        loading,
        saving,
        actionCourseId,
        editingCourseId,
        showCreateForm,
        moduleCreatingCourseId,
        moduleActionId,
        editingModuleId,
        lessonCreatingModuleId,
        lessonActionId,
        editingLessonId,
        error,
        successMessage,
      }),
    [
      adminCourseCatalogStats,
      loading,
      saving,
      actionCourseId,
      editingCourseId,
      showCreateForm,
      moduleCreatingCourseId,
      moduleActionId,
      editingModuleId,
      lessonCreatingModuleId,
      lessonActionId,
      editingLessonId,
      error,
      successMessage,
    ]
  );

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
      await refreshCoursesFastPath(filters);
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

      const nextCourses = Array.isArray(response) ? response : [];
      const moduleEntries = await Promise.all(
        nextCourses.map(async (course) => {
          const modules = await getAdminCourseModules(course.id);
          return [course.id, Array.isArray(modules) ? modules : []];
        })
      );

      const nextModulesByCourseId = Object.fromEntries(moduleEntries);
      const allModules = Object.values(nextModulesByCourseId).flat();
      const lessonEntries = await Promise.all(
        allModules.map(async (module) => {
          const lessons = await getAdminCourseLessons(module.id);
          return [module.id, Array.isArray(lessons) ? lessons : []];
        })
      );
      const nextLessonsByModuleId = Object.fromEntries(lessonEntries);
      const nextLessonFormsByModuleId = Object.fromEntries(
        allModules.map((module) => [
          module.id,
          buildLessonCreateForm(nextLessonsByModuleId[module.id] || []),
        ])
      );
      const nextModuleFormsByCourseId = Object.fromEntries(
        nextCourses.map((course) => [
          course.id,
          buildModuleCreateForm(nextModulesByCourseId[course.id] || []),
        ])
      );

      setCourses(nextCourses);
      setCourseModulesByCourseId(nextModulesByCourseId);
      setCourseLessonsByModuleId(nextLessonsByModuleId);
      setLessonCreateFormsByModuleId(nextLessonFormsByModuleId);
      setModuleCreateFormsByCourseId(nextModuleFormsByCourseId);
      setCourseCounts(calculateCourseCounts(Array.isArray(countResponse) ? countResponse : []));
    } catch (err) {
      setError(formatCourseApiError(err, RU.loadFailed));
      setCourseModulesByCourseId({});
      setCourseLessonsByModuleId({});
      setLessonCreateFormsByModuleId({});
      setLessonEditFormsByLessonId({});
      setEditingLessonId("");
      setLessonCreatingModuleId("");
      setLessonActionId("");
      setModuleCreateFormsByCourseId({});
      setModuleEditFormsByModuleId({});
      setEditingModuleId("");
      setModuleActionId("");
      setCourseCounts({ all: 0, active: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function refreshCoursesFastPath(filters = buildFilters()) {
    const nextFilters = filters ?? buildFilters();
    const localRefresh = loadData(nextFilters);

    if (!onRefreshCourses) {
      await localRefresh;
      return;
    }

    await Promise.all([
      localRefresh,
      onRefreshCourses(nextFilters),
    ]);
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
      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseApiError(err, RU.createFailed));
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
      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseApiError(err, RU.updateFailed));
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

      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseApiError(err, RU.statusChangeFailed));
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

      setEditingModuleId("");
      setModuleEditFormsByModuleId({});
      setEditingLessonId("");
      setLessonEditFormsByLessonId({});

      setSuccessMessage(`${RU.deletedMessage}: ${course.title}`);
      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseApiError(err, RU.deleteFailed));
    } finally {
      setActionCourseId("");
    }
  }

  function updateLessonCreateField(moduleId, field, value) {
    setLessonCreateFormsByModuleId((current) => ({
      ...current,
      [moduleId]: {
        ...(current[moduleId] || EMPTY_LESSON_CREATE_FORM),
        [field]: value,
      },
    }));
  }

  function resetLessonCreateForm(moduleId, lessons = []) {
    setLessonCreateFormsByModuleId((current) => ({
      ...current,
      [moduleId]: buildLessonCreateForm(lessons),
    }));
  }

  function buildLessonPayload(values) {
    return {
      title: values.title.trim(),
      description: values.description.trim() || null,
      content_type: values.content_type,
      content_url: values.content_url.trim() || null,
      content_text: values.content_text.trim() || null,
      position: normalizeModulePositionInput(values.position),
      is_required: Boolean(values.is_required),
      is_active: Boolean(values.is_active),
    };
  }

  async function handleLessonCreateSubmit(event, module, lessons = []) {
    event.preventDefault();

    const values = lessonCreateFormsByModuleId[module.id] || buildLessonCreateForm(lessons);

    if (!values.title.trim()) {
      setError(RU.lessonTitleRequired);
      return;
    }

    if (normalizeModulePositionInput(values.position) === null) {
      setError(RU.lessonPositionRequired);
      return;
    }

    try {
      setLessonCreatingModuleId(module.id);
      setError("");
      setSuccessMessage("");

      const created = await createAdminCourseLesson(module.id, buildLessonPayload(values));

      setSuccessMessage(`${RU.lessonCreatedMessage}: ${created.title}`);
      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseLessonApiError(err, RU.lessonCreateFailed));
    } finally {
      setLessonCreatingModuleId("");
    }
  }

  function handleLessonEditStart(lesson) {
    setError("");
    setSuccessMessage("");
    setEditingLessonId(lesson.id);
    setLessonEditFormsByLessonId((current) => ({
      ...current,
      [lesson.id]: buildLessonEditForm(lesson),
    }));
  }

  function updateLessonEditField(lessonId, field, value) {
    setLessonEditFormsByLessonId((current) => ({
      ...current,
      [lessonId]: {
        ...(current[lessonId] || EMPTY_LESSON_CREATE_FORM),
        [field]: value,
      },
    }));
  }

  function resetLessonEditState() {
    setEditingLessonId("");
    setLessonEditFormsByLessonId({});
  }

  async function handleLessonEditSubmit(event, lesson) {
    event.preventDefault();

    const values = lessonEditFormsByLessonId[lesson.id] || buildLessonEditForm(lesson);

    if (!values.title.trim()) {
      setError(RU.lessonTitleRequired);
      return;
    }

    if (normalizeModulePositionInput(values.position) === null) {
      setError(RU.lessonPositionRequired);
      return;
    }

    try {
      setLessonActionId(lesson.id);
      setError("");
      setSuccessMessage("");

      const updated = await updateAdminCourseLesson(lesson.id, buildLessonPayload(values));

      resetLessonEditState();
      setSuccessMessage(`${RU.lessonUpdatedMessage}: ${updated.title}`);
      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseLessonApiError(err, RU.lessonUpdateFailed));
    } finally {
      setLessonActionId("");
    }
  }

  async function handleLessonDelete(lesson) {
    const confirmed = window.confirm(
      `${RU.deleteConfirmPrefix} "${lesson.title}"? ${RU.deleteConfirmSuffix}`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLessonActionId(lesson.id);
      setError("");
      setSuccessMessage("");

      await deleteAdminCourseLesson(lesson.id);

      if (editingLessonId === lesson.id) {
        resetLessonEditState();
      }

      setSuccessMessage(`${RU.lessonDeletedMessage}: ${lesson.title}`);
      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseLessonApiError(err, RU.lessonDeleteFailed));
    } finally {
      setLessonActionId("");
    }
  }

  function updateModuleCreateField(courseId, field, value) {
    setModuleCreateFormsByCourseId((current) => ({
      ...current,
      [courseId]: {
        ...(current[courseId] || EMPTY_MODULE_CREATE_FORM),
        [field]: value,
      },
    }));
  }

  function resetModuleCreateForm(courseId, modules = []) {
    setModuleCreateFormsByCourseId((current) => ({
      ...current,
      [courseId]: buildModuleCreateForm(modules),
    }));
  }

  function buildModulePayload(values) {
    return {
      title: values.title.trim(),
      description: values.description.trim() || null,
      position: normalizeModulePositionInput(values.position),
      is_active: Boolean(values.is_active),
    };
  }

  async function handleModuleCreateSubmit(event, course) {
    event.preventDefault();

    const values = moduleCreateFormsByCourseId[course.id] || EMPTY_MODULE_CREATE_FORM;

    if (!values.title.trim()) {
      setError(RU.moduleTitleRequired);
      return;
    }

    if (normalizeModulePositionInput(values.position) === null) {
      setError(RU.modulePositionRequired);
      return;
    }

    try {
      setModuleCreatingCourseId(course.id);
      setError("");
      setSuccessMessage("");

      const created = await createAdminCourseModule(course.id, buildModulePayload(values));

      setSuccessMessage(`${RU.moduleCreatedMessage}: ${created.title}`);
      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseModuleApiError(err, RU.moduleCreateFailed));
    } finally {
      setModuleCreatingCourseId("");
    }
  }

  function handleModuleEditStart(module) {
    setError("");
    setSuccessMessage("");
    setEditingModuleId(module.id);
    setModuleEditFormsByModuleId((current) => ({
      ...current,
      [module.id]: buildModuleEditForm(module),
    }));
  }

  function updateModuleEditField(moduleId, field, value) {
    setModuleEditFormsByModuleId((current) => ({
      ...current,
      [moduleId]: {
        ...(current[moduleId] || EMPTY_MODULE_CREATE_FORM),
        [field]: value,
      },
    }));
  }

  function resetModuleEditState() {
    setEditingModuleId("");
    setModuleEditFormsByModuleId({});
  }

  async function handleModuleEditSubmit(event, module) {
    event.preventDefault();

    const values = moduleEditFormsByModuleId[module.id] || buildModuleEditForm(module);

    if (!values.title.trim()) {
      setError(RU.moduleTitleRequired);
      return;
    }

    if (normalizeModulePositionInput(values.position) === null) {
      setError(RU.modulePositionRequired);
      return;
    }

    try {
      setModuleActionId(module.id);
      setError("");
      setSuccessMessage("");

      const updated = await updateAdminCourseModule(module.id, buildModulePayload(values));

      setSuccessMessage(`${RU.moduleUpdatedMessage}: ${updated.title}`);
      resetModuleEditState();
      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseModuleApiError(err, RU.moduleUpdateFailed));
    } finally {
      setModuleActionId("");
    }
  }

  async function handleModuleDelete(module) {
    const confirmed = window.confirm(
      `${RU.moduleDeleteConfirmPrefix} "${module.title}"? ${RU.deleteConfirmSuffix}`
    );

    if (!confirmed) {
      return;
    }

    try {
      setModuleActionId(module.id);
      setError("");
      setSuccessMessage("");

      await deleteAdminCourseModule(module.id);

      if (editingModuleId === module.id) {
        resetModuleEditState();
      }

      resetLessonEditState();

      setSuccessMessage(`${RU.moduleDeletedMessage}: ${module.title}`);
      await refreshCoursesFastPath(buildFilters());
    } catch (err) {
      setError(formatCourseModuleApiError(err, RU.moduleDeleteFailed));
    } finally {
      setModuleActionId("");
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

  function handleExportCoursesCsv() {
    const rows = courses.map((course) => {
      const modules = courseModulesByCourseId[course.id] || [];
      const lessons = modules.flatMap((module) => courseLessonsByModuleId[module.id] || []);

      return {
        id: course.id,
        slug: course.slug || "",
        title: course.title || "",
        is_active: course.is_active ? "yes" : "no",
        hours: course.hours ?? "",
        format: course.format || "",
        document_type: course.document_type || "",
        modules_count: modules.length,
        lessons_count: lessons.length,
        public_url: course.slug ? `/courses/${course.slug}` : "",
        description: course.description || "",
        created_at: course.created_at || "",
        updated_at: course.updated_at || "",
      };
    });

    downloadCsvFile(
      buildDatedCsvFilename("obrportal-admin-courses"),
      COURSE_CSV_EXPORT_COLUMNS,
      rows
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={RU.pageTitle}
        subtitle={RU.pageSubtitle}
        action={
          <AdminPageActions
            loading={loading}
            onRefresh={() => refreshCoursesFastPath(buildFilters())}
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

          <AdminActiveFiltersSummary
            items={activeCourseFilterItems}
            onReset={handleResetFilter}
            testId="admin-courses-active-filters-summary"
            emptyText="Фильтры программ не применены."
          />

          <div
            data-testid="admin-courses-export-summary"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
          >
            <div>
              <div className="text-sm font-semibold text-slate-900">Экспорт программ</div>
              <p className="mt-1 text-xs text-slate-600">
                CSV содержит текущую выборку после поиска и фильтра активности:
                {" "}{courses.length} из {courseCounts.all || courses.length}.
              </p>
            </div>

            <ActionButton
              type="button"
              tone="light"
              onClick={handleExportCoursesCsv}
              disabled={loading || courses.length === 0}
              data-testid="admin-courses-export-csv-button"
            >
              Скачать CSV
            </ActionButton>
          </div>

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

      <AdminCourseCatalogDiagnostics
        catalogStats={adminCourseCatalogStats}
        diagnostics={adminCourseCatalogDiagnostics}
      />

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
                modules={courseModulesByCourseId[course.id] || []}
                lessonsByModuleId={courseLessonsByModuleId}
                lessonCreateFormsByModuleId={lessonCreateFormsByModuleId}
                lessonEditFormsByLessonId={lessonEditFormsByLessonId}
                editingLessonId={editingLessonId}
                lessonCreatingModuleId={lessonCreatingModuleId}
                lessonActionId={lessonActionId}
                moduleCreateForm={
                  moduleCreateFormsByCourseId[course.id] ||
                  buildModuleCreateForm(courseModulesByCourseId[course.id] || [])
                }
                moduleEditFormsByModuleId={moduleEditFormsByModuleId}
                editingModuleId={editingModuleId}
                isModuleCreating={moduleCreatingCourseId === course.id}
                moduleActionId={moduleActionId}
                isEditing={editingCourseId === course.id}
                isActionRunning={actionCourseId === course.id}
                editForm={editForm}
                onEditFieldChange={updateEditField}
                onStartEdit={handleStartEdit}
                onEditSubmit={handleEditSubmit}
                onCancelEdit={resetEditState}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                onModuleCreateFieldChange={updateModuleCreateField}
                onModuleCreateSubmit={handleModuleCreateSubmit}
                onModuleCreateReset={resetModuleCreateForm}
                onModuleEditStart={handleModuleEditStart}
                onModuleEditFieldChange={updateModuleEditField}
                onModuleEditSubmit={handleModuleEditSubmit}
                onModuleEditCancel={resetModuleEditState}
                onModuleDelete={handleModuleDelete}
                onLessonCreateFieldChange={updateLessonCreateField}
                onLessonCreateSubmit={handleLessonCreateSubmit}
                onLessonCreateReset={resetLessonCreateForm}
                onLessonEditStart={handleLessonEditStart}
                onLessonEditFieldChange={updateLessonEditField}
                onLessonEditSubmit={handleLessonEditSubmit}
                onLessonEditCancel={resetLessonEditState}
                onLessonDelete={handleLessonDelete}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
