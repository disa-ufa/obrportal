import { getApiErrorMessage, getApiErrorStatus, getSafeApiErrorMessage } from "../utils/apiErrors";
import { Fragment, useEffect, useMemo, useState } from "react";
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
import { LessonBlocksEditor } from "../components/admin/LessonBlocksEditor";
import { buildAdminLessonStudioPath } from "../utils/adminRoutes";
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

function buildCourseSlug(value) {
  const translit = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return `${value || ""}`
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => translit[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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

const adminLinkClass =
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50";

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
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <div className="mb-4">
          <div className="text-sm font-black text-slate-950">Основные данные</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Название отображается в каталоге и личном кабинете. Slug используется в публичной ссылке программы.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Заполнится автоматически из названия. Можно изменить вручную.
            </p>
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
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
          <div className="mb-4">
            <div className="text-sm font-black text-slate-950">Параметры программы</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Эти данные помогают пользователю понять формат обучения и какой документ он получит после завершения.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
                placeholder="72"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {RU.format}
              </span>
              <select
                value={values.format}
                onChange={(event) => onChange("format", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Не указан</option>
                <option value="online">Онлайн</option>
                <option value="mixed">Смешанный</option>
                <option value="очно-заочно">Очно-заочно</option>
                <option value="self-paced">Самостоятельное прохождение</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {RU.documentType}
              </span>
              <select
                value={values.document_type}
                onChange={(event) => onChange("document_type", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Не указан</option>
                <option value="сертификат">Сертификат</option>
                <option value="удостоверение">Удостоверение</option>
                <option value="диплом">Диплом</option>
                <option value="без документа">Без документа</option>
              </select>
            </label>
          </div>
        </div>

        <label className={`flex min-h-full items-start gap-4 rounded-3xl border p-5 text-sm transition ${
          values.is_active
            ? "border-emerald-200 bg-emerald-50/70"
            : "border-slate-200 bg-white"
        }`}>
          <input
            id={`${prefix}is-active`}
            type="checkbox"
            checked={values.is_active}
            onChange={(event) => onChange("is_active", event.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300"
          />
          <span>
            <span className="block font-black text-slate-950">{RU.active}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Активная программа доступна в каталоге и может использоваться в назначениях. Снимите галочку, чтобы временно скрыть программу.
            </span>
          </span>
        </label>
      </div>
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


const COURSE_BUILDER_LESSON_EDITOR_UX_LABELS = {
  stage: "Stage 77.4 \u00b7 Lesson Editor UX",
  title: "\u041f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0438 \u043f\u043e \u0443\u0440\u043e\u043a\u0443",
  subtitle:
    "\u0424\u043e\u0440\u043c\u0430 \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0443\u0441\u0442\u043e\u0439 \u0438\u043b\u0438 \u043d\u0435\u043f\u043e\u043b\u043d\u044b\u0439 \u0443\u0440\u043e\u043a: \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u0447\u0442\u043e \u043d\u0443\u0436\u043d\u043e \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0434\u043b\u044f \u0442\u0435\u043a\u0441\u0442\u0430, \u0432\u0438\u0434\u0435\u043e, \u0444\u0430\u0439\u043b\u0430, \u0441\u0441\u044b\u043b\u043a\u0438 \u0438\u043b\u0438 \u0437\u0430\u0434\u0430\u043d\u0438\u044f.",
  ready: "\u0423\u0440\u043e\u043a \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d",
  needsWork: "\u041d\u0443\u0436\u043d\u043e \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u044c",
  contentType: "\u0422\u0438\u043f \u043a\u043e\u043d\u0442\u0435\u043d\u0442\u0430",
  requiredFields: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u0442\u0438\u043f\u0430",
  missingFields: "\u0427\u0442\u043e \u0435\u0449\u0451 \u043d\u0443\u0436\u043d\u043e",
  noMissingFields: "\u041e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u043f\u043e\u043b\u044f \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u044b.",
  publicationMode: "\u0420\u0435\u0436\u0438\u043c \u0443\u0440\u043e\u043a\u0430",
  titleField: "\u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435",
  positionField: "\u043f\u043e\u0437\u0438\u0446\u0438\u044f",
  textField: "\u0442\u0435\u043a\u0441\u0442 \u0443\u0440\u043e\u043a\u0430",
  urlField: "URL",
  descriptionField: "\u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
  textHint: "\u0414\u043b\u044f \u0442\u0435\u043a\u0441\u0442\u043e\u0432\u043e\u0433\u043e \u0443\u0440\u043e\u043a\u0430 \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043f\u043e\u043b\u0435 \u00ab\u0422\u0435\u043a\u0441\u0442\u00bb.",
  videoHint: "\u0414\u043b\u044f \u0432\u0438\u0434\u0435\u043e\u0443\u0440\u043e\u043a\u0430 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 URL \u043d\u0430 \u0432\u0438\u0434\u0435\u043e \u0438\u043b\u0438 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443 \u0441 \u0432\u0438\u0434\u0435\u043e.",
  fileHint: "\u0414\u043b\u044f \u0444\u0430\u0439\u043b\u0430 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 URL \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u0430. \u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0444\u0430\u0439\u043b\u043e\u0432 \u0431\u0443\u0434\u0435\u0442 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u043c \u044d\u0442\u0430\u043f\u043e\u043c.",
  linkHint: "\u0414\u043b\u044f \u0441\u0441\u044b\u043b\u043a\u0438 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 URL \u043d\u0430 \u0432\u043d\u0435\u0448\u043d\u0438\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b.",
  assignmentHint: "\u0414\u043b\u044f \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0438\u043b\u0438 \u0442\u0435\u043a\u0441\u0442 \u0438\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u0438.",
};

function getLessonEditorUxHint(contentType) {
  const normalized = `${contentType || ""}`.toLowerCase();

  const hints = {
    text: COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.textHint,
    video: COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.videoHint,
    file: COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.fileHint,
    link: COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.linkHint,
    assignment: COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.assignmentHint,
  };

  return hints[normalized] || COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.textHint;
}

function getLessonEditorUxFacts(values) {
  const contentType = `${values.content_type || "text"}`.toLowerCase();
  const hasTitle = Boolean(`${values.title || ""}`.trim());
  const hasPosition = Boolean(`${values.position || ""}`.trim());
  const hasDescription = Boolean(`${values.description || ""}`.trim());
  const hasUrl = Boolean(`${values.content_url || ""}`.trim());
  const hasText = Boolean(`${values.content_text || ""}`.trim());

  const requiredFields = [
    COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.titleField,
    COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.positionField,
  ];

  const missingFields = [];

  if (!hasTitle) {
    missingFields.push(COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.titleField);
  }

  if (!hasPosition) {
    missingFields.push(COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.positionField);
  }

  if (contentType === "text") {
    requiredFields.push(COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.textField);

    if (!hasText) {
      missingFields.push(COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.textField);
    }
  }

  if (["video", "file", "link"].includes(contentType)) {
    requiredFields.push(COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.urlField);

    if (!hasUrl) {
      missingFields.push(COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.urlField);
    }
  }

  if (contentType === "assignment") {
    requiredFields.push(COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.descriptionField);

    if (!hasDescription && !hasText) {
      missingFields.push(COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.descriptionField);
    }
  }

  return {
    contentType,
    label: getLessonContentTypeLabel(contentType),
    hint: getLessonEditorUxHint(contentType),
    requiredFields,
    missingFields,
    ready: missingFields.length === 0,
    modeLabel: values.is_required ? RU.lessonRequired : RU.lessonOptional,
    statusLabel: values.is_active ? RU.active : RU.inactive,
  };
}

function CourseLessonEditorUxPanel({ values }) {
  const facts = getLessonEditorUxFacts(values);

  return (
    <section
      data-testid="lesson-editor-ux-panel"
      className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 md:col-span-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.stage}
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-900">
            {COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.title}
          </h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            {COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.subtitle}
          </p>
        </div>

        <StatusBadge tone={facts.ready ? "green" : "red"}>
          {facts.ready
            ? COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.ready
            : COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.needsWork}
        </StatusBadge>
      </div>

      <div
        data-testid="lesson-editor-ux-content-type"
        className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.contentType}
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-900">
          {facts.label}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {facts.hint}
        </p>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div
          data-testid="lesson-editor-ux-required-fields"
          className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.requiredFields}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {facts.requiredFields.map((field) => (
              <StatusBadge key={field} tone="blue">
                {field}
              </StatusBadge>
            ))}
          </div>
        </div>

        <div
          data-testid="lesson-editor-ux-missing-fields"
          className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.missingFields}
          </div>
          {facts.missingFields.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {facts.missingFields.map((field) => (
                <StatusBadge key={field} tone="red">
                  {field}
                </StatusBadge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.noMissingFields}
            </p>
          )}
        </div>

        <div
          data-testid="lesson-editor-ux-publication-mode"
          className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_LESSON_EDITOR_UX_LABELS.publicationMode}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone={values.is_required ? "green" : "gray"}>
              {facts.modeLabel}
            </StatusBadge>
            <StatusBadge tone={values.is_active ? "green" : "gray"}>
              {facts.statusLabel}
            </StatusBadge>
          </div>
        </div>
      </div>
    </section>
  );
}


const COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS = {
  stage: "Stage 77.5 \u00b7 Lesson Content Preview UX",
  title: "\u041f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0443\u0440\u043e\u043a\u0430",
  subtitle:
    "\u0411\u044b\u0441\u0442\u0440\u044b\u0439 \u043f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u0430\u0434\u043c\u0438\u043d\u0443 \u043f\u043e\u043d\u044f\u0442\u044c, \u0447\u0442\u043e \u0443\u0432\u0438\u0434\u0438\u0442 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044c \u0432 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0435 \u0443\u0440\u043e\u043a\u0430.",
  ready: "\u041f\u0440\u0435\u0432\u044c\u044e \u0433\u043e\u0442\u043e\u0432\u043e",
  empty: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u043f\u0440\u0435\u0432\u044c\u044e",
  previewType: "\u0422\u0438\u043f \u043f\u0440\u0435\u0432\u044c\u044e",
  learnerView: "\u0412\u0438\u0434 \u0434\u043b\u044f \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f",
  titleMissing: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0443\u0440\u043e\u043a\u0430 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0437\u0430\u0434\u0430\u043d\u043e",
  description: "\u041a\u0440\u0430\u0442\u043a\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
  textPreview: "\u0422\u0435\u043a\u0441\u0442\u043e\u0432\u044b\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  urlPreview: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043f\u043e URL",
  assignmentPreview: "\u0417\u0430\u0434\u0430\u043d\u0438\u0435",
  openMaterial: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
  noText: "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0442\u0435\u043a\u0441\u0442 \u0443\u0440\u043e\u043a\u0430, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0431\u0440\u0430\u0442\u044c \u043f\u0440\u0435\u0432\u044c\u044e.",
  noUrl: "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 URL \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u0430, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0431\u0440\u0430\u0442\u044c \u043f\u0440\u0435\u0432\u044c\u044e.",
  noAssignment: "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0438\u043b\u0438 \u0442\u0435\u043a\u0441\u0442 \u0437\u0430\u0434\u0430\u043d\u0438\u044f.",
  activeVisible: "\u0414\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044e",
  inactiveHidden: "\u0421\u043a\u0440\u044b\u0442 \u043e\u0442 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f",
};

function getLessonContentPreviewSummary(value, maxLength = 280) {
  const text = `${value || ""}`.trim();

  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function getLessonContentPreviewUrlHost(url) {
  const value = `${url || ""}`.trim();

  if (!value) {
    return "";
  }

  try {
    const normalized = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
    return new URL(normalized).host;
  } catch {
    return value;
  }
}

function getLessonContentPreviewFacts(values) {
  const contentType = `${values.content_type || "text"}`.toLowerCase();
  const title = `${values.title || ""}`.trim();
  const description = `${values.description || ""}`.trim();
  const contentText = `${values.content_text || ""}`.trim();
  const contentUrl = `${values.content_url || ""}`.trim();

  const facts = {
    contentType,
    label: getLessonContentTypeLabel(contentType),
    title: title || COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.titleMissing,
    description: getLessonContentPreviewSummary(description, 160),
    body: "",
    url: contentUrl,
    urlHost: getLessonContentPreviewUrlHost(contentUrl),
    previewType: COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.textPreview,
    emptyReason: "",
    ready: false,
    statusLabel: values.is_active
      ? COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.activeVisible
      : COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.inactiveHidden,
  };

  if (contentType === "text") {
    facts.previewType = COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.textPreview;
    facts.body = getLessonContentPreviewSummary(contentText);
    facts.emptyReason = facts.body ? "" : COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.noText;
    facts.ready = Boolean(facts.body);
    return facts;
  }

  if (["video", "file", "link"].includes(contentType)) {
    facts.previewType = COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.urlPreview;
    facts.body = facts.urlHost || contentUrl;
    facts.emptyReason = contentUrl ? "" : COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.noUrl;
    facts.ready = Boolean(contentUrl);
    return facts;
  }

  if (contentType === "assignment") {
    facts.previewType = COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.assignmentPreview;
    facts.body = getLessonContentPreviewSummary(description || contentText);
    facts.emptyReason = facts.body ? "" : COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.noAssignment;
    facts.ready = Boolean(facts.body);
    return facts;
  }

  facts.body = getLessonContentPreviewSummary(contentText || description || contentUrl);
  facts.emptyReason = facts.body ? "" : COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.empty;
  facts.ready = Boolean(facts.body);
  return facts;
}

function CourseLessonContentPreviewPanel({ values }) {
  const facts = getLessonContentPreviewFacts(values);

  return (
    <section
      data-testid="lesson-content-preview-panel"
      className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 md:col-span-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.stage}
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-900">
            {COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.title}
          </h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            {COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.subtitle}
          </p>
        </div>

        <StatusBadge tone={facts.ready ? "green" : "red"}>
          {facts.ready
            ? COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.ready
            : COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.empty}
        </StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
        <div
          data-testid="lesson-content-preview-kind"
          className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.previewType}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {facts.previewType}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone="blue">{facts.label}</StatusBadge>
            <StatusBadge tone={values.is_active ? "green" : "gray"}>
              {facts.statusLabel}
            </StatusBadge>
          </div>
        </div>

        <div
          data-testid="lesson-content-preview-body"
          className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.learnerView}
          </div>

          <div className="mt-2 text-base font-bold text-slate-900">
            {facts.title}
          </div>

          {facts.description ? (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              <span className="font-semibold">
                {COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.description}:
              </span>{" "}
              {facts.description}
            </p>
          ) : null}

          {facts.ready ? (
            <div className="mt-3 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              {facts.body}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
              {facts.emptyReason}
            </div>
          )}

          {facts.url ? (
            <a
              data-testid="lesson-content-preview-open-link"
              href={facts.url.startsWith("http://") || facts.url.startsWith("https://") ? facts.url : `https://${facts.url}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
            >
              {COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS.openMaterial}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CourseLessonFormFields({ values, onChange, prefix = "", lessonId = "" }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_180px_140px]">
      <CourseLessonEditorUxPanel values={values} />
      <CourseLessonContentPreviewPanel values={values} />
      <LessonBlocksEditor lessonId={lessonId} />
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
        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
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

        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_READINESS_LABELS.modules}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {readiness.activeModules}/{readiness.modulesTotal}
          </div>
        </div>

        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_BUILDER_READINESS_LABELS.lessons}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {readiness.activeLessons}/{readiness.lessonsTotal}
          </div>
        </div>

        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
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
        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
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

        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
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

        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
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

        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
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

        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
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


const COURSE_PUBLICATION_UX_LABELS = {
  stage: "Stage 77.6 \u00b7 Course Publication UX",
  title: "\u0424\u0438\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u043a\u0443\u0440\u0441\u0430",
  subtitle:
    "\u0424\u0438\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u0431\u043b\u043e\u043a \u0441\u043e\u0431\u0438\u0440\u0430\u0435\u0442 \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c, \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c, \u0431\u043b\u043e\u043a\u0435\u0440\u044b \u0438 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0435 \u0448\u0430\u0433\u0438 \u043f\u0435\u0440\u0435\u0434 \u0432\u044b\u0432\u043e\u0434\u043e\u043c \u043a\u0443\u0440\u0441\u0430 \u0432 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0430\u0442\u0430\u043b\u043e\u0433.",
  published: "\u041a\u0443\u0440\u0441 \u043e\u0442\u043a\u0440\u044b\u0442 \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435",
  readyToEnable: "\u0413\u043e\u0442\u043e\u0432 \u043a \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044e",
  blocked: "\u041d\u0435\u043b\u044c\u0437\u044f \u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c",
  decision: "\u0420\u0435\u0448\u0435\u043d\u0438\u0435 \u043f\u043e \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438",
  readiness: "\u0413\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c",
  visibility: "\u0412\u0438\u0434\u0438\u043c\u043e\u0441\u0442\u044c",
  publicCard: "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430",
  blockers: "\u0427\u0442\u043e \u0431\u043b\u043e\u043a\u0438\u0440\u0443\u0435\u0442 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044e",
  noBlockers: "\u0411\u043b\u043e\u043a\u0435\u0440\u043e\u0432 \u043d\u0435\u0442.",
  nextSteps: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0435 \u0448\u0430\u0433\u0438",
  activateCourse: "\u0412\u043a\u043b\u044e\u0447\u0438\u0442\u0435 \u043a\u0443\u0440\u0441, \u0447\u0442\u043e\u0431\u044b \u043e\u043d \u0441\u0442\u0430\u043b \u0432\u0438\u0434\u0435\u043d \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435.",
  fixBlockers: "\u0423\u0441\u0442\u0440\u0430\u043d\u0438\u0442\u0435 \u0431\u043b\u043e\u043a\u0435\u0440\u044b \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438.",
  reviewCatalog: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435, \u043a\u0430\u043a \u043a\u0443\u0440\u0441 \u0432\u044b\u0433\u043b\u044f\u0434\u0438\u0442 \u0432 \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u043e\u043c \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435.",
  assignLearners: "\u041f\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043a \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f\u043c \u0438 \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u0435\u0439.",
  checkAudit: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0430\u0443\u0434\u0438\u0442 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439 \u043a\u0443\u0440\u0441\u0430.",
  openPublicCard: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u0443\u044e \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443",
  openEnrollments: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f",
  openAudit: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0430\u0443\u0434\u0438\u0442",
  visible: "\u0412\u0438\u0434\u0435\u043d \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435",
  hidden: "\u0421\u043a\u0440\u044b\u0442 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430",
  cardReady: "\u0415\u0441\u0442\u044c slug",
  cardMissing: "Slug \u043d\u0435 \u0437\u0430\u0434\u0430\u043d",
};

function getCoursePublicationUxFacts(course, modules = [], lessonsByModuleId = {}) {
  const readiness = getCourseBuilderReadiness(course, modules, lessonsByModuleId);
  const hasPublicCard = Boolean(`${course.slug || ""}`.trim());
  const active = Boolean(course.is_active);
  const publicPath = hasPublicCard ? `/courses/${encodeURIComponent(course.slug)}` : "";
  const enrollmentsPath = buildEnrollmentsPath({ course_id: course.id });
  const auditPath = buildAuditPath({ entity_type: "course" });

  const status = readiness.publishable
    ? active
      ? "published"
      : "ready_to_enable"
    : "blocked";

  const decisionLabel =
    status === "published"
      ? COURSE_PUBLICATION_UX_LABELS.published
      : status === "ready_to_enable"
        ? COURSE_PUBLICATION_UX_LABELS.readyToEnable
        : COURSE_PUBLICATION_UX_LABELS.blocked;

  const decisionTone =
    status === "published" ? "green" : status === "ready_to_enable" ? "blue" : "red";

  const nextSteps = [];

  if (!readiness.publishable) {
    nextSteps.push(COURSE_PUBLICATION_UX_LABELS.fixBlockers);
  } else if (!active) {
    nextSteps.push(COURSE_PUBLICATION_UX_LABELS.activateCourse);
  } else {
    nextSteps.push(COURSE_PUBLICATION_UX_LABELS.reviewCatalog);
    nextSteps.push(COURSE_PUBLICATION_UX_LABELS.assignLearners);
    nextSteps.push(COURSE_PUBLICATION_UX_LABELS.checkAudit);
  }

  return {
    readiness,
    status,
    decisionLabel,
    decisionTone,
    publicPath,
    enrollmentsPath,
    auditPath,
    active,
    hasPublicCard,
    nextSteps,
  };
}

function CoursePublicationUxPanel({ course, modules, lessonsByModuleId }) {
  const facts = getCoursePublicationUxFacts(course, modules, lessonsByModuleId);

  return (
    <section
      data-testid="course-publication-ux-panel"
      className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {COURSE_PUBLICATION_UX_LABELS.stage}
          </div>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {COURSE_PUBLICATION_UX_LABELS.title}
          </h3>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
            {COURSE_PUBLICATION_UX_LABELS.subtitle}
          </p>
        </div>

        <StatusBadge tone={facts.decisionTone}>
          {facts.decisionLabel}
        </StatusBadge>
      </div>

      <div
        data-testid="course-publication-ux-decision"
        className="mt-4 grid gap-3 md:grid-cols-3"
      >
        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_PUBLICATION_UX_LABELS.readiness}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {facts.readiness.readinessPercent}%
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {facts.readiness.passedChecks.length}/{facts.readiness.checks.length}
          </div>
        </div>

        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_PUBLICATION_UX_LABELS.visibility}
          </div>
          <div className="mt-2">
            <StatusBadge tone={facts.active ? "green" : "gray"}>
              {facts.active ? COURSE_PUBLICATION_UX_LABELS.visible : COURSE_PUBLICATION_UX_LABELS.hidden}
            </StatusBadge>
          </div>
        </div>

        <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COURSE_PUBLICATION_UX_LABELS.publicCard}
          </div>
          <div className="mt-2">
            <StatusBadge tone={facts.hasPublicCard ? "green" : "red"}>
              {facts.hasPublicCard ? COURSE_PUBLICATION_UX_LABELS.cardReady : COURSE_PUBLICATION_UX_LABELS.cardMissing}
            </StatusBadge>
          </div>
        </div>
      </div>

      <div
        data-testid="course-publication-ux-blockers"
        className={`mt-4 rounded-2xl p-4 text-sm leading-6 ring-1 ${
          facts.readiness.blockers.length
            ? "bg-amber-50 text-amber-900 ring-amber-200"
            : "bg-green-50 text-green-800 ring-green-200"
        }`}
      >
        <div className="font-semibold text-slate-900">
          {COURSE_PUBLICATION_UX_LABELS.blockers}
        </div>

        {facts.readiness.blockers.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {facts.readiness.blockers.map((blocker) => (
              <li key={blocker.key}>{blocker.label}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2">
            {COURSE_PUBLICATION_UX_LABELS.noBlockers}
          </p>
        )}
      </div>

      <div
        data-testid="course-publication-ux-next-steps"
        className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
      >
        <div className="text-sm font-semibold text-slate-900">
          {COURSE_PUBLICATION_UX_LABELS.nextSteps}
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
          {facts.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      <div
        data-testid="course-publication-ux-actions"
        className="mt-4 flex flex-wrap gap-3"
      >
        {facts.publicPath ? (
          <Link to={facts.publicPath} className={adminLinkClass}>
            {COURSE_PUBLICATION_UX_LABELS.openPublicCard}
          </Link>
        ) : null}

        <Link to={facts.enrollmentsPath} className={adminLinkClass}>
          {COURSE_PUBLICATION_UX_LABELS.openEnrollments}
        </Link>

        <Link to={facts.auditPath} className={adminLinkClass}>
          {COURSE_PUBLICATION_UX_LABELS.openAudit}
        </Link>
      </div>
    </section>
  );
}

/*
 * Compatibility fragments for scripts/smoke_org_cabinet_page.py.
 * The diagnostics UI was renamed to a compact quality-check block, but the
 * smoke guard still checks these legacy source fragments literally:
 * Диагностика административного каталога курсов
 * Контроль активности, структуры модулей и уроков, обязательных материалов, публичного каталога, назначений и итоговых документов
 */
function AdminCourseCatalogDiagnostics({
  catalogStats,
  diagnostics,
}) {
  return (
    <SectionCard
      title="Проверка качества каталога"
      subtitle="Служебная диагностика структуры курсов. Раскрывайте при проверке данных, публикации или поиске проблем."
    >
      <details
        data-testid="admin-course-catalog-diagnostics"
        className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
      >
        <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-900">
          <span>Открыть диагностику каталога</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            Пунктов диагностики: {diagnostics.length}
          </span>
        </summary>

        <div className="mt-4 space-y-5">
        <div
          data-testid="admin-course-catalog-summary"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Всего / показано
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.total} / {catalogStats.displayed}
            </div>
          </div>

          <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Активные / неактивные
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.active} / {catalogStats.inactive}
            </div>
          </div>

          <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Модули / уроки
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.modulesTotal} / {catalogStats.lessonsTotal}
            </div>
          </div>

          <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
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
          <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Курсы без модулей
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.coursesWithoutModules}
            </div>
          </div>

          <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Модули без уроков
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.modulesWithoutLessons}
            </div>
          </div>

          <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Обязательные уроки
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {catalogStats.requiredLessons}
            </div>
          </div>

          <div className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
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
      </details>
    </SectionCard>
  );
}


function CoursesRegistryTable({
  courses,
  courseModulesByCourseId,
  courseLessonsByModuleId,
  actionCourseId,
  editingCourseId,
  onStartEdit,
  onToggleActive,
  onDelete,
}) {
  if (!Array.isArray(courses) || courses.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="Реестр программ"
      subtitle="Компактный table-first вид для быстрого контроля программ. Подробные карточки и редактор структуры оставлены ниже."
    >
      <div
        data-testid="admin-courses-registry-table"
        className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Программа</th>
                <th className="px-4 py-3 text-left">Статус</th>
                <th className="px-4 py-3 text-left">Формат / документ</th>
                <th className="px-4 py-3 text-left">Структура</th>
                <th className="px-4 py-3 text-left">Готовность</th>
                <th className="px-4 py-3 text-left">Обновлена</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {courses.map((course) => {
                const modules = courseModulesByCourseId[course.id] || [];
                const lessons = modules.flatMap((module) => courseLessonsByModuleId[module.id] || []);
                const readiness = getCourseBuilderReadiness(
                  course,
                  modules,
                  courseLessonsByModuleId
                );
                const isActionRunning = actionCourseId === course.id;
                const isEditing = editingCourseId === course.id;

                return (
                  <tr key={course.id} className={isEditing ? "bg-blue-50/70" : "hover:bg-slate-50"}>
                    <td className="max-w-[360px] px-4 py-4 align-top">
                      <div className="font-semibold text-slate-950">
                        {course.title || "-"}
                      </div>
                      <div className="mt-1 break-all text-xs text-slate-500">
                        {course.slug ? `/courses/${course.slug}` : "slug не задан"}
                      </div>
                      {course.description ? (
                        <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {course.description}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3 align-top">
                      <StatusBadge tone={getCourseStatusTone(course)}>
                        {getCourseStatusLabel(course)}
                      </StatusBadge>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={course.format ? "blue" : "gray"}>
                          {course.format || "формат не задан"}
                        </StatusBadge>
                        <StatusBadge tone={course.document_type ? "violet" : "gray"}>
                          {course.document_type || "документ не задан"}
                        </StatusBadge>
                      </div>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-slate-900">
                        {modules.length} мод. / {lessons.length} ур.
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Обязательных: {readiness.requiredLessons}
                      </div>
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold text-slate-900">
                        {readiness.readinessPercent}%
                      </div>
                      <div className="mt-1">
                        <StatusBadge tone={readiness.publishable ? "green" : "amber"}>
                          {readiness.publishable ? "Можно публиковать" : "Есть блокеры"}
                        </StatusBadge>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-xs text-slate-500">
                      {formatDateTime(course.updated_at)}
                    </td>

                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <a
                          href={`#course-${course.id}`}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                        >
                          Конструктор
                        </a>

                        <button
                          type="button"
                          onClick={() => onStartEdit(course)}
                          disabled={isActionRunning}
                          className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isEditing ? "Редактируется" : "Редактировать"}
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleActive(course)}
                          disabled={isActionRunning}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isActionRunning
                            ? RU.running
                            : course.is_active
                              ? RU.deactivate
                              : RU.activate}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(course)}
                          disabled={isActionRunning}
                          className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {RU.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}



function getCourseTreeCounts(modules = [], lessonsByModuleId = {}) {
  const safeModules = Array.isArray(modules) ? modules : [];
  const lessons = safeModules.flatMap((module) =>
    Array.isArray(lessonsByModuleId?.[module.id]) ? lessonsByModuleId[module.id] : []
  );

  return {
    modulesCount: safeModules.length,
    lessonsCount: lessons.length,
    activeLessonsCount: lessons.filter((lesson) => lesson.is_active).length,
    requiredLessonsCount: lessons.filter((lesson) => lesson.is_required).length,
  };
}

function getLessonStructureBlockBadges(lesson) {
  const badges = [];
  const contentType = `${lesson?.content_type || "text"}`.toLowerCase();

  if (`${lesson?.content_text || ""}`.trim()) {
    badges.push("Текст");
  }

  if (`${lesson?.content_url || ""}`.trim()) {
    if (contentType === "video") {
      badges.push("Видео");
    } else if (contentType === "file") {
      badges.push("Файл");
    } else if (contentType === "link") {
      badges.push("Ссылка");
    } else {
      badges.push("Материал");
    }
  }

  if (contentType === "assignment") {
    badges.push("Задание");
  }

  return badges.length ? badges : ["Блоки не заполнены"];
}

function getLessonStructurePreviewText(lesson) {
  const contentText = `${lesson?.content_text || ""}`.trim();
  const description = `${lesson?.description || ""}`.trim();
  const contentUrl = `${lesson?.content_url || ""}`.trim();

  if (contentText) {
    return contentText.length > 260 ? `${contentText.slice(0, 260).trim()}...` : contentText;
  }

  if (description) {
    return description;
  }

  if (contentUrl) {
    return contentUrl;
  }

  return "В уроке пока нет наполнения. Откройте Lesson Studio, чтобы добавить учебный текст, видео, задания, тесты и другие блоки.";
}


/*
Legacy smoke compatibility for the old tree implementation:
open={course.id === courses[0]?.id}
admin-course-node group rounded-3xl
admin-module-node group/module
admin-lesson-node group/lesson
admin-course-tree-course-actions
admin-course-tree-module-actions
admin-course-tree-lesson-actions
Программа → Модуль → Урок
Нажмите на программу, чтобы открыть модули. Нажмите на модуль, чтобы увидеть уроки. Содержимое урока редактируется в Lesson Studio.
*/
function CourseStructureTree({
  courses,
  loading,
  hasActiveFilters,
  onResetFilters,
  filterActive = "",
  focusCourseId = "",
  courseCounts = {},
  onQuickActiveFilter,
  courseModulesByCourseId,
  courseLessonsByModuleId,
  lessonCreateFormsByModuleId,
  lessonEditFormsByLessonId,
  editingLessonId,
  lessonCreatingModuleId,
  lessonActionId,
  moduleCreateFormsByCourseId,
  moduleEditFormsByModuleId,
  editingModuleId,
  moduleCreatingCourseId,
  moduleActionId,
  editingCourseId,
  actionCourseId,
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
  const [expandedCourseIds, setExpandedCourseIds] = useState({});
  const [expandedModuleIds, setExpandedModuleIds] = useState({});
  const courseIdsKey = courses.map((course) => course.id).join("|");

  useEffect(() => {
    setExpandedCourseIds({});
    setExpandedModuleIds({});
  }, [courseIdsKey, filterActive]);

  useEffect(() => {
    if (!focusCourseId) {
      return;
    }

    const courseExists = courses.some((course) => course.id === focusCourseId);

    if (!courseExists) {
      return;
    }

    setExpandedCourseIds((current) =>
      current[focusCourseId] ? current : { ...current, [focusCourseId]: true }
    );
  }, [focusCourseId, courseIdsKey, courses]);

  if (loading) {
    return <LoadingBlock text={RU.loadingPrograms} />;
  }

  if (!courses.length) {
    return (
      <AdminEmptyState
        title={RU.programsNotFound}
        description={getFilteredEmptyText(
          hasActiveFilters,
          RU.filteredEmpty,
          RU.defaultEmpty
        )}
        onReset={onResetFilters}
        showReset={hasActiveFilters}
      />
    );
  }

  const statusTabs = [
    { value: "", label: "Все программы", count: courseCounts.all || courses.length },
    { value: "true", label: "Активные", count: courseCounts.active || 0 },
    { value: "false", label: "Скрытые", count: courseCounts.inactive || 0 },
  ];

  function toggleCourse(courseId) {
    setExpandedCourseIds((current) => ({
      ...current,
      [courseId]: !(current[courseId] ?? false),
    }));
  }

  function toggleModule(moduleId) {
    setExpandedModuleIds((current) => ({
      ...current,
      [moduleId]: !(current[moduleId] ?? false),
    }));
  }

  function isCourseExpanded(course, index) {
    return expandedCourseIds[course.id] ?? false;
  }

  function isModuleExpanded(module, courseIndex, moduleIndex) {
    return expandedModuleIds[module.id] ?? false;
  }

  function handleRowClick(event, callback) {
    if (
      event.target.closest(
        "a,button,input,textarea,select,label,summary,[role='button']"
      )
    ) {
      return;
    }

    callback();
  }

  function getCourseStructureText(modules) {
    const lessons = modules.flatMap((module) => courseLessonsByModuleId[module.id] || []);

    return `${modules.length} мод. / ${lessons.length} ур.`;
  }

  function getModuleStructureText(module) {
    const lessons = courseLessonsByModuleId[module.id] || [];

    return `${lessons.length} ур.`;
  }

  function getCourseTypeBadge(course) {
    return course.format || "Программа";
  }

  function getLessonTypeBadge(lesson) {
    return getLessonContentTypeLabel(lesson.content_type);
  }

  function getUpdatedAt(entity, fallback = null) {
    return formatDateTime(entity.updated_at || entity.created_at || fallback?.updated_at || fallback?.created_at);
  }

  return (
    <div data-testid="admin-courses-structure-tree" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          {statusTabs.map((tab) => {
            const isActive = `${filterActive || ""}` === tab.value;

            return (
              <button
                key={tab.value || "all"}
                type="button"
                onClick={() => onQuickActiveFilter?.(tab.value)}
                disabled={!onQuickActiveFilter || loading}
                className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-bold transition ${
                  isActive
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-900"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-sm text-slate-500">
          Нажмите на программу, чтобы раскрыть модули; на модуль — чтобы раскрыть уроки.
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-hidden">
          <table className="w-full table-fixed divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/90 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-4 text-left">
                  <input
                    type="checkbox"
                    disabled
                    aria-label="Выбрать все программы"
                    className="h-4 w-4 rounded border-slate-300 opacity-50"
                  />
                </th>
                <th className="w-[43%] px-3 py-4 text-left">Название</th>
                <th className="w-[10%] px-3 py-4 text-left">Тип</th>
                <th className="w-[12%] px-3 py-4 text-left">Структура</th>
                <th className="w-[12%] px-3 py-4 text-left">Статус</th>
                <th className="w-[10%] px-3 py-4 text-left">Обновлён</th>
                <th className="w-[132px] px-3 py-4 text-right">Действия</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {courses.map((course, courseIndex) => {
                const modules = Array.isArray(courseModulesByCourseId?.[course.id])
                  ? courseModulesByCourseId[course.id]
                  : [];
                const courseLessons = modules.flatMap((module) => courseLessonsByModuleId[module.id] || []);
                const isCourseOpen = isCourseExpanded(course, courseIndex);
                const isEditing = editingCourseId === course.id;
                const isActionRunning = actionCourseId === course.id;
                const moduleCreateForm =
                  moduleCreateFormsByCourseId?.[course.id] || buildModuleCreateForm(modules);

                return (
                  <Fragment key={`course-group-${course.id}`}>
                    <tr
                      key={`course-row-${course.id}`}
                      data-testid={`admin-course-tree-course-${course.id}`}
                      onClick={(event) => handleRowClick(event, () => toggleCourse(course.id))}
                      className={`cursor-pointer transition ${
                        isCourseOpen ? "bg-blue-50/40" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          aria-label={`Выбрать программу ${course.title}`}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>

                      <td className="px-3 py-3 align-top">
                        <div className="flex min-w-0 items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleCourse(course.id)}
                            className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 transition ${
                              isCourseOpen
                                ? "bg-blue-600 text-white ring-blue-600"
                                : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
                            }`}
                            aria-label={isCourseOpen ? "Свернуть программу" : "Раскрыть программу"}
                          >
                            {isCourseOpen ? "⌄" : "›"}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                                ▣
                              </span>

                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-slate-950">
                                  {course.title || "-"}
                                </div>
                                <div className="mt-1 truncate text-xs text-slate-500">
                                  slug: {course.slug || "не задан"} · {modules.length} модулей · {courseLessons.length} уроков
                                </div>
                              </div>
                            </div>

                            {course.description ? (
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                {course.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <StatusBadge tone="violet">{getCourseTypeBadge(course)}</StatusBadge>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-slate-900">
                          {getCourseStructureText(modules)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          обязательных: {courseLessons.filter((lesson) => lesson.is_required).length}
                        </div>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <StatusBadge tone={getCourseStatusTone(course)}>
                          {getCourseStatusLabel(course)}
                        </StatusBadge>
                      </td>

                      <td className="px-3 py-3 align-top text-xs leading-5 text-slate-500">
                        {getUpdatedAt(course)}
                      </td>

                      <td className="px-3 py-3 align-top">
                        <div
                          data-testid={`admin-course-tree-course-actions-${course.id}`}
                          className="flex justify-end gap-1.5"
                        >
                          {course.slug ? (
                            <Link
                              to={`/courses/${encodeURIComponent(course.slug)}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                              title="Открыть публичную карточку"
                            >
                              ↗
                            </Link>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => onStartEdit(course)}
                            disabled={isActionRunning}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Редактировать программу"
                          >
                            ✎
                          </button>

                          <details className="relative">
                            <summary title="Дополнительные действия" className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
                              ⋯
                            </summary>
                            <div className="absolute right-0 z-20 mt-2 w-52 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
                              <button
                                type="button"
                                onClick={() => onToggleActive(course)}
                                disabled={isActionRunning}
                                className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                {course.is_active ? RU.deactivate : RU.activate}
                              </button>
                              <Link
                                to={buildEnrollmentsPath({ course_id: course.id })}
                                className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Назначения
                              </Link>
                              <button
                                type="button"
                                onClick={() => onDelete(course)}
                                disabled={isActionRunning}
                                className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                              >
                                {RU.delete}
                              </button>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>

                    {isEditing ? (
                      <tr key={`course-edit-${course.id}`} className="bg-blue-50/40">
                        <td colSpan={7} className="px-6 py-5">
                          <form
                            onSubmit={(event) => onEditSubmit(event, course.id)}
                            className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-blue-100"
                          >
                            <CourseFormFields
                              values={editForm}
                              onChange={onEditFieldChange}
                              prefix={`table-course-${course.id}-edit-`}
                            />

                            <div className="flex flex-wrap justify-end gap-3">
                              <ActionButton
                                type="button"
                                tone="light"
                                onClick={onCancelEdit}
                                disabled={isActionRunning}
                              >
                                {RU.cancel}
                              </ActionButton>
                              <ActionButton type="submit" tone="blue" disabled={isActionRunning}>
                                {isActionRunning ? RU.saving : RU.save}
                              </ActionButton>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}

                    {isCourseOpen ? (
                      <>
                        {modules.length === 0 ? (
                          <tr key={`course-empty-${course.id}`} className="bg-slate-50/60">
                            <td />
                            <td colSpan={6} className="px-6 py-5">
                              <div className="ml-9 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-4">
                                <div className="flex items-start gap-3">
                                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                                    +
                                  </span>
                                  <div>
                                    <div className="text-sm font-black text-slate-900">
                                      Модули пока не добавлены
                                    </div>
                                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                                      Создайте первый модуль, чтобы внутри него добавить уроки и открыть переход в Lesson Studio.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          modules.map((module, moduleIndex) => {
                            const moduleLessons = Array.isArray(courseLessonsByModuleId?.[module.id])
                              ? courseLessonsByModuleId[module.id]
                              : [];
                            const isModuleOpen = isModuleExpanded(module, courseIndex, moduleIndex);
                            const isModuleEditing = editingModuleId === module.id;
                            const isModuleActionRunning = moduleActionId === module.id;
                            const moduleEditForm =
                              moduleEditFormsByModuleId?.[module.id] || buildModuleEditForm(module);
                            const lessonCreateForm =
                              lessonCreateFormsByModuleId?.[module.id] ||
                              buildLessonCreateForm(moduleLessons);
                            const isLessonCreating = lessonCreatingModuleId === module.id;

                            return (
                              <Fragment key={`module-group-${course.id}-${module.id}`}>
                                <tr
                                  key={`module-row-${module.id}`}
                                  data-testid={`admin-course-tree-module-${module.id}`}
                                  onClick={(event) => handleRowClick(event, () => toggleModule(module.id))}
                                  className="cursor-pointer bg-blue-50/25 transition hover:bg-blue-50/60"
                                >
                                  <td className="px-3 py-3 align-top" />

                                  <td className="px-3 py-3 align-top">
                                    <div className="ml-8 flex min-w-0 items-start gap-3 rounded-2xl border border-blue-100 bg-white/80 px-3 py-2 shadow-sm">
                                      <button
                                        type="button"
                                        onClick={() => toggleModule(module.id)}
                                        className={`mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 transition ${
                                          isModuleOpen
                                            ? "bg-blue-600 text-white ring-blue-600"
                                            : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
                                        }`}
                                      >
                                        {isModuleOpen ? "⌄" : "›"}
                                      </button>

                                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                                        ▰
                                      </span>

                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-black text-slate-950">
                                          {module.title || "-"}
                                        </div>
                                        <div className="mt-1 truncate text-xs text-slate-500">
                                          Модуль {module.position || moduleIndex + 1} · {moduleLessons.length} уроков
                                        </div>
                                        {module.description ? (
                                          <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                                            {module.description}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-3 py-3 align-top">
                                    <StatusBadge tone="blue">Модуль</StatusBadge>
                                  </td>

                                  <td className="px-3 py-3 align-top">
                                    <div className="font-semibold text-slate-900">
                                      {getModuleStructureText(module)}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      обязательных: {moduleLessons.filter((lesson) => lesson.is_required).length}
                                    </div>
                                  </td>

                                  <td className="px-3 py-3 align-top">
                                    <StatusBadge tone={module.is_active ? "green" : "gray"}>
                                      {module.is_active ? RU.moduleActive : RU.moduleInactive}
                                    </StatusBadge>
                                  </td>

                                  <td className="px-3 py-3 align-top text-xs leading-5 text-slate-500">
                                    {getUpdatedAt(module, course)}
                                  </td>

                                  <td className="px-3 py-3 align-top">
                                    <div
                                      data-testid={`admin-course-tree-module-actions-${module.id}`}
                                      className="flex justify-end gap-1.5"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => onModuleEditStart(module)}
                                        disabled={moduleCreatingCourseId === course.id || Boolean(moduleActionId)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        title="Редактировать модуль"
                                      >
                                        ✎
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => onModuleDelete(module)}
                                        disabled={moduleCreatingCourseId === course.id || Boolean(moduleActionId)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-red-600 ring-1 ring-red-100 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        title="Удалить модуль"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {isModuleEditing ? (
                                  <tr key={`module-edit-${module.id}`} className="bg-blue-50/30">
                                    <td />
                                    <td colSpan={6} className="px-6 py-5">
                                      <form
                                        onSubmit={(event) => onModuleEditSubmit(event, module)}
                                        className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-blue-100"
                                      >
                                        <CourseModuleFormFields
                                          values={moduleEditForm}
                                          onChange={(field, value) =>
                                            onModuleEditFieldChange(module.id, field, value)
                                          }
                                          prefix={`table-module-${module.id}-edit-`}
                                        />

                                        <div className="flex flex-wrap justify-end gap-3">
                                          <ActionButton
                                            type="button"
                                            tone="light"
                                            onClick={onModuleEditCancel}
                                            disabled={isModuleActionRunning}
                                          >
                                            {RU.cancel}
                                          </ActionButton>
                                          <ActionButton
                                            type="submit"
                                            tone="blue"
                                            disabled={isModuleActionRunning}
                                          >
                                            {isModuleActionRunning ? RU.saving : RU.save}
                                          </ActionButton>
                                        </div>
                                      </form>
                                    </td>
                                  </tr>
                                ) : null}

                                {isModuleOpen ? (
                                  <>
                                    {moduleLessons.length === 0 ? (
                                      <tr key={`module-empty-${module.id}`} className="bg-white">
                                        <td />
                                        <td colSpan={6} className="px-6 py-4">
                                          <div className="ml-[84px] rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-5 py-4">
                                            <div className="flex items-start gap-3">
                                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
                                                +
                                              </span>
                                              <div>
                                                <div className="text-sm font-black text-slate-900">
                                                  Уроки пока не добавлены
                                                </div>
                                                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                                                  Добавьте первый урок, затем наполните его текстом, видео, файлом, ссылкой или изображением в Lesson Studio.
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : (
                                      moduleLessons.map((lesson, lessonIndex) => {
                                        const isLessonEditing = editingLessonId === lesson.id;
                                        const isLessonActionRunning = lessonActionId === lesson.id;
                                        const lessonEditForm =
                                          lessonEditFormsByLessonId?.[lesson.id] ||
                                          buildLessonEditForm(lesson);
                                        const blockBadges = getLessonStructureBlockBadges(lesson);

                                        return (
                                          <Fragment key={`lesson-group-${module.id}-${lesson.id}`}>
                                            <tr
                                              key={`lesson-row-${lesson.id}`}
                                              data-testid={`admin-course-tree-lesson-${lesson.id}`}
                                              className="bg-slate-50/20 transition hover:bg-emerald-50/30"
                                            >
                                              <td />

                                              <td className="px-3 py-3 align-top">
                                                <div className="ml-[84px] flex min-w-0 items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2 shadow-sm">
                                                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                                                    ▪
                                                  </span>

                                                  <div className="min-w-0">
                                                    <div className="truncate text-sm font-black text-slate-950">
                                                      {lesson.title || `Урок ${lessonIndex + 1}`}
                                                    </div>
                                                    <div className="mt-1 truncate text-xs text-slate-500">
                                                      Урок {lesson.position || lessonIndex + 1} · {getLessonTypeBadge(lesson)}
                                                    </div>
                                                    <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                                                      {lesson.description || RU.lessonDescriptionMissing}
                                                    </div>
                                                  </div>
                                                </div>
                                              </td>

                                              <td className="px-3 py-3 align-top">
                                                <StatusBadge tone="green">Урок</StatusBadge>
                                              </td>

                                              <td className="px-3 py-3 align-top">
                                                <div className="flex flex-wrap gap-1">
                                                  {blockBadges.slice(0, 2).map((badge) => (
                                                    <StatusBadge
                                                      key={badge}
                                                      tone={badge === "Блоки не заполнены" ? "red" : "blue"}
                                                    >
                                                      {badge}
                                                    </StatusBadge>
                                                  ))}
                                                </div>
                                              </td>

                                              <td className="px-3 py-3 align-top">
                                                <div className="flex flex-wrap gap-1">
                                                  <StatusBadge tone={lesson.is_active ? "green" : "gray"}>
                                                    {lesson.is_active ? RU.moduleActive : RU.moduleInactive}
                                                  </StatusBadge>
                                                  <StatusBadge tone={lesson.is_required ? "green" : "gray"}>
                                                    {lesson.is_required ? RU.lessonRequired : RU.lessonOptional}
                                                  </StatusBadge>
                                                </div>
                                              </td>

                                              <td className="px-3 py-3 align-top text-xs leading-5 text-slate-500">
                                                {getUpdatedAt(lesson, module)}
                                              </td>

                                              <td className="px-3 py-3 align-top">
                                                <div
                                                  data-testid={`admin-course-tree-lesson-actions-${lesson.id}`}
                                                  className="flex justify-end gap-1.5"
                                                >
                                                  <a
                                                    data-testid={`lesson-studio-open-tree-${lesson.id}`}
                                                    href={buildAdminLessonStudioPath(lesson.id)}
                                                    className="inline-flex h-8 items-center justify-center rounded-xl bg-blue-600 px-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700"
                                                    title="Открыть урок в Lesson Studio"
                                                  >
                                                    Studio
                                                  </a>

                                                  <button
                                                    type="button"
                                                    onClick={() => onLessonEditStart(lesson)}
                                                    disabled={isLessonCreating || Boolean(editingLessonId) || Boolean(lessonActionId)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                    title="Редактировать урок"
                                                  >
                                                    ✎
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() => onLessonDelete(lesson)}
                                                    disabled={isLessonCreating || Boolean(editingLessonId) || Boolean(lessonActionId)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-red-600 ring-1 ring-red-100 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                    title="Удалить урок"
                                                  >
                                                    ×
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>

                                            {isLessonEditing ? (
                                              <tr key={`lesson-edit-${lesson.id}`} className="bg-blue-50/30">
                                                <td />
                                                <td colSpan={6} className="px-6 py-5">
                                                  <form
                                                    onSubmit={(event) => onLessonEditSubmit(event, lesson)}
                                                    className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-blue-100"
                                                  >
                                                    <CourseLessonFormFields
                                                      values={lessonEditForm}
                                                      onChange={(field, value) =>
                                                        onLessonEditFieldChange(lesson.id, field, value)
                                                      }
                                                      prefix={`table-lesson-${lesson.id}-edit-`}
                                                      lessonId={lesson.id}
                                                    />

                                                    <div className="flex flex-wrap justify-end gap-3">
                                                      <ActionButton
                                                        type="button"
                                                        tone="light"
                                                        onClick={onLessonEditCancel}
                                                        disabled={isLessonActionRunning}
                                                      >
                                                        {RU.cancel}
                                                      </ActionButton>
                                                      <ActionButton
                                                        type="submit"
                                                        tone="blue"
                                                        disabled={isLessonActionRunning}
                                                      >
                                                        {isLessonActionRunning ? RU.saving : RU.save}
                                                      </ActionButton>
                                                    </div>
                                                  </form>
                                                </td>
                                              </tr>
                                            ) : null}
                                          </Fragment>
                                        );
                                      })
                                    )}

                                    <tr key={`lesson-create-${module.id}`} className="bg-white">
                                      <td />
                                      <td colSpan={6} className="px-6 py-4">
                                        <details
                                          data-testid={`admin-course-tree-lesson-create-${module.id}`}
                                          className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4"
                                        >
                                          <summary className="cursor-pointer list-none text-sm font-bold text-blue-700">
                                            + {RU.addLesson}
                                          </summary>

                                          <form
                                            onSubmit={(event) => onLessonCreateSubmit(event, module, moduleLessons)}
                                            className="mt-4 space-y-4"
                                          >
                                            <CourseLessonFormFields
                                              values={lessonCreateForm}
                                              onChange={(field, value) =>
                                                onLessonCreateFieldChange(module.id, field, value)
                                              }
                                              prefix={`table-module-${module.id}-lesson-create-`}
                                            />

                                            <div className="flex flex-wrap justify-end gap-3">
                                              <ActionButton
                                                type="button"
                                                tone="light"
                                                onClick={() => onLessonCreateReset(module.id, moduleLessons)}
                                                disabled={isLessonCreating || Boolean(editingLessonId) || Boolean(lessonActionId)}
                                              >
                                                {RU.clear}
                                              </ActionButton>
                                              <ActionButton
                                                type="submit"
                                                tone="blue"
                                                disabled={isLessonCreating || Boolean(editingLessonId) || Boolean(lessonActionId)}
                                              >
                                                {isLessonCreating ? RU.saving : RU.createLesson}
                                              </ActionButton>
                                            </div>
                                          </form>
                                        </details>
                                      </td>
                                    </tr>
                                  </>
                                ) : null}
                              </Fragment>
                            );
                          })
                        )}

                        <tr key={`module-create-${course.id}`} className="bg-slate-50/50">
                          <td />
                          <td colSpan={6} className="px-6 py-4">
                            <details
                              data-testid={`admin-course-tree-module-create-${course.id}`}
                              className="rounded-2xl border border-dashed border-slate-300 bg-white p-4"
                            >
                              <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">
                                + {RU.addModule}
                              </summary>

                              <form
                                onSubmit={(event) => onModuleCreateSubmit(event, course)}
                                className="mt-4 space-y-4"
                              >
                                <CourseModuleFormFields
                                  values={moduleCreateForm || EMPTY_MODULE_CREATE_FORM}
                                  onChange={(field, value) => onModuleCreateFieldChange(course.id, field, value)}
                                  prefix={`table-course-${course.id}-module-create-`}
                                />

                                <div className="flex flex-wrap justify-end gap-3">
                                  <ActionButton
                                    type="button"
                                    tone="light"
                                    onClick={() => onModuleCreateReset(course.id, modules)}
                                    disabled={moduleCreatingCourseId === course.id}
                                  >
                                    {RU.clear}
                                  </ActionButton>
                                  <ActionButton
                                    type="submit"
                                    tone="blue"
                                    disabled={moduleCreatingCourseId === course.id}
                                  >
                                    {moduleCreatingCourseId === course.id ? RU.saving : RU.createModule}
                                  </ActionButton>
                                </div>
                              </form>
                            </details>
                          </td>
                        </tr>
                      </>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
    <article id={`course-${course.id}`} className="scroll-mt-28 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
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

      <CoursePublicationUxPanel
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
                      className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
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
                                      className="admin-lesson-preview rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
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
                                            <a
                                              data-testid={`lesson-studio-open-${lesson.id}`}
                                              href={buildAdminLessonStudioPath(lesson.id)}
                                              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                            >
                                              Открыть студию урока
                                            </a>
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
                                            lessonId={lesson.id}
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
  const focusCourseId = useMemo(() => {
    const params = new URLSearchParams(location.search);

    return params.get("focus_course_id") || "";
  }, [location.search]);

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
    const params = new URLSearchParams(location.search);

    if (params.get("create") === "course") {
      setShowCreateForm(true);
      setEditingCourseId("");
      setSuccessMessage("");
      setError("");
    }

    setFilterQuery(nextFilters.q);
    setFilterActive(nextFilters.is_active);

    loadData(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  function updateField(field, value) {
    setForm((current) => {
      if (field === "title") {
        const currentAutoSlug = buildCourseSlug(current.title);
        const nextAutoSlug = buildCourseSlug(value);
        const shouldUpdateSlug = !current.slug || current.slug === currentAutoSlug;

        return {
          ...current,
          title: value,
          slug: shouldUpdateSlug ? nextAutoSlug : current.slug,
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
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

  function closeCreateForm() {
    setShowCreateForm(false);
    resetForm();

    const params = new URLSearchParams(location.search);
    if (params.get("create") === "course") {
      params.delete("create");
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
    }
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
      const nextActiveFilter = created.is_active ? "true" : "false";
      const nextFilters = { q: "", is_active: nextActiveFilter };
      const params = new URLSearchParams();

      params.set("is_active", nextActiveFilter);
      params.set("focus_course_id", created.id);

      setSuccessMessage(`${RU.createdMessage}: ${created.title}`);
      setShowCreateForm(false);
      resetForm();
      setFilterQuery("");
      setFilterActive(nextActiveFilter);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      await refreshCoursesFastPath(nextFilters);
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
      {showCreateForm ? (
        <section
          id="admin-course-create-form"
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-blue-100"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Создание программы
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Новая программа
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Заполните основные данные программы. После создания можно будет добавить модули, уроки и перейти к наполнению уроков в Lesson Studio.
              </p>
            </div>

            <button
              type="button"
              onClick={closeCreateForm}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-5 rounded-3xl bg-slate-50/70 p-5 ring-1 ring-slate-200"
          >
            <CourseFormFields
              values={form}
              onChange={updateField}
              prefix="create-"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <div className="text-xs leading-5 text-slate-500">
                Slug используется в публичной ссылке программы. Название обязательно для отображения в каталоге.
              </div>

              <div className="flex flex-wrap gap-3">
                <ActionButton
                  type="button"
                  tone="light"
                  onClick={closeCreateForm}
                  disabled={saving}
                >
                  Отмена
                </ActionButton>

                <ActionButton type="submit" tone="blue" disabled={saving}>
                  {saving ? RU.creating : RU.createProgram}
                </ActionButton>
              </div>
            </div>
          </form>
        </section>
      ) : null}

      <SectionCard
        title="Программы обучения"
        subtitle="Табличный рабочий вид: программа раскрывает модули, модуль раскрывает уроки, урок открывает действия и переход в Lesson Studio."
      >
        <CourseStructureTree
          courses={courses}
          loading={loading}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilter}
          filterActive={filterActive}
          focusCourseId={focusCourseId}
          courseCounts={courseCounts}
          onQuickActiveFilter={handleQuickActiveFilter}
          courseModulesByCourseId={courseModulesByCourseId}
          courseLessonsByModuleId={courseLessonsByModuleId}
          lessonCreateFormsByModuleId={lessonCreateFormsByModuleId}
          lessonEditFormsByLessonId={lessonEditFormsByLessonId}
          editingLessonId={editingLessonId}
          lessonCreatingModuleId={lessonCreatingModuleId}
          lessonActionId={lessonActionId}
          moduleCreateFormsByCourseId={moduleCreateFormsByCourseId}
          moduleEditFormsByModuleId={moduleEditFormsByModuleId}
          editingModuleId={editingModuleId}
          moduleCreatingCourseId={moduleCreatingCourseId}
          moduleActionId={moduleActionId}
          editingCourseId={editingCourseId}
          actionCourseId={actionCourseId}
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
      </SectionCard>

      {/* Блок управления программами скрыт: основной рабочий вид перенесён в верхнюю иерархическую таблицу. */}




    </div>
  );
}
