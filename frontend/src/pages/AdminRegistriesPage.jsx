import { useCallback, useEffect, useMemo, useState } from "react";

import {
  approveAdminFrdoObligation,
  approveAdminMintrudObligation,
  prepareAdminFrdoRegistryExport,
  prepareAdminMintrudRegistryExport,
  reopenAdminFrdoObligation,
  reopenAdminMintrudObligation,
  downloadAdminFrdoSubmissionAttempt,
  downloadAdminMintrudSubmissionAttempt,
  getAdminFrdoObligations,
  getAdminFrdoSubmissionAttempts,
  getAdminMintrudObligations,
  getAdminMintrudSubmissionAttempts,
  markAdminFrdoSubmissionAttemptSubmitted,
  markAdminMintrudSubmissionAttemptSubmitted,
  recordAdminFrdoSubmissionAttemptResult,
  recordAdminMintrudSubmissionAttemptResult,
  updateAdminMintrudObligationContext,
  validateAdminFrdoObligation,
  validateAdminMintrudObligation,
} from "../api/client";
import { StatusBadge } from "../components/ui/StatusBadge";


const T = {
  title: "\u0413\u043e\u0441\u0440\u0435\u0435\u0441\u0442\u0440\u044b",
  subtitle: "\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432 \u0424\u0418\u0421 \u0424\u0420\u0414\u041e \u0438 \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430.",
  frdo: "\u0424\u0418\u0421 \u0424\u0420\u0414\u041e",
  mintrud: "\u041c\u0438\u043d\u0442\u0440\u0443\u0434",
  refresh: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c...",
  search: "\u041f\u043e\u0438\u0441\u043a",
  allStatuses: "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b",
  apply: "\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c",
  reset: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c",
  validate: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c",
  approve: "\u0423\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c",
  prepareExport: "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 JSON",
  reopen: "\u041d\u0430\u0447\u0430\u0442\u044c \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
  attempts: "\u041f\u043e\u043f\u044b\u0442\u043a\u0438",
  context: "\u0414\u0430\u043d\u043d\u044b\u0435 \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430",
  save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  cancel: "\u041e\u0442\u043c\u0435\u043d\u0430",
  download: "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 JSON",
  submitted: "\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0440\u0443\u0447\u043d\u0443\u044e \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0443",
  result: "\u0424\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442",
  noRows: "\u0417\u0430\u043f\u0438\u0441\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
  warning: "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 JSON \u0441\u043e\u0434\u0435\u0440\u0436\u0438\u0442 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u044b\u0439 \u0441\u043d\u0438\u043c\u043e\u043a \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u043e\u043f\u0435\u0440\u0430\u0442\u043e\u0440\u0441\u043a\u043e\u0439 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0438 \u0438 \u0430\u0443\u0434\u0438\u0442\u0430. \u042d\u0442\u043e \u043d\u0435 \u0444\u0430\u0439\u043b \u0434\u043b\u044f \u0438\u043c\u043f\u043e\u0440\u0442\u0430 \u0432 \u0424\u0418\u0421 \u0424\u0420\u0414\u041e \u0438\u043b\u0438 \u041c\u0438\u043d\u0442\u0440\u0443\u0434 \u0438 \u043d\u0435 \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u0432\u043d\u0435\u0448\u043d\u0435\u0433\u043e \u0440\u0435\u0435\u0441\u0442\u0440\u0430.",
  portalUnavailableTitle: "\u0424\u0430\u0439\u043b \u0434\u043b\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0432 \u043f\u043e\u0440\u0442\u0430\u043b \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d",
  portalUnavailable: "\u0424\u0430\u0439\u043b \u0434\u043b\u044f \u0440\u0443\u0447\u043d\u043e\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0432 \u043f\u043e\u0440\u0442\u0430\u043b \u043f\u043e\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d: \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u0438\u043c\u043f\u043e\u0440\u0442\u0430 \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d. \u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u0451\u0442 \u0442\u0430\u043a\u043e\u0439 \u0444\u0430\u0439\u043b \u0438 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442 \u0432\u043d\u0435\u0448\u043d\u044e\u044e \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0443 \u0434\u043e \u0444\u0438\u043a\u0441\u0430\u0446\u0438\u0438 \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442\u0430.",
};


const STATUS_LABELS = {
  not_required: "\u041d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f",
  pending_data: "\u041d\u0443\u0436\u043d\u044b \u0434\u0430\u043d\u043d\u044b\u0435",
  ready: "\u0413\u043e\u0442\u043e\u0432\u043e",
  needs_approval: "\u041d\u0443\u0436\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435",
  approved: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e",
  exported: "\u0424\u0430\u0439\u043b \u0434\u043b\u044f \u043f\u043e\u0440\u0442\u0430\u043b\u0430 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d",
  submitted: "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e",
  accepted: "\u041f\u0440\u0438\u043d\u044f\u0442\u043e",
  rejected: "\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e",
  correction_required: "\u041d\u0443\u0436\u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

const INTERNAL_EXPORT_ARTIFACT =
  "internal-export-package";

const PORTAL_UPLOAD_ARTIFACT =
  "portal-upload-artifact";

const ARTIFACT_KIND_LABELS = {
  [INTERNAL_EXPORT_ARTIFACT]:
    "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 JSON",
  [PORTAL_UPLOAD_ARTIFACT]:
    "\u0424\u0430\u0439\u043b \u0434\u043b\u044f \u043f\u043e\u0440\u0442\u0430\u043b\u0430",
};


function artifactKindLabel(attempt) {
  if (!attempt?.has_artifact) {
    return "\u0424\u0430\u0439\u043b \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442";
  }

  const kind =
    `${attempt?.artifact_kind || ""}`;

  return (
    ARTIFACT_KIND_LABELS[kind]
    || "\u0424\u0430\u0439\u043b \u043d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e\u0433\u043e \u0442\u0438\u043f\u0430"
  );
}


function artifactDownloadLabel(attempt) {
  if (
    attempt?.artifact_kind
    === PORTAL_UPLOAD_ARTIFACT
  ) {
    return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0444\u0430\u0439\u043b \u0434\u043b\u044f \u043f\u043e\u0440\u0442\u0430\u043b\u0430";
  }

  if (
    attempt?.artifact_kind
    === INTERNAL_EXPORT_ARTIFACT
  ) {
    return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 JSON";
  }

  return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0444\u0430\u0439\u043b";
}


function isPortalUploadArtifact(attempt) {
  return (
    attempt?.artifact_kind
    === PORTAL_UPLOAD_ARTIFACT
  );
}


function isHistoricalInternalLifecycle(attempt) {
  return (
    attempt?.artifact_kind
    === INTERNAL_EXPORT_ARTIFACT
    && Boolean(
      attempt?.submitted_at
      || attempt?.result_status
      || attempt?.external_reference
    )
  );
}


const READINESS_LABELS = {
  "enrollment.missing": "\u0417\u0430\u043f\u0438\u0441\u044c \u043e \u0437\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u0438 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442.",
  "enrollment.not_completed": "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0435\u0449\u0451 \u043d\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e.",
  "enrollment.completed_at_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430 \u0434\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f.",
  "course.missing": "\u041a\u0443\u0440\u0441 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442.",
  "course.title_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u0443\u0440\u0441\u0430.",
  "learner.missing": "\u0423\u0447\u0451\u0442\u043d\u0430\u044f \u0437\u0430\u043f\u0438\u0441\u044c \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442.",
  "learner_profile.missing": "\u041d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d \u0440\u0435\u0433\u0443\u043b\u044f\u0442\u043e\u0440\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f.",
  "learner_profile.last_name_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430 \u0444\u0430\u043c\u0438\u043b\u0438\u044f \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f.",
  "learner_profile.first_name_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e \u0438\u043c\u044f \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f.",
  "learner_profile.birth_date_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430 \u0434\u0430\u0442\u0430 \u0440\u043e\u0436\u0434\u0435\u043d\u0438\u044f \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f.",
  "learner_profile.sex_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d \u043f\u043e\u043b \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f.",
  "learner_profile.sex_invalid": "\u0423\u043a\u0430\u0437\u0430\u043d\u043e \u043d\u0435\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043c\u043e\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0430.",
  "learner_profile.citizenship_country_code_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d \u043a\u043e\u0434 \u0433\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u0442\u0432\u0430.",
  "learner_profile.citizenship_country_code_invalid": "\u041a\u043e\u0434 \u0433\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u0442\u0432\u0430 \u0434\u043e\u043b\u0436\u0435\u043d \u0441\u043e\u0441\u0442\u043e\u044f\u0442\u044c \u0438\u0437 \u0442\u0440\u0451\u0445 \u0446\u0438\u0444\u0440 \u041e\u041a\u0421\u041c.",
  "document.missing": "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u0438 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442.",
  "document.enrollment_mismatch": "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043e\u0442\u043d\u043e\u0441\u0438\u0442\u0441\u044f \u043a \u0434\u0440\u0443\u0433\u043e\u0439 \u0437\u0430\u043f\u0438\u0441\u0438 \u043e \u0437\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u0438\u0438.",
  "document.number_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.",
  "document.type_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d \u0442\u0438\u043f \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430.",
  "document.revoked": "\u0410\u043d\u043d\u0443\u043b\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043d\u0435\u043b\u044c\u0437\u044f \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u0434\u043b\u044f \u0432\u044b\u0433\u0440\u0443\u0437\u043a\u0438.",
  "learner_profile.snils_missing": "\u0414\u043b\u044f \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430 \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e \u0443\u043a\u0430\u0437\u0430\u0442\u044c \u0421\u041d\u0418\u041b\u0421 \u0441\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044f.",
  "mintrud.context_missing": "\u041d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u044b \u0434\u0430\u043d\u043d\u044b\u0435 \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430.",
  "mintrud.reporting_scenario_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0439 \u043e\u0442\u0447\u0451\u0442\u043d\u043e\u0441\u0442\u0438 \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430.",
  "mintrud.reporting_scenario_invalid": "\u0423\u043a\u0430\u0437\u0430\u043d \u043d\u0435\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043c\u044b\u0439 \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0439 \u043e\u0442\u0447\u0451\u0442\u043d\u043e\u0441\u0442\u0438 \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430.",
  "mintrud.profession_or_position_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u044f \u0438\u043b\u0438 \u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u043d\u0438\u043a\u0430.",
  "mintrud.knowledge_check_result_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0437\u043d\u0430\u043d\u0438\u0439.",
  "mintrud.knowledge_check_result_invalid": "\u0423\u043a\u0430\u0437\u0430\u043d\u043e \u043d\u0435\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043c\u043e\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0437\u043d\u0430\u043d\u0438\u0439.",
  "mintrud.knowledge_check_date_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430 \u0434\u0430\u0442\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0437\u043d\u0430\u043d\u0438\u0439.",
  "mintrud.protocol_number_missing": "\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d \u043d\u043e\u043c\u0435\u0440 \u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0437\u043d\u0430\u043d\u0438\u0439.",
  "mintrud.employer_name_missing": "\u0414\u043b\u044f \u0432\u043d\u0435\u0448\u043d\u0435\u0433\u043e \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e \u0443\u043a\u0430\u0437\u0430\u0442\u044c \u043d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435 \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044f.",
  "mintrud.employer_inn_missing": "\u0414\u043b\u044f \u0432\u043d\u0435\u0448\u043d\u0435\u0433\u043e \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e \u0443\u043a\u0430\u0437\u0430\u0442\u044c \u0418\u041d\u041d \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044f.",
  "mintrud.learn_program_missing": "\u0414\u043b\u044f \u043a\u0443\u0440\u0441\u0430 \u043d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0430 \u0430\u043a\u0442\u0438\u0432\u043d\u0430\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430 \u0441\u0445\u0435\u043c\u044b 1.0.9.",
  "mintrud.reporting_organization_name_missing": "\u041d\u0435 \u0437\u0430\u0434\u0430\u043d\u043e \u043d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438, \u043e\u0442 \u0438\u043c\u0435\u043d\u0438 \u043a\u043e\u0442\u043e\u0440\u043e\u0439 \u043f\u0435\u0440\u0435\u0434\u0430\u044e\u0442\u0441\u044f \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u0432 \u041c\u0438\u043d\u0442\u0440\u0443\u0434.",
  "mintrud.reporting_organization_inn_missing": "\u041d\u0435 \u0437\u0430\u0434\u0430\u043d \u0418\u041d\u041d \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438, \u043e\u0442 \u0438\u043c\u0435\u043d\u0438 \u043a\u043e\u0442\u043e\u0440\u043e\u0439 \u043f\u0435\u0440\u0435\u0434\u0430\u044e\u0442\u0441\u044f \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u0432 \u041c\u0438\u043d\u0442\u0440\u0443\u0434.",

};

function formatReadinessIssue(item) {
  if (!item) {
    return "";
  }

  if (typeof item === "string") {
    return item.trim();
  }

  const code = `${item.code || ""}`.trim();

  if (code && READINESS_LABELS[code]) {
    return READINESS_LABELS[code];
  }

  return `${item.message || item.msg || code || ""}`.trim();
}

function getReadinessPresentation(
  obligation
) {
  const issues = (
    obligation?.readiness_errors
    || []
  )
    .map((item) => (
      formatReadinessIssue(item)
    ))
    .filter(Boolean);

  if (issues.length) {
    return {
      kind: "issues",
      text: issues.join("; "),
    };
  }

  const status =
    `${obligation?.status || ""}`;

  if (status === "pending_data") {
    return {
      kind: "pending",
      text: "\u0413\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c \u0435\u0449\u0451 \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430. \u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443 \u043f\u043e \u0442\u0435\u043a\u0443\u0449\u0438\u043c \u0434\u0430\u043d\u043d\u044b\u043c.",
    };
  }

  if (
    status === "ready"
    || status === "needs_approval"
  ) {
    return {
      kind: "review",
      text: "\u041f\u043e \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u043e\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0435 \u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u0439 \u043d\u0435\u0442. \u041f\u0435\u0440\u0435\u0434 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435\u043c \u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435.",
    };
  }

  if (
    status === "approved"
    || status === "exported"
    || status === "submitted"
    || status === "accepted"
  ) {
    return {
      kind: "confirmed",
      text: "\u0413\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c \u0431\u044b\u043b\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430 \u043d\u0430 \u044d\u0442\u0430\u043f\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f.",
    };
  }

  return {
    kind: "neutral",
    text: "\u0421\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0445 \u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u0439 \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u0438 \u043d\u0435\u0442.",
  };
}


function formatApiDetail(detail) {
  if (!detail) {
    return "";
  }

  if (typeof detail === "string") {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => formatApiDetail(item))
      .filter(Boolean)
      .join("; ");
  }

  if (typeof detail === "object") {
    const nested = [
      detail.issues,
      detail.errors,
      detail.readiness_errors,
    ].find((value) => Array.isArray(value) && value.length);

    if (nested) {
      return nested
        .map((item) => formatReadinessIssue(item))
        .filter(Boolean)
        .join("; ");
    }

    const issue = formatReadinessIssue(detail);

    if (issue) {
      return issue;
    }

    if (detail.detail) {
      return formatApiDetail(detail.detail);
    }
  }

  return "";
}

const BUTTON =
  "inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY =
  `${BUTTON} bg-slate-900 text-white hover:bg-slate-700`;

const BLUE =
  `${BUTTON} bg-blue-600 text-white hover:bg-blue-500`;

const SECONDARY =
  `${BUTTON} bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50`;

const INPUT =
  "min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";


function statusTone(status) {
  if (status === "accepted" || status === "ready") {
    return "green";
  }

  if (
    status === "rejected"
    || status === "correction_required"
  ) {
    return "red";
  }

  if (
    status === "pending_data"
    || status === "needs_approval"
  ) {
    return "amber";
  }

  if (
    status === "approved"
    || status === "exported"
    || status === "submitted"
  ) {
    return "blue";
  }

  return "gray";
}


function statusLabel(status) {
  return STATUS_LABELS[status] || status || "\u2014";
}


function formatApiError(error) {
  const detail = formatApiDetail(
    error?.payload?.detail
  );

  if (detail) {
    return detail;
  }

  const message = `${error?.message || ""}`.trim();

  if (
    message
    && !message.startsWith("{")
    && !message.startsWith("[")
  ) {
    return message;
  }

  return "\u041e\u043f\u0435\u0440\u0430\u0446\u0438\u044e \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u043f\u043e\u043f\u044b\u0442\u043a\u0443.";
}


const MINTRUD_REPORTING_SCENARIO_LABELS = {
  external_training_provider:
    "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043f\u0440\u043e\u0432\u043e\u0434\u0438\u0442 \u0432\u043d\u0435\u0448\u043d\u044f\u044f \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0430\u044f \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f",
  employer_self_training:
    "\u0420\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044c \u043e\u0431\u0443\u0447\u0430\u0435\u0442 \u0441\u0430\u043c\u043e\u0441\u0442\u043e\u044f\u0442\u0435\u043b\u044c\u043d\u043e",
};

const MINTRUD_KNOWLEDGE_RESULT_LABELS = {
  satisfactory:
    "\u0423\u0434\u043e\u0432\u043b\u0435\u0442\u0432\u043e\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u043e",
  unsatisfactory:
    "\u041d\u0435\u0443\u0434\u043e\u0432\u043b\u0435\u0442\u0432\u043e\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u043e",
};

const MINTRUD_CONTEXT_TEXT = {
  title:
    "\u0414\u0430\u043d\u043d\u044b\u0435 \u0434\u043b\u044f \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430",
  description:
    "\u042d\u0442\u0438 \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u044e\u0442\u0441\u044f \u043f\u0440\u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0435 \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u0438 \u0437\u0430\u043f\u0438\u0441\u0438 \u043a \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0435 \u0432 \u041c\u0438\u043d\u0442\u0440\u0443\u0434.",
  reportingScenario:
    "\u0421\u0446\u0435\u043d\u0430\u0440\u0438\u0439 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
  chooseScenario:
    "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0439",
  profession:
    "\u041f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u044f / \u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u043d\u0438\u043a\u0430",
  employerName:
    "\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435 \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044f",
  employerInn:
    "\u0418\u041d\u041d \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044f",
  knowledgeResult:
    "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0437\u043d\u0430\u043d\u0438\u0439",
  chooseKnowledgeResult:
    "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442",
  knowledgeDate:
    "\u0414\u0430\u0442\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0437\u043d\u0430\u043d\u0438\u0439",
  protocolNumber:
    "\u041d\u043e\u043c\u0435\u0440 \u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b\u0430",
  externalEmployerHint:
    "\u041f\u0440\u0438 \u0432\u043d\u0435\u0448\u043d\u0435\u043c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044f \u043e\u0431\u0443\u0447\u0435\u043d\u043d\u043e\u0433\u043e \u0440\u0430\u0431\u043e\u0442\u043d\u0438\u043a\u0430.",
  selfTrainingHint:
    "\u041f\u0440\u0438 \u0441\u0430\u043c\u043e\u0441\u0442\u043e\u044f\u0442\u0435\u043b\u044c\u043d\u043e\u043c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438 \u043e\u0442\u0447\u0451\u0442\u043d\u0430\u044f \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u0438 \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044c \u0431\u0435\u0440\u0443\u0442\u0441\u044f \u0438\u0437 \u0446\u0435\u043d\u0442\u0440\u0430\u043b\u044c\u043d\u044b\u0445 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043a \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438. \u041f\u043e\u043b\u044f \u0432\u043d\u0435\u0448\u043d\u0435\u0433\u043e \u0440\u0430\u0431\u043e\u0442\u043e\u0434\u0430\u0442\u0435\u043b\u044f \u043d\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u044e\u0442\u0441\u044f.",
};


function MintrudContextForm({
  obligation,
  busy,
  onSave,
  onCancel,
}) {
  const context =
    obligation.mintrud_context || {};

  const [form, setForm] = useState({
    reporting_scenario:
      context.reporting_scenario || "",
    profession_or_position:
      context.profession_or_position || "",
    employer_name:
      context.employer_name || "",
    employer_inn:
      context.employer_inn || "",
    knowledge_check_result:
      context.knowledge_check_result || "",
    knowledge_check_date:
      context.knowledge_check_date || "",
    protocol_number:
      context.protocol_number || "",
  });

  const isExternalProvider =
    form.reporting_scenario
    === "external_training_provider";

  const isSelfTraining =
    form.reporting_scenario
    === "employer_self_training";

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    const payload = Object.fromEntries(
      Object.entries(form).map(
        ([key, value]) => [
          key,
          value.trim() || null,
        ]
      )
    );

    if (
      payload.reporting_scenario
      === "employer_self_training"
    ) {
      payload.employer_name = null;
      payload.employer_inn = null;
    }

    await onSave(payload);
  }

  return (
    <form
      data-testid="admin-registries-mintrud-context-form"
      onSubmit={submit}
      className="mt-4 rounded-2xl bg-slate-50 p-4"
    >
      <div>
        <div className="text-sm font-bold text-slate-900">
          {MINTRUD_CONTEXT_TEXT.title}
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {MINTRUD_CONTEXT_TEXT.description}
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          <span>
            {MINTRUD_CONTEXT_TEXT.reportingScenario}
          </span>

          <select
            className={INPUT}
            value={form.reporting_scenario}
            onChange={(event) =>
              update(
                "reporting_scenario",
                event.target.value
              )
            }
          >
            <option value="">
              {MINTRUD_CONTEXT_TEXT.chooseScenario}
            </option>

            {Object.entries(
              MINTRUD_REPORTING_SCENARIO_LABELS
            ).map(([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          <span>
            {MINTRUD_CONTEXT_TEXT.profession}
          </span>

          <input
            className={INPUT}
            value={form.profession_or_position}
            onChange={(event) =>
              update(
                "profession_or_position",
                event.target.value
              )
            }
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          <span>
            {MINTRUD_CONTEXT_TEXT.knowledgeResult}
          </span>

          <select
            className={INPUT}
            value={form.knowledge_check_result}
            onChange={(event) =>
              update(
                "knowledge_check_result",
                event.target.value
              )
            }
          >
            <option value="">
              {MINTRUD_CONTEXT_TEXT.chooseKnowledgeResult}
            </option>

            {Object.entries(
              MINTRUD_KNOWLEDGE_RESULT_LABELS
            ).map(([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          <span>
            {MINTRUD_CONTEXT_TEXT.knowledgeDate}
          </span>

          <input
            type="date"
            className={INPUT}
            value={form.knowledge_check_date}
            onChange={(event) =>
              update(
                "knowledge_check_date",
                event.target.value
              )
            }
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
          <span>
            {MINTRUD_CONTEXT_TEXT.protocolNumber}
          </span>

          <input
            className={INPUT}
            value={form.protocol_number}
            onChange={(event) =>
              update(
                "protocol_number",
                event.target.value
              )
            }
          />
        </label>
      </div>

      {isExternalProvider ? (
        <div
          data-testid="admin-registries-mintrud-external-employer"
          className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
        >
          <p className="text-xs leading-5 text-slate-600">
            {MINTRUD_CONTEXT_TEXT.externalEmployerHint}
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {MINTRUD_CONTEXT_TEXT.employerName}
              </span>

              <input
                className={INPUT}
                value={form.employer_name}
                onChange={(event) =>
                  update(
                    "employer_name",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {MINTRUD_CONTEXT_TEXT.employerInn}
              </span>

              <input
                className={INPUT}
                value={form.employer_inn}
                inputMode="numeric"
                onChange={(event) =>
                  update(
                    "employer_inn",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </div>
      ) : null}

      {isSelfTraining ? (
        <div
          data-testid="admin-registries-mintrud-self-training-hint"
          className="mt-4 rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-900 ring-1 ring-blue-100"
        >
          {MINTRUD_CONTEXT_TEXT.selfTrainingHint}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className={BLUE}
          disabled={busy}
        >
          {T.save}
        </button>

        <button
          type="button"
          className={SECONDARY}
          onClick={onCancel}
          disabled={busy}
        >
          {T.cancel}
        </button>
      </div>
    </form>
  );
}


function AttemptList({
  registry,
  obligation,
  attempts,
  busy,
  onDownload,
  onSubmitted,
  onResult,
}) {
  const [
    submissionAttemptId,
    setSubmissionAttemptId,
  ] = useState("");

  const [
    submissionReference,
    setSubmissionReference,
  ] = useState("");

  const [
    resultAttemptId,
    setResultAttemptId,
  ] = useState("");

  const [
    resultForm,
    setResultForm,
  ] = useState({
    result_status: "accepted",
    external_id: "",
    errors: "",
  });

  function openSubmissionForm(attempt) {
    setResultAttemptId("");
    setSubmissionAttemptId(attempt.id);
    setSubmissionReference(
      attempt.external_reference || ""
    );
  }

  function openResultForm(attempt) {
    setSubmissionAttemptId("");
    setResultAttemptId(attempt.id);
    setResultForm({
      result_status: "accepted",
      external_id: "",
      errors: "",
    });
  }

  async function submitSubmission(
    event,
    attempt
  ) {
    event.preventDefault();

    const success = await onSubmitted(
      attempt,
      submissionReference
    );

    if (success) {
      setSubmissionAttemptId("");
    }
  }

  async function submitResult(
    event,
    attempt
  ) {
    event.preventDefault();

    const success = await onResult(
      attempt,
      resultForm
    );

    if (success) {
      setResultAttemptId("");
    }
  }

  return (
    <div
      data-testid="admin-registries-attempts"
      className="mt-4 grid gap-3"
    >
      {!attempts.length ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {"\u041f\u043e\u043f\u044b\u0442\u043e\u043a \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0438 \u0444\u0430\u0439\u043b\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442."}
        </div>
      ) : null}

      {attempts.map((attempt) => (
        <div
          key={attempt.id}
          data-testid="admin-registry-attempt"
          className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900">
                #{attempt.attempt_no} / {attempt.transport}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                schema: {attempt.schema_version || "\u2014"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={attempt.has_artifact ? "green" : "gray"}>
                {artifactKindLabel(attempt)}
              </StatusBadge>

              {isHistoricalInternalLifecycle(attempt) ? (
                <StatusBadge tone="amber">
                  {"\u0418\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u044f\u044f \u0437\u0430\u043f\u0438\u0441\u044c"}
                </StatusBadge>
              ) : null}

              {attempt.result_status ? (
                <StatusBadge tone={statusTone(attempt.result_status)}>
                  {statusLabel(attempt.result_status)}
                </StatusBadge>
              ) : null}
            </div>
          </div>

          <div className="mt-3 break-all text-xs text-slate-500">
            SHA-256: {attempt.artifact_sha256 || "\u2014"}
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {isHistoricalInternalLifecycle(attempt)
              ? "\u0418\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0432\u043d\u0435\u0448\u043d\u0438\u0439 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440"
              : "\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440"}:
            {" "}
            {attempt.external_reference || "\u2014"}
          </div>

          {isHistoricalInternalLifecycle(attempt) ? (
            <div
              data-testid="admin-registry-legacy-internal-lifecycle"
              className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 ring-1 ring-amber-200"
            >
              {"\u042d\u0442\u043e \u0438\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u044f\u044f \u0437\u0430\u043f\u0438\u0441\u044c, \u0441\u043e\u0437\u0434\u0430\u043d\u043d\u0430\u044f \u0434\u043e \u0440\u0430\u0437\u0434\u0435\u043b\u0435\u043d\u0438\u044f \u0436\u0438\u0437\u043d\u0435\u043d\u043d\u043e\u0433\u043e \u0446\u0438\u043a\u043b\u0430 \u0430\u0440\u0442\u0435\u0444\u0430\u043a\u0442\u043e\u0432. \u0421\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0435 \u0441\u0442\u0430\u0442\u0443\u0441 \u0438 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440 \u043d\u0435 \u044f\u0432\u043b\u044f\u044e\u0442\u0441\u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435\u043c \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0432 \u0440\u0435\u0435\u0441\u0442\u0440."}
            </div>
          ) : null}

          {attempt.errors_json?.length ? (
            <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              {attempt.errors_json.join("; ")}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {attempt.has_artifact ? (
              <button
                type="button"
                className={SECONDARY}
                disabled={busy}
                onClick={() => onDownload(attempt)}
              >
                {artifactDownloadLabel(attempt)}
              </button>
            ) : null}

            {isPortalUploadArtifact(attempt)
            && attempt.has_artifact
            && !attempt.submitted_at ? (
              <button
                type="button"
                className={BLUE}
                disabled={busy}
                onClick={() => openSubmissionForm(attempt)}
              >
                {T.submitted}
              </button>
            ) : null}

            {isPortalUploadArtifact(attempt)
            && attempt.submitted_at
            && !attempt.result_status ? (
              <button
                type="button"
                className={PRIMARY}
                disabled={busy}
                onClick={() => openResultForm(attempt)}
              >
                {T.result}
              </button>
            ) : null}
          </div>

          {isPortalUploadArtifact(attempt)
          && submissionAttemptId === attempt.id ? (
            <form
              data-testid="admin-registry-submission-form"
              className="mt-4 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              onSubmit={(event) => submitSubmission(
                event,
                attempt
              )}
            >
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                external_reference
                <input
                  className={INPUT}
                  value={submissionReference}
                  disabled={busy}
                  onChange={(event) => (
                    setSubmissionReference(
                      event.target.value
                    )
                  )}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className={BLUE}
                  disabled={busy}
                >
                  {T.save}
                </button>

                <button
                  type="button"
                  className={SECONDARY}
                  disabled={busy}
                  onClick={() => setSubmissionAttemptId("")}
                >
                  {T.cancel}
                </button>
              </div>
            </form>
          ) : null}

          {isPortalUploadArtifact(attempt)
          && resultAttemptId === attempt.id ? (
            <form
              data-testid="admin-registry-result-form"
              className="mt-4 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              onSubmit={(event) => submitResult(
                event,
                attempt
              )}
            >
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                result_status
                <select
                  className={INPUT}
                  value={resultForm.result_status}
                  disabled={busy}
                  onChange={(event) => (
                    setResultForm((current) => ({
                      ...current,
                      result_status: event.target.value,
                    }))
                  )}
                >
                  <option value="accepted">
                    accepted
                  </option>
                  <option value="rejected">
                    rejected
                  </option>
                  <option value="correction_required">
                    correction_required
                  </option>
                </select>
              </label>

              {resultForm.result_status === "accepted" ? (
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  external_id
                  <input
                    className={INPUT}
                    value={resultForm.external_id}
                    disabled={busy}
                    onChange={(event) => (
                      setResultForm((current) => ({
                        ...current,
                        external_id: event.target.value,
                      }))
                    )}
                  />
                </label>
              ) : (
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  errors
                  <textarea
                    className={`${INPUT} min-h-24 py-2`}
                    value={resultForm.errors}
                    disabled={busy}
                    placeholder="One error per line"
                    onChange={(event) => (
                      setResultForm((current) => ({
                        ...current,
                        errors: event.target.value,
                      }))
                    )}
                  />
                </label>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className={PRIMARY}
                  disabled={busy}
                >
                  {T.save}
                </button>

                <button
                  type="button"
                  className={SECONDARY}
                  disabled={busy}
                  onClick={() => setResultAttemptId("")}
                >
                  {T.cancel}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-3 text-[11px] text-slate-400">
            {registry} / {obligation.id} / {attempt.id}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminRegistriesPage() {
  const [activeRegistry, setActiveRegistry] = useState("frdo");

  const [filters, setFilters] = useState({
    q: "",
    status: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    q: "",
    status: "",
  });

  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

  const [expandedId, setExpandedId] = useState("");
  const [editingContextId, setEditingContextId] = useState("");
  const [attemptsById, setAttemptsById] = useState({});

  const api = useMemo(() => {
    if (activeRegistry === "mintrud") {
      return {
        list: getAdminMintrudObligations,
        validate: validateAdminMintrudObligation,
        approve: approveAdminMintrudObligation,
        prepareExport: prepareAdminMintrudRegistryExport,
        reopen: reopenAdminMintrudObligation,
        attempts: getAdminMintrudSubmissionAttempts,
        download: downloadAdminMintrudSubmissionAttempt,
        submitted: markAdminMintrudSubmissionAttemptSubmitted,
        result: recordAdminMintrudSubmissionAttemptResult,
      };
    }

    return {
      list: getAdminFrdoObligations,
      validate: validateAdminFrdoObligation,
      approve: approveAdminFrdoObligation,
      prepareExport: prepareAdminFrdoRegistryExport,
      reopen: reopenAdminFrdoObligation,
      attempts: getAdminFrdoSubmissionAttempts,
      download: downloadAdminFrdoSubmissionAttempt,
      submitted: markAdminFrdoSubmissionAttemptSubmitted,
      result: recordAdminFrdoSubmissionAttemptResult,
    };
  }, [activeRegistry]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await api.list({
        q: appliedFilters.q,
        status: appliedFilters.status,
        limit: 100,
      });

      setObligations(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [
    api,
    appliedFilters.q,
    appliedFilters.status,
  ]);

  useEffect(() => {
    setExpandedId("");
    setEditingContextId("");
    setAttemptsById({});
    load();
  }, [
    activeRegistry,
    load,
  ]);

  async function withAction(key, callback) {
    setBusyKey(key);
    setError("");

    try {
      await callback();
      return true;
    } catch (err) {
      setError(formatApiError(err));
      return false;
    } finally {
      setBusyKey("");
    }
  }

  async function reloadAttempts(obligationId) {
    const attempts = await api.attempts(
      obligationId
    );

    setAttemptsById((current) => ({
      ...current,
      [obligationId]:
        Array.isArray(attempts)
          ? attempts
          : [],
    }));
  }

  async function toggleAttempts(obligation) {
    if (expandedId === obligation.id) {
      setExpandedId("");
      return;
    }

    setExpandedId(obligation.id);

    await withAction(
      `attempts:${obligation.id}`,
      () => reloadAttempts(
        obligation.id
      )
    );
  }

  async function validate(obligation) {
    await withAction(
      `validate:${obligation.id}`,
      async () => {
        await api.validate(
          obligation.id
        );

        await load();
      }
    );
  }

  async function approve(obligation) {
    await withAction(
      `approve:${obligation.id}`,
      async () => {
        const validated = await api.validate(
          obligation.id
        );

        await load();

        const readinessErrors = (
          validated?.readiness_errors
          || []
        );

        if (readinessErrors.length) {
          const readinessMessage = readinessErrors
            .map((item) => formatReadinessIssue(item))
            .filter(Boolean)
            .join("; ");

          throw new Error(
            readinessMessage
            || "\u0417\u0430\u043f\u0438\u0441\u044c \u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u0430 \u043a \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044e."
          );
        }

        if (
          ![
            "ready",
            "needs_approval",
          ].includes(validated?.status)
        ) {
          throw new Error(
            "\u0417\u0430\u043f\u0438\u0441\u044c \u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u0430 \u043a \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044e."
          );
        }

        await api.approve(
          obligation.id
        );

        await load();
      }
    );
  }

  async function prepareExport(obligation) {
    await withAction(
      `export:${obligation.id}`,
      async () => {
        await api.prepareExport(
          obligation.id
        );

        setExpandedId(
          obligation.id
        );

        await load();
        await reloadAttempts(
          obligation.id
        );
      }
    );
  }


  async function reopen(obligation) {
    await withAction(
      `reopen:${obligation.id}`,
      async () => {
        await api.reopen(
          obligation.id
        );

        setExpandedId(
          obligation.id
        );

        await load();
        await reloadAttempts(
          obligation.id
        );
      }
    );
  }


  async function saveContext(
    obligation,
    payload
  ) {
    await withAction(
      `context:${obligation.id}`,
      async () => {
        await updateAdminMintrudObligationContext(
          obligation.id,
          payload
        );

        setEditingContextId("");
        await load();
      }
    );
  }

  async function download(
    obligation,
    attempt
  ) {
    await withAction(
      `download:${attempt.id}`,
      () => api.download(
        obligation.id,
        attempt.id
      )
    );
  }

  async function markSubmitted(
    obligation,
    attempt,
    reference
  ) {
    return withAction(
      `submitted:${attempt.id}`,
      async () => {
        await api.submitted(
          obligation.id,
          attempt.id,
          {
            external_reference:
              reference.trim() || null,
          }
        );

        await load();
        await reloadAttempts(
          obligation.id
        );
      }
    );
  }

  async function recordResult(
    obligation,
    attempt,
    payload
  ) {
    const normalized =
      payload.result_status.trim();

    if (
      ![
        "accepted",
        "rejected",
        "correction_required",
      ].includes(normalized)
    ) {
      setError(
        "Unsupported result_status"
      );
      return false;
    }

    const externalId =
      normalized === "accepted"
        ? payload.external_id.trim() || null
        : null;

    const errors =
      normalized === "accepted"
        ? []
        : payload.errors
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);

    return withAction(
      `result:${attempt.id}`,
      async () => {
        await api.result(
          obligation.id,
          attempt.id,
          {
            result_status: normalized,
            external_id: externalId,
            errors,
          }
        );

        await load();
        await reloadAttempts(
          obligation.id
        );
      }
    );
  }

  return (
    <div
      data-testid="admin-registries-page"
      className="space-y-5"
    >
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-950">
              {T.title}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {T.subtitle}
            </p>
          </div>

          <button
            type="button"
            className={SECONDARY}
            onClick={load}
            disabled={loading}
          >
            {loading
              ? T.loading
              : T.refresh}
          </button>
        </div>

        <div
          data-testid="admin-registries-tabs"
          className="mt-5 flex flex-wrap gap-2"
        >
          <button
            type="button"
            data-testid="admin-registries-tab-frdo"
            className={
              activeRegistry === "frdo"
                ? BLUE
                : SECONDARY
            }
            onClick={() => setActiveRegistry("frdo")}
          >
            {T.frdo}
          </button>

          <button
            type="button"
            data-testid="admin-registries-tab-mintrud"
            className={
              activeRegistry === "mintrud"
                ? BLUE
                : SECONDARY
            }
            onClick={() => setActiveRegistry("mintrud")}
          >
            {T.mintrud}
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          {T.warning}
        </div>

        <div
          data-testid="admin-registries-portal-unavailable"
          className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200"
        >
          <div className="font-semibold text-slate-900">
            {T.portalUnavailableTitle}
          </div>

          <div className="mt-1">
            {T.portalUnavailable}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <form
          data-testid="admin-registries-filters"
          className="grid gap-3 md:grid-cols-[1fr_260px_auto]"
          onSubmit={(event) => {
            event.preventDefault();

            setAppliedFilters({
              q: filters.q.trim(),
              status: filters.status,
            });
          }}
        >
          <input
            className={INPUT}
            value={filters.q}
            placeholder={T.search}
            onChange={(event) => (
              setFilters((current) => ({
                ...current,
                q: event.target.value,
              }))
            )}
          />

          <select
            className={INPUT}
            value={filters.status}
            onChange={(event) => (
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            )}
          >
            <option value="">
              {T.allStatuses}
            </option>

            {STATUS_OPTIONS.map((status) => (
              <option
                key={status}
                value={status}
              >
                {statusLabel(status)}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={PRIMARY}
            >
              {T.apply}
            </button>

            <button
              type="button"
              className={SECONDARY}
              onClick={() => {
                setFilters({
                  q: "",
                  status: "",
                });

                setAppliedFilters({
                  q: "",
                  status: "",
                });
              }}
            >
              {T.reset}
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <div
          data-testid="admin-registries-error"
          className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200"
        >
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table
            data-testid="admin-registries-table"
            className="min-w-[1050px] w-full text-left text-sm"
          >
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Readiness</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-500"
                  >
                    {T.loading}
                  </td>
                </tr>
              ) : null}

              {!loading && obligations.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-500"
                  >
                    {T.noRows}
                  </td>
                </tr>
              ) : null}

              {!loading
                ? obligations.map((obligation) => {
                    const attempts =
                      attemptsById[obligation.id] || [];

                    const canValidate = [
                      "pending_data",
                      "ready",
                      "needs_approval",
                    ].includes(
                      obligation.status
                    );

                    const canApprove = [
                      "ready",
                      "needs_approval",
                    ].includes(
                      obligation.status
                    );

                    const canExport =
                      obligation.status === "approved";

                    const canReopen = [
                      "rejected",
                      "correction_required",
                    ].includes(
                      obligation.status
                    );

                    const readiness =
                      getReadinessPresentation(
                        obligation
                      );

                    return (
                      <tr
                        key={obligation.id}
                        className="align-top"
                      >
                        <td
                          colSpan={6}
                          className="p-0"
                        >
                          <div className="grid min-w-[1050px] grid-cols-[1.1fr_1.3fr_1fr_0.9fr_1.5fr_1.7fr]">
                            <div className="px-4 py-4">
                              <div className="font-semibold text-slate-900">
                                {obligation.user_full_name || "\u2014"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {obligation.user_email}
                              </div>
                            </div>

                            <div className="px-4 py-4">
                              <div className="font-medium text-slate-900">
                                {obligation.course_title}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {obligation.regulatory_program_type}
                              </div>
                            </div>

                            <div className="px-4 py-4">
                              <div className="font-medium text-slate-900">
                                {obligation.document_number || "\u2014"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {obligation.document_type || "\u2014"}
                              </div>
                            </div>

                            <div className="px-4 py-4">
                              <StatusBadge tone={statusTone(obligation.status)}>
                                {statusLabel(obligation.status)}
                              </StatusBadge>
                            </div>

                            <div className="px-4 py-4 text-xs leading-5 text-slate-600">
                              <div
                                data-testid="admin-registry-readiness-state"
                                className={
                                  readiness.kind === "issues"
                                    ? "text-red-700"
                                    : readiness.kind === "pending"
                                      ? "text-amber-800"
                                      : readiness.kind === "confirmed"
                                        ? "text-emerald-700"
                                        : "text-slate-600"
                                }
                              >
                                {readiness.text}
                              </div>

                              {obligation.last_error ? (
                                <div className="mt-2 text-red-700">
                                  {obligation.last_error}
                                </div>
                              ) : null}
                            </div>

                            <div className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {canValidate ? (
                                  <button
                                    type="button"
                                    className={SECONDARY}
                                    disabled={Boolean(busyKey)}
                                    onClick={() => validate(obligation)}
                                  >
                                    {T.validate}
                                  </button>
                                ) : null}

                                {canApprove ? (
                                  <button
                                    type="button"
                                    className={BLUE}
                                    disabled={Boolean(busyKey)}
                                    onClick={() => approve(obligation)}
                                  >
                                    {T.approve}
                                  </button>
                                ) : null}

                                {canExport ? (
                                  <button
                                    type="button"
                                    className={PRIMARY}
                                    disabled={Boolean(busyKey)}
                                    onClick={() => prepareExport(obligation)}
                                  >
                                    {T.prepareExport}
                                  </button>
                                ) : null}

                                {canReopen ? (
                                  <button
                                    type="button"
                                    className={BLUE}
                                    disabled={Boolean(busyKey)}
                                    onClick={() => reopen(obligation)}
                                  >
                                    {T.reopen}
                                  </button>
                                ) : null}

                                {activeRegistry === "mintrud"
                                  && canValidate ? (
                                    <button
                                      type="button"
                                      className={SECONDARY}
                                      disabled={Boolean(busyKey)}
                                      onClick={() => (
                                        setEditingContextId(
                                          editingContextId === obligation.id
                                            ? ""
                                            : obligation.id
                                        )
                                      )}
                                    >
                                      {T.context}
                                    </button>
                                  ) : null}

                                <button
                                  type="button"
                                  className={SECONDARY}
                                  disabled={Boolean(busyKey)}
                                  onClick={() => toggleAttempts(obligation)}
                                >
                                  {T.attempts}
                                </button>
                              </div>
                            </div>
                          </div>

                          {activeRegistry === "mintrud"
                            && editingContextId === obligation.id ? (
                              <div className="border-t border-slate-100 px-4 pb-4">
                                <MintrudContextForm
                                  obligation={obligation}
                                  busy={Boolean(busyKey)}
                                  onCancel={() => setEditingContextId("")}
                                  onSave={(payload) => saveContext(
                                    obligation,
                                    payload
                                  )}
                                />
                              </div>
                            ) : null}

                          {expandedId === obligation.id ? (
                            <div className="border-t border-slate-100 p-4">
                              <AttemptList
                                registry={activeRegistry}
                                obligation={obligation}
                                attempts={attempts}
                                busy={Boolean(busyKey)}
                                onDownload={(attempt) => download(
                                  obligation,
                                  attempt
                                )}
                                onSubmitted={(attempt, reference) => markSubmitted(
                                  obligation,
                                  attempt,
                                  reference
                                )}
                                onResult={(attempt, payload) => recordResult(
                                  obligation,
                                  attempt,
                                  payload
                                )}
                              />
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
