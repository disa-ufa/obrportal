import { bindRegistrySession } from "../utils/registrySession";
import FrdoBatchCreation from "../components/admin/registries/FrdoBatchCreation";
import { useFrdoSubmissionFence } from "../hooks/useFrdoSubmissionFence";
import SelectedRegistryBatch from "../components/admin/registries/SelectedRegistryBatch";
import { batchSelectionUrl } from "../utils/registryBatchNavigation";
import { RegistryNavigation, RegistryOverview, RegistryNextAction, RegistryDetails, RegistryEmptyState } from "../components/admin/registries/RegistryWorkspace";
import { registryWorkflow, registryStatuses, registryDocumentLabel } from "../utils/registryWorkflowPresentation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { captureAuthSession, isCurrentAuthSession, approveAdminFrdoObligation, reopenAdminFrdoObligation, downloadAdminFrdoSubmissionAttempt, getAdminCourses, getAdminCourseDetail, getAdminFrdoObligations, getAdminFrdoSubmissionAttempts, markAdminFrdoSubmissionAttemptSubmitted, recordAdminFrdoSubmissionAttemptResult, updateAdminFrdoObligationContext, validateAdminFrdoObligation } from "../api/client";
import { RegistryLearnerProfileWarning } from "../components/admin/AdminRegistryLearnerProfileForm";
import { StatusBadge } from "../components/ui/StatusBadge";
import { FrdoPoContextForm } from "../components/admin/FrdoPoContextForm";
import { AdminRegistryLearnerProfileForm } from "../components/admin/AdminRegistryLearnerProfileForm";
import { FrdoPoBatchesPanel } from "../components/admin/FrdoPoBatchesPanel";
import { formatMintrudError } from "../utils/mintrudWorkflow";
const T = {
  mintrudResultUncertain: "Результат отправки неизвестен. Повторное сохранение заблокировано. Проверьте состояние партии.",
  mintrudResultCheck: "Проверить состояние партии",
  mintrudBatchChooseResult: "Выберите результат",
  mintrudBatchIncompleteResults: "Выберите результат для каждой записи партии.",
  mintrudBatchFinalConfirmTitle: "Подтвердить окончательную сверку XML-партии?",
  mintrudBatchFinalConfirmWarning: "После сохранения изменить результаты этой партии будет нельзя.",
  mintrudBatchFinalTotal: "Всего записей",
  mintrudBatchFinalAccepted: "Принято",
  mintrudBatchFinalRejected: "Отклонено",
  mintrudBatchFinalCorrection: "Требуют исправления",
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
  mintrudBatchPrepareDownload: "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u0438 \u0441\u043a\u0430\u0447\u0430\u0442\u044c \u043f\u0430\u043a\u0435\u0442 XML",
  mintrudBatchSelected: "\u0412\u044b\u0431\u0440\u0430\u043d\u043e \u0434\u043b\u044f \u043f\u0430\u043a\u0435\u0442\u0430",
  mintrudBatchSelect: "\u0412 \u043f\u0430\u043a\u0435\u0442",
  mintrudBatchSelectAll: "\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0432\u0441\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u044b\u0435",
  mintrudBatchClear: "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0432\u044b\u0431\u043e\u0440",
  mintrudBatchNeedSelection: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u043d\u0443 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u0443\u044e \u0437\u0430\u043f\u0438\u0441\u044c \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430.",
  mintrudBatchHint: "\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u044b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u043f\u043e\u043f\u0430\u0434\u0443\u0442 \u0432 \u043e\u0434\u0438\u043d XML \u0432 \u043f\u043e\u0440\u044f\u0434\u043a\u0435 \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u0441\u043f\u0438\u0441\u043a\u0430. \u041f\u043e\u0441\u043b\u0435 \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u0430\u0439\u043b \u0432 \u0415\u0418\u0421\u041e\u0422/\u041b\u041a\u041e\u0422 \u0432\u0440\u0443\u0447\u043d\u0443\u044e. \u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0430 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f.",
  mintrudBatchHistoryTitle: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f XML-\u043f\u0430\u043a\u0435\u0442\u043e\u0432",
  mintrudBatchHistoryHint: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 XML \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0430 \u0432 \u0440\u0435\u0435\u0441\u0442\u0440 \u0444\u0438\u043a\u0441\u0438\u0440\u0443\u044e\u0442\u0441\u044f \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0438\u043c\u043f\u043e\u0440\u0442\u0438\u0440\u0443\u0439\u0442\u0435 XML \u0432 \u0415\u0418\u0421\u041e\u0422/\u041b\u041a\u041e\u0422, \u0437\u0430\u0442\u0435\u043c \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0438\u043c\u043f\u043e\u0440\u0442. \u041f\u043e\u0441\u043b\u0435 \u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u043d\u0430\u0431\u043e\u0440\u0430, \u043f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u044f \u042d\u041f \u0438 \u0440\u0443\u0447\u043d\u043e\u0439 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438 \u043e\u0442\u043c\u0435\u0442\u044c\u0442\u0435 \u043f\u0430\u043a\u0435\u0442 \u043a\u0430\u043a \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043d\u044b\u0439.",
  mintrudBatchHistoryEmpty: "\u041f\u0430\u043a\u0435\u0442\u044b XML \u0435\u0449\u0451 \u043d\u0435 \u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043b\u0438\u0441\u044c.",
  mintrudBatchDownload: "\u0421\u043a\u0430\u0447\u0430\u0442\u044c XML",
  mintrudBatchConfirmImported: "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u0438\u043c\u043f\u043e\u0440\u0442 XML",
  mintrudBatchConfirmSubmitted: "\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u043f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0443",
  mintrudBatchExternalReference: "\u0418\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440 \u043d\u0430\u0431\u043e\u0440\u0430 / \u0441\u0441\u044b\u043b\u043a\u0430 (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)",
  mintrudBatchResults: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043f\u0430\u043a\u0435\u0442\u0430",
  mintrudBatchRecordResults: "\u0417\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b",
  mintrudBatchViewResults: "\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b",
  mintrudBatchResultsHint: "\u0417\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u0443\u0439\u0442\u0435 \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0434\u043b\u044f \u043a\u0430\u0436\u0434\u043e\u0439 \u0437\u0430\u043f\u0438\u0441\u0438 \u043f\u0430\u043a\u0435\u0442\u0430 \u043f\u043e\u0441\u043b\u0435 \u0440\u0443\u0447\u043d\u043e\u0439 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0438 \u0432 \u0415\u0418\u0421\u041e\u0422/\u041b\u041a\u041e\u0422.",
  mintrudBatchReconciled: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u044b",
  mintrudBatchObligation: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e",
  mintrudBatchResultStatus: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442",
  mintrudBatchExternalId: "\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440",
  mintrudBatchErrors: "\u041e\u0448\u0438\u0431\u043a\u0438 (\u043f\u043e \u043e\u0434\u043d\u043e\u0439 \u043d\u0430 \u0441\u0442\u0440\u043e\u043a\u0443)",
  mintrudBatchStatusExported: "XML \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d",
  mintrudBatchStatusImported: "XML \u0438\u043c\u043f\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u0430\u043d",
  mintrudBatchStatusSubmitted: "\u041d\u0430\u0431\u043e\u0440 \u043f\u043e\u0434\u043f\u0438\u0441\u0430\u043d \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d",
  reopen: "\u041d\u0430\u0447\u0430\u0442\u044c \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
  attempts: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u043e\u043f\u044b\u0442\u043e\u043a",
  frdoContext: "\u0414\u0430\u043d\u043d\u044b\u0435 \u0424\u0420\u0414\u041e",
  context: "\u0414\u0430\u043d\u043d\u044b\u0435 \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430",
  save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  cancel: "\u041e\u0442\u043c\u0435\u043d\u0430",
  download: "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 JSON",
  submitted: "\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u0440\u0443\u0447\u043d\u0443\u044e \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0443",
  result: "\u0424\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442",
  noRows: "\u0417\u0430\u043f\u0438\u0441\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
  warning: "\u0414\u043b\u044f \u0424\u0418\u0421 \u0424\u0420\u0414\u041e \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u0451\u043d\u043d\u044b\u0439 \u0440\u0430\u0431\u043e\u0447\u0438\u0439 XLSX-\u0448\u0430\u0431\u043b\u043e\u043d. \u042d\u0442\u043e \u0440\u0430\u0431\u043e\u0447\u0438\u0439 \u044d\u0442\u0430\u043b\u043e\u043d \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u043f\u0438\u043b\u043e\u0442\u0430, \u0430 \u043d\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435, \u0447\u0442\u043e \u0448\u0430\u0431\u043b\u043e\u043d \u044f\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0439 \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0439 \u0444\u043e\u0440\u043c\u043e\u0439 \u0424\u0420\u0414\u041e. \u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442 \u0444\u0430\u0439\u043b \u043f\u0435\u0440\u0435\u0434 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435\u043c; \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0432 \u0424\u0418\u0421 \u0424\u0420\u0414\u041e \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f \u0432\u0440\u0443\u0447\u043d\u0443\u044e.",
  mintrudWarning: "\u0414\u043b\u044f \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430 \u0444\u043e\u0440\u043c\u0438\u0440\u0443\u0435\u0442\u0441\u044f \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0439 XML \u043f\u043e \u0441\u0445\u0435\u043c\u0435 educated_person_import v1.0.9. \u0424\u0430\u0439\u043b \u043f\u0440\u0435\u0434\u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d \u0434\u043b\u044f \u0440\u0443\u0447\u043d\u043e\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0432 \u0415\u0418\u0421\u041e\u0422/\u041b\u041a\u041e\u0422; \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0430 \u0441\u0438\u0441\u0442\u0435\u043c\u043e\u0439 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f.",
  mintrudPortalAvailableTitle: "\u041f\u0430\u043a\u0435\u0442\u043d\u044b\u0439 XML \u0434\u043b\u044f \u0415\u0418\u0421\u041e\u0422/\u041b\u041a\u041e\u0422",
  mintrudPortalAvailable: "\u0414\u043b\u044f \u0415\u0418\u0421\u041e\u0422/\u041b\u041a\u041e\u0422 XML v1.0.9 \u0444\u043e\u0440\u043c\u0438\u0440\u0443\u0435\u0442\u0441\u044f \u043f\u0430\u043a\u0435\u0442\u043d\u043e \u0438\u0437 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0445 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439 \u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442\u0441\u044f \u043f\u043e XSD. \u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u0438 \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u0435 \u043f\u0430\u043a\u0435\u0442\u043e\u0432 \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u044e\u0442\u0441\u044f \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u043c\u0438 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041f\u043e\u0441\u043b\u0435 \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 XML \u0432\u0440\u0443\u0447\u043d\u0443\u044e \u0438 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u0443\u0439\u0442\u0435 \u0438\u043c\u043f\u043e\u0440\u0442 \u0438 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0432 \u041e\u0431\u0440\u041f\u043e\u0440\u0442\u0430\u043b\u0435.",
  frdoPortalAvailableTitle: "\u041f\u0430\u043a\u0435\u0442\u043d\u0430\u044f \u0432\u044b\u0433\u0440\u0443\u0437\u043a\u0430 XLSX \u0434\u043b\u044f \u0424\u0418\u0421 \u0424\u0420\u0414\u041e",
  frdoPortalAvailable: "\u0414\u043b\u044f \u0424\u0418\u0421 \u0424\u0420\u0414\u041e XLSX \u0444\u043e\u0440\u043c\u0438\u0440\u0443\u0435\u0442\u0441\u044f \u043f\u0430\u043a\u0435\u0442\u043d\u043e \u0438\u0437 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439 \u043f\u043e \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u0451\u043d\u043d\u043e\u043c\u0443 \u0440\u0430\u0431\u043e\u0447\u0435\u043c\u0443 \u0448\u0430\u0431\u043b\u043e\u043d\u0443. \u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u0438 \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u0435 \u043f\u0430\u043a\u0435\u0442\u043e\u0432 \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u044e\u0442\u0441\u044f \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u043c\u0438 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041f\u043e\u0441\u043b\u0435 \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u0430\u0439\u043b \u0432 \u0424\u0418\u0421 \u0424\u0420\u0414\u041e \u0432\u0440\u0443\u0447\u043d\u0443\u044e, \u043e\u0442\u043c\u0435\u0442\u044c\u0442\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0443 \u0438 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u0443\u0439\u0442\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442."
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
  correction_required: "\u041d\u0443\u0436\u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430"
};
const STATUS_OPTIONS = Object.keys(STATUS_LABELS);
const INTERNAL_EXPORT_ARTIFACT = "internal-export-package";
const PORTAL_UPLOAD_ARTIFACT = "portal-upload-artifact";
const FRDO_PO_PROGRAM_TYPE = "vocational_training";
const ARTIFACT_KIND_LABELS = {
  [INTERNAL_EXPORT_ARTIFACT]: "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 JSON",
  [PORTAL_UPLOAD_ARTIFACT]: "\u0424\u0430\u0439\u043b \u0434\u043b\u044f \u043f\u043e\u0440\u0442\u0430\u043b\u0430"
};
function artifactKindLabel(attempt) {
  if (!attempt?.has_artifact) {
    return "\u0424\u0430\u0439\u043b \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442";
  }
  const kind = `${attempt?.artifact_kind || ""}`;
  return ARTIFACT_KIND_LABELS[kind] || "\u0424\u0430\u0439\u043b \u043d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u043e\u0433\u043e \u0442\u0438\u043f\u0430";
}
function artifactDownloadLabel(attempt, registry) {
  if (attempt?.artifact_kind === PORTAL_UPLOAD_ARTIFACT) {
    if (registry === "frdo") {
      return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c XLSX \u0434\u043b\u044f \u0424\u0418\u0421 \u0424\u0420\u0414\u041e";
    }
    if (registry === "mintrud") {
      return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c XML \u0434\u043b\u044f \u0415\u0418\u0421\u041e\u0422";
    }
    return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0444\u0430\u0439\u043b \u0434\u043b\u044f \u043f\u043e\u0440\u0442\u0430\u043b\u0430";
  }
  if (attempt?.artifact_kind === INTERNAL_EXPORT_ARTIFACT) {
    return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 JSON";
  }
  return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0444\u0430\u0439\u043b";
}
function isPortalUploadArtifact(attempt) {
  return attempt?.artifact_kind === PORTAL_UPLOAD_ARTIFACT;
}
function isHistoricalInternalLifecycle(attempt) {
  return attempt?.artifact_kind === INTERNAL_EXPORT_ARTIFACT && Boolean(attempt?.submitted_at || attempt?.result_status || attempt?.external_reference);
}
const READINESS_LABELS = {
  "frdo.context_missing": "Не заполнены сведения для ФРДО.",
  "frdo.document_status_missing": "Не указан статус документа.",
  "frdo.study_form_missing": "Не указана форма обучения.",
  "frdo.funding_source_missing": "Не указан источник финансирования.",
  "frdo.po.document_type_missing": "Не указан вид документа об обучении.",
  "frdo.po.profession_missing": "Не указана профессия для ФРДО.",
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
  "mintrud.reporting_organization_inn_missing": "\u041d\u0435 \u0437\u0430\u0434\u0430\u043d \u0418\u041d\u041d \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438, \u043e\u0442 \u0438\u043c\u0435\u043d\u0438 \u043a\u043e\u0442\u043e\u0440\u043e\u0439 \u043f\u0435\u0440\u0435\u0434\u0430\u044e\u0442\u0441\u044f \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u0432 \u041c\u0438\u043d\u0442\u0440\u0443\u0434."
};
function formatReadinessIssue(item) {
  if (!item) {
    return "";
  }
  if (typeof item === "string") {
    return READINESS_LABELS[item.trim()] || item.trim();
  }
  const code = `${item.code || ""}`.trim();
  if (code && READINESS_LABELS[code]) {
    return READINESS_LABELS[code];
  }
  return `${item.message || item.msg || code || ""}`.trim();
}
function getReadinessPresentation(obligation) {
  if (obligation?.registry === "mintrud" && obligation?.status === "approved") {
    return {
      kind: "review",
      text: "Данные утверждены ранее. Перед XML система проверит актуальность снимка. При отказе проверьте данные и выполните повторное утверждение."
    };
  }
  const issues = (obligation?.readiness_errors || []).map(item => formatReadinessIssue(item)).filter(Boolean);
  if (issues.length) {
    return {
      kind: "issues",
      text: issues.join("; ")
    };
  }
  const status = `${obligation?.status || ""}`;
  if (status === "pending_data") {
    return {
      kind: "pending",
      text: "\u0413\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c \u0435\u0449\u0451 \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430. \u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443 \u043f\u043e \u0442\u0435\u043a\u0443\u0449\u0438\u043c \u0434\u0430\u043d\u043d\u044b\u043c."
    };
  }
  if (status === "ready" || status === "needs_approval") {
    return {
      kind: "review",
      text: "\u041f\u043e \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u043e\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0435 \u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u0439 \u043d\u0435\u0442. \u041f\u0435\u0440\u0435\u0434 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435\u043c \u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u043e \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435."
    };
  }
  if (status === "approved" || status === "exported" || status === "submitted" || status === "accepted") {
    return {
      kind: "confirmed",
      text: "\u0413\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u044c \u0431\u044b\u043b\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430 \u043d\u0430 \u044d\u0442\u0430\u043f\u0435 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f."
    };
  }
  return {
    kind: "neutral",
    text: "\u0421\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0445 \u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u0439 \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u0438 \u043d\u0435\u0442."
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
    return detail.map(item => formatApiDetail(item)).filter(Boolean).join("; ");
  }
  if (typeof detail === "object") {
    const nested = [detail.issues, detail.errors, detail.readiness_errors].find(value => Array.isArray(value) && value.length);
    if (nested) {
      return nested.map(item => formatReadinessIssue(item)).filter(Boolean).join("; ");
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
const BUTTON = "inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = `${BUTTON} bg-slate-900 text-white hover:bg-slate-700`;
const BLUE = `${BUTTON} bg-blue-600 text-white hover:bg-blue-500`;
const SECONDARY = `${BUTTON} bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50`;
const INPUT = "min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
function statusTone(status) {
  if (status === "accepted" || status === "ready") {
    return "green";
  }
  if (status === "rejected" || status === "correction_required") {
    return "red";
  }
  if (status === "pending_data" || status === "needs_approval") {
    return "amber";
  }
  if (status === "approved" || status === "exported" || status === "submitted") {
    return "blue";
  }
  return "gray";
}
function statusLabel(status) {
  return STATUS_LABELS[status] || status || "\u2014";
}
function formatApiError(error, registry) {
  if (registry === "mintrud") return formatMintrudError(error, READINESS_LABELS);
  const detail = formatApiDetail(error?.payload?.detail);
  if (detail) {
    return detail;
  }
  const message = `${error?.message || ""}`.trim();
  if (message && !message.startsWith("{") && !message.startsWith("[")) {
    return message;
  }
  return "\u041e\u043f\u0435\u0440\u0430\u0446\u0438\u044e \u043d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u043f\u043e\u043f\u044b\u0442\u043a\u0443.";
}
function AttemptList({
  registry,
  obligation,
  attempts,
  busy,
  onDownload,
  onSubmitted,
  onResult
}) {
  const [submissionAttemptId, setSubmissionAttemptId] = useState("");
  const [submissionReference, setSubmissionReference] = useState("");
  const [resultAttemptId, setResultAttemptId] = useState("");
  const [resultForm, setResultForm] = useState({
    result_status: "accepted",
    external_id: "",
    errors: ""
  });
  function openSubmissionForm(attempt) {
    setResultAttemptId("");
    setSubmissionAttemptId(attempt.id);
    setSubmissionReference(attempt.external_reference || "");
  }
  function openResultForm(attempt) {
    setSubmissionAttemptId("");
    setResultAttemptId(attempt.id);
    setResultForm({
      result_status: "accepted",
      external_id: "",
      errors: ""
    });
  }
  async function submitSubmission(event, attempt) {
    event.preventDefault();
    const success = await onSubmitted(attempt, submissionReference);
    if (success) {
      setSubmissionAttemptId("");
    }
  }
  async function submitResult(event, attempt) {
    event.preventDefault();
    const success = await onResult(attempt, resultForm);
    if (success) {
      setResultAttemptId("");
    }
  }
  return <div data-testid="admin-registries-attempts" className="mt-4 grid gap-3">
      {!attempts.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {"\u041f\u043e\u043f\u044b\u0442\u043e\u043a \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0438 \u0444\u0430\u0439\u043b\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442."}
        </div> : null}

      {attempts.map(attempt => <div key={attempt.id} data-testid="admin-registry-attempt" className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
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

              {isHistoricalInternalLifecycle(attempt) ? <StatusBadge tone="amber">
                  {"\u0418\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u044f\u044f \u0437\u0430\u043f\u0438\u0441\u044c"}
                </StatusBadge> : null}

              {attempt.result_status ? <StatusBadge tone={statusTone(attempt.result_status)}>
                  {statusLabel(attempt.result_status)}
                </StatusBadge> : null}
            </div>
          </div>

          <div className="mt-3 break-all text-xs text-slate-500">
            SHA-256: {attempt.artifact_sha256 || "\u2014"}
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {isHistoricalInternalLifecycle(attempt) ? "\u0418\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0432\u043d\u0435\u0448\u043d\u0438\u0439 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440" : "\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440"}:
            {" "}
            {attempt.external_reference || "\u2014"}
          </div>

          {isHistoricalInternalLifecycle(attempt) ? <div data-testid="admin-registry-legacy-internal-lifecycle" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 ring-1 ring-amber-200">
              {"\u042d\u0442\u043e \u0438\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u044f\u044f \u0437\u0430\u043f\u0438\u0441\u044c, \u0441\u043e\u0437\u0434\u0430\u043d\u043d\u0430\u044f \u0434\u043e \u0440\u0430\u0437\u0434\u0435\u043b\u0435\u043d\u0438\u044f \u0436\u0438\u0437\u043d\u0435\u043d\u043d\u043e\u0433\u043e \u0446\u0438\u043a\u043b\u0430 \u0430\u0440\u0442\u0435\u0444\u0430\u043a\u0442\u043e\u0432. \u0421\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0435 \u0441\u0442\u0430\u0442\u0443\u0441 \u0438 \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u043e\u0440 \u043d\u0435 \u044f\u0432\u043b\u044f\u044e\u0442\u0441\u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435\u043c \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0432 \u0440\u0435\u0435\u0441\u0442\u0440."}
            </div> : null}

          {attempt.errors_json?.length ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              {attempt.errors_json.join("; ")}
            </div> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {attempt.has_artifact ? <button type="button" className={SECONDARY} disabled={busy} onClick={() => onDownload(attempt)}>
                {artifactDownloadLabel(attempt, registry)}
              </button> : null}

            {isPortalUploadArtifact(attempt) && attempt.has_artifact && !attempt.submitted_at ? <button type="button" className={BLUE} disabled={busy} onClick={() => openSubmissionForm(attempt)}>
                {T.submitted}
              </button> : null}

            {isPortalUploadArtifact(attempt) && attempt.submitted_at && !attempt.result_status ? <button type="button" className={PRIMARY} disabled={busy} onClick={() => openResultForm(attempt)}>
                {T.result}
              </button> : null}
          </div>

          {isPortalUploadArtifact(attempt) && submissionAttemptId === attempt.id ? <form data-testid="admin-registry-submission-form" className="mt-4 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200" onSubmit={event => submitSubmission(event, attempt)}>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                external_reference
                <input className={INPUT} value={submissionReference} disabled={busy} onChange={event => setSubmissionReference(event.target.value)} />
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className={BLUE} disabled={busy}>
                  {T.save}
                </button>

                <button type="button" className={SECONDARY} disabled={busy} onClick={() => setSubmissionAttemptId("")}>
                  {T.cancel}
                </button>
              </div>
            </form> : null}

          {isPortalUploadArtifact(attempt) && resultAttemptId === attempt.id ? <form data-testid="admin-registry-result-form" className="mt-4 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200" onSubmit={event => submitResult(event, attempt)}>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                result_status
                <select className={INPUT} value={resultForm.result_status} disabled={busy} onChange={event => setResultForm(current => ({
            ...current,
            result_status: event.target.value
          }))}>
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

              {resultForm.result_status === "accepted" ? <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  external_id
                  <input className={INPUT} value={resultForm.external_id} disabled={busy} onChange={event => setResultForm(current => ({
            ...current,
            external_id: event.target.value
          }))} />
                </label> : <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  errors
                  <textarea className={`${INPUT} min-h-24 py-2`} value={resultForm.errors} disabled={busy} placeholder="One error per line" onChange={event => setResultForm(current => ({
            ...current,
            errors: event.target.value
          }))} />
                </label>}

              <div className="flex flex-wrap gap-2">
                <button type="submit" className={PRIMARY} disabled={busy}>
                  {T.save}
                </button>

                <button type="button" className={SECONDARY} disabled={busy} onClick={() => setResultAttemptId("")}>
                  {T.cancel}
                </button>
              </div>
            </form> : null}

          <div className="mt-3 text-[11px] text-slate-400">
            {registry} / {obligation.id} / {attempt.id}
          </div>
        </div>)}
    </div>;
}

// Pilot-only presentation filter. It does not change registry obligations or history.
// Explicit course-level "not_required" excludes a learner from every registry view.
function pilotCourseItems(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["items", "courses", "results", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  throw new Error("Не удалось прочитать список курсов для фильтра Госреестров.");
}
function pilotCourseId(value) {
  return String(value?.course_id || value?.course?.id || "").trim();
}
function pilotCourseTitle(value) {
  return String(value?.course_title || value?.course?.title || value?.title || "").trim().toLocaleLowerCase("ru-RU");
}
function pilotCourseMode(course, field) {
  return String(course?.[field] ?? course?.course?.[field] ?? "").trim().toLowerCase();
}
async function pilotVisibleObligations(rows, registry) {
  if (!rows.length) return rows;
  const field = registry === "frdo" ? "frdo_requirement_mode" : "mintrud_requirement_mode";

  // The obligation response may already contain the course setting.
  const unresolved = rows.filter(row => !pilotCourseMode(row, field));
  let courses = [];
  if (unresolved.length) {
    try {
      courses = pilotCourseItems(await getAdminCourses());
    } catch {
      // A per-course detail lookup is still possible when the catalog is unavailable.
      courses = [];
    }
  }
  const byId = new Map();
  const byTitle = new Map();
  function remember(course) {
    const id = String(course?.id || course?.course_id || "").trim();
    if (id) byId.set(id, course);
    const title = pilotCourseTitle(course);
    if (title) {
      // Avoid mixing two courses with the same title; allow details to replace
      // their own earlier catalog entry.
      const previous = byTitle.get(title);
      if (!byTitle.has(title) || previous && String(previous.id || previous.course_id) === id) {
        byTitle.set(title, course);
      } else {
        byTitle.set(title, null);
      }
    }
  }
  courses.forEach(remember);
  const missingIds = [...new Set(unresolved.map(row => {
    const id = pilotCourseId(row);
    if (id) return id;
    // Some obligation responses expose only a course title.
    return String(byTitle.get(pilotCourseTitle(row))?.id || "").trim();
  }).filter(id => id && !pilotCourseMode(byId.get(id), field)))];

  // Resolve only distinct courses present on the current page (maximum 100 rows).
  // No database writes: these are existing GET endpoints.
  await Promise.all(missingIds.map(async courseId => {
    try {
      const detail = await getAdminCourseDetail(courseId);
      remember(detail?.course || detail);
    } catch {
      // Unknown settings are handled below by withholding the work list.
    }
  }));
  const visible = [];
  let unknownSettings = 0;
  for (const row of rows) {
    const id = pilotCourseId(row);
    const byName = byTitle.get(pilotCourseTitle(row));
    const course = id && byId.get(id) || (!id || String(byName?.id || "") === id ? byName : null);
    const mode = pilotCourseMode(row, field) || pilotCourseMode(course, field);
    if (!mode) {
      unknownSettings += 1;
    } else if (mode !== "not_required") {
      visible.push(row);
    }
  }
  if (unknownSettings > 0) {
    // Fail closed: do not show potentially excluded learners or allow selection.
    throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0435\u0435\u0441\u0442\u0440\u0430 \u0434\u043B\u044F \u0447\u0430\u0441\u0442\u0438 \u043A\u0443\u0440\u0441\u043E\u0432. \u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u043A\u0440\u044B\u0442; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u0434\u0430\u043D\u043D\u044B\u043C \u043A\u0443\u0440\u0441\u043E\u0432.");
  }
  return visible;
}

// F1 pilot facets: only IDs explicitly supplied by registry rows are used.
// Do not infer an organization/group from a learner's name or course title.
function pilotRegistryFacet(row, facet) {
  const source = facet === "organization" ? [[row?.enrollment_organization_id, row?.enrollment_organization_name], [row?.organization_id, row?.organization_name], [row?.organization?.id, row?.organization?.name], [row?.enrollment?.organization_id, row?.enrollment?.organization_name]] : [[row?.learning_group_id, row?.learning_group_name], [row?.group_id, row?.group_name], [row?.learning_group?.id, row?.learning_group?.name], [row?.group?.id, row?.group?.name], [row?.enrollment?.group_id, row?.enrollment?.group_name]];
  for (const [rawId, rawName] of source) {
    const id = String(rawId ?? "").trim();
    if (!id) continue;
    const name = String(rawName ?? "").trim();
    return {
      id,
      label: name || (facet === "organization" ? "Организация " : "Группа ") + id.slice(0, 8)
    };
  }
  return null;
}
function pilotRegistryFacetOptions(rows, facet) {
  const values = new Map();
  for (const row of rows) {
    const item = pilotRegistryFacet(row, facet);
    if (item && !values.has(item.id)) values.set(item.id, item);
  }
  return [...values.values()].sort((a, b) => a.label.localeCompare(b.label, "ru-RU"));
}
export default function FrdoRegistryWorkspace({
  onMintrud, active
}) {
  const [confirmedFrdoSubmission, setConfirmedFrdoSubmission] = useState(null);
  const frdoSubmission = useFrdoSubmissionFence(setConfirmedFrdoSubmission);
  const [frdoHistoryRevision, setFrdoHistoryRevision] = useState(0);
  const [workspaceView, setWorkspaceView] = useState(() => typeof window !== "undefined" && ["work", "batches"].includes(new URLSearchParams(window.location.search).get("registryView")) ? new URLSearchParams(window.location.search).get("registryView") : "overview");
  const registryRef = useRef("frdo");
  registryRef.current = "frdo";
  const [batchStage, setBatchStage] = useState(() => {
    const value = new URLSearchParams(window.location.search).get("batchStage");
    return ["exported", "imported", "submitted", "reconciled"].includes(value) ? value : "all";
  });
  const [selectedBatchId, setSelectedBatchId] = useState(() => new URLSearchParams(window.location.search).get("batchId") || "");
  function selectBatch(id) {
    const url = batchSelectionUrl(window.location.href, "frdo", id);
    if (url.href !== window.location.href) window.history.pushState({}, "", url);
    window.dispatchEvent(new Event("obrportal-registry-navigation"));
    setSelectedBatchId(id || "");
  }
  function navigateBatchStage(value) {
    setBatchStage(value);
    setSelectedBatchId("");
    const url = new URL(window.location.href);
    url.searchParams.delete("batchId");
    if (value === "all") url.searchParams.delete("batchStage");else url.searchParams.set("batchStage", value);
    window.history.pushState({}, "", url);
    window.dispatchEvent(new Event("obrportal-registry-navigation"));
  }
  const [taskGroup, setTaskGroup] = useState("");
  const [batchCandidateId, setBatchCandidateId] = useState("");
  useEffect(() => () => {
  }, []);
  const sessionOwner = useRef(captureAuthSession());
  const sessionKey = sessionOwner.current.generation;
  function navigateRegistry(view, push = true) {
    if (view === "mintrud") {
      onMintrud();
      return;
    }
    setBatchCandidateId("");
    const registry = ["frdo", "mintrud"].includes(view) ? view : "frdo";
    const next = ["frdo", "mintrud"].includes(view) ? "work" : view;
    if (registry !== "frdo") {
      latestLoadRef.current += 1;
      setObligations([]);
      setLoading(true);
      setPilotOrganizationFilter("");
      setPilotGroupFilter("");
    }
    setSelectedBatchId("");
    setWorkspaceView(next);
    setTaskGroup("");
    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.delete("batchId");
      url.searchParams.set("registry", registry);
      url.searchParams.set("registryView", next);
      window.history.pushState({}, "", url);
    window.dispatchEvent(new Event("obrportal-registry-navigation"));
    }
  }
  useEffect(() => {
    const pop = () => {
      setBatchCandidateId("");
      const query = new URLSearchParams(window.location.search);
      setSelectedBatchId(query.get("registry") === "mintrud" ? "" : query.get("batchId") || "");
      setBatchStage(["exported", "imported", "submitted", "reconciled"].includes(query.get("batchStage")) ? query.get("batchStage") : "all");
      const registry = query.get("registry") === "mintrud" ? "mintrud" : "frdo";
      if (registryRef.current !== registry && registry === "frdo") {
        latestLoadRef.current += 1;
        setObligations([]);
        setLoading(true);
        setPilotOrganizationFilter("");
        setPilotGroupFilter("");
      }
      setWorkspaceView(["work", "batches"].includes(query.get("registryView")) ? query.get("registryView") : "overview");
      setTaskGroup("");
    };
    window.addEventListener("popstate", pop);
    window.addEventListener("obrportal-registry-navigation", pop);
    return () => { window.removeEventListener("popstate", pop); window.removeEventListener("obrportal-registry-navigation", pop); };
  }, []);
  const [frdoScope, setFrdoScope] = useState("work");
  const latestLoadRef = useRef(0);
  const [filters, setFilters] = useState({
    q: "",
    status: ""
  });
  const [appliedFilters, setAppliedFilters] = useState({
    q: "",
    status: ""
  });
  const [obligations, setObligations] = useState([]);
  const [pilotCourseFilter, setPilotCourseFilter] = useState("");
  const [pilotOrganizationFilter, setPilotOrganizationFilter] = useState("");
  const [pilotGroupFilter, setPilotGroupFilter] = useState("");
  const [pilotCourseCatalog, setPilotCourseCatalog] = useState([]);
  useEffect(() => {
    let current = true;
    getAdminCourses().then(payload => {
      if (current) setPilotCourseCatalog(pilotCourseItems(payload));
    }).catch(() => {
      // Keep the registry list usable if the course catalog is inaccessible.
    });
    return () => {
      current = false;
    };
  }, []);
  const pilotCourseOptions = useMemo(() => {
    const byId = new Map();
    for (const course of pilotCourseCatalog) {
      const id = String(course?.id ?? course?.course_id ?? "").trim();
      if (!id) continue;
      const title = String(course?.title ?? course?.name ?? "").trim();
      byId.set(id, {
        id,
        label: title || `Курс ${id.slice(0, 8)}`
      });
    }
    for (const row of obligations) {
      const id = pilotCourseId(row);
      if (id && !byId.has(id)) {
        byId.set(id, {
          id,
          label: String(row.course_title || `Курс ${id.slice(0, 8)}`)
        });
      }
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, "ru-RU"));
  }, [pilotCourseCatalog, obligations]);
  const pilotOrganizationOptions = useMemo(() => pilotRegistryFacetOptions(obligations, "organization"), [obligations]);
  const pilotGroupOptions = useMemo(() => pilotRegistryFacetOptions(obligations.filter(row => !pilotOrganizationFilter || pilotRegistryFacet(row, "organization")?.id === pilotOrganizationFilter), "group"), [obligations, pilotOrganizationFilter]);
  const filteredObligations = useMemo(() => obligations.filter(row => {
    if (pilotOrganizationFilter && pilotRegistryFacet(row, "organization")?.id !== pilotOrganizationFilter) {
      return false;
    }
    if (pilotGroupFilter && pilotRegistryFacet(row, "group")?.id !== pilotGroupFilter) {
      return false;
    }
    return true;
  }), [obligations, pilotOrganizationFilter, pilotGroupFilter]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [editingContextId, setEditingContextId] = useState("");
  const [validationNotes, setValidationNotes] = useState({});
  const [editingProfileId, setEditingProfileId] = useState("");
  const [attemptsById, setAttemptsById] = useState({});
  const api = useMemo(() => {
    return bindRegistrySession({
      list: getAdminFrdoObligations,
      validate: validateAdminFrdoObligation,
      approve: approveAdminFrdoObligation,
      reopen: reopenAdminFrdoObligation,
      attempts: getAdminFrdoSubmissionAttempts,
      download: downloadAdminFrdoSubmissionAttempt,
      submitted: markAdminFrdoSubmissionAttemptSubmitted,
      result: recordAdminFrdoSubmissionAttemptResult
    }, sessionOwner.current);
  }, []);
  const load = useCallback(async () => {
    if (!active || !isCurrentAuthSession(sessionOwner.current)) return;
    const requestId = ++latestLoadRef.current;
    const owner = captureAuthSession();
    setLoading(true);
    setError("");
    try {
      const result = await api.list({
        q: appliedFilters.q,
        status: appliedFilters.status,
        course_id: pilotCourseFilter || undefined,
        limit: 100,
        ...{
          applicability_scope: frdoScope
        }
      });
      if (requestId !== latestLoadRef.current || !isCurrentAuthSession(owner)) return;
      const rows = Array.isArray(result) ? result : [];
      // The course-level exclusion applies to work, review and history alike.
      const visible = await pilotVisibleObligations(rows, "frdo");
      if (requestId !== latestLoadRef.current || !isCurrentAuthSession(owner)) return;
      setObligations(visible);
    } catch (err) {
      if (requestId === latestLoadRef.current) {
        setObligations([]);
        setError(formatApiError(err, "frdo"));
      }
    } finally {
      if (requestId === latestLoadRef.current) {
        setLoading(false);
      }
    }
  }, [api, "frdo", appliedFilters.q, appliedFilters.status, pilotCourseFilter, frdoScope, sessionKey, active]);
  useEffect(() => {
    setExpandedId("");
    setEditingContextId("");
    setEditingProfileId("");
    setAttemptsById({});
    setObligations([]);
    load();
    return () => {
      latestLoadRef.current += 1;
    };
  }, ["frdo", load]);
  async function withAction(key, callback) {
    if (!isCurrentAuthSession(sessionOwner.current) || busyKey) return false;
    setBusyKey(key);
    setError("");
    try {
      await callback();
      return true;
    } catch (err) {
      setError(formatApiError(err, "frdo"));
      return false;
    } finally {
      setBusyKey("");
    }
  }
  async function reloadAttempts(obligationId) {
    const attempts = await api.attempts(obligationId);
    if (!isCurrentAuthSession(sessionOwner.current)) return;
    setAttemptsById(current => ({
      ...current,
      [obligationId]: Array.isArray(attempts) ? attempts : []
    }));
  }
  async function toggleAttempts(obligation) {
    if (expandedId === obligation.id) {
      setExpandedId("");
      return;
    }
    setExpandedId(obligation.id);
    await withAction(`attempts:${obligation.id}`, () => reloadAttempts(obligation.id));
  }
  async function validate(obligation) {
    await withAction(`validate:${obligation.id}`, async () => {
      await api.validate(obligation.id);
      let note = "";
      setValidationNotes(current => ({
        ...current,
        [obligation.id]: note
      }));
      await load();
    });
  }
  async function approve(obligation) {
    await withAction(`approve:${obligation.id}`, async () => {
      // The protected approve endpoint rechecks readiness and captures a fresh snapshot.
      // /validate intentionally rejects the approved lifecycle state.

      const validated = await api.validate(obligation.id);
      await load();
      const readinessErrors = validated?.issues || validated?.obligation?.readiness_errors || validated?.readiness_errors || [];
      if (readinessErrors.length) {
        const readinessMessage = readinessErrors.map(item => formatReadinessIssue(item)).filter(Boolean).join("; ");
        throw new Error(readinessMessage || "\u0417\u0430\u043f\u0438\u0441\u044c \u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u0430 \u043a \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044e.");
      }
      if (!["ready", "needs_approval"].includes(validated?.obligation?.status || validated?.status)) {
        throw new Error("\u0417\u0430\u043f\u0438\u0441\u044c \u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u0430 \u043a \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044e.");
      }
      if (!isCurrentAuthSession(sessionOwner.current)) return;
      await api.approve(obligation.id);
      await load();
    });
  }
  async function reopen(obligation) {
    await withAction(`reopen:${obligation.id}`, async () => {
      await api.reopen(obligation.id);
      setExpandedId(obligation.id);
      await load();
      await reloadAttempts(obligation.id);
    });
  }
  async function saveContext(obligation, payload) {
    await withAction(`context:${obligation.id}`, async () => {
      await updateAdminFrdoObligationContext(obligation.id, payload);
      setEditingContextId("");
      await load();
    });
  }
  async function download(obligation, attempt) {
    await withAction(`download:${attempt.id}`, () => api.download(obligation.id, attempt.id));
  }
  async function markSubmitted(obligation, attempt, reference) {
    return withAction(`submitted:${attempt.id}`, async () => {
      await api.submitted(obligation.id, attempt.id, {
        external_reference: reference.trim() || null
      });
      await load();
      await reloadAttempts(obligation.id);
    });
  }
  async function recordResult(obligation, attempt, payload) {
    const normalized = payload.result_status.trim();
    if (!["accepted", "rejected", "correction_required"].includes(normalized)) {
      setError("Unsupported result_status");
      return false;
    }
    const externalId = normalized === "accepted" ? payload.external_id.trim() || null : null;
    const errors = normalized === "accepted" ? [] : payload.errors.split("\n").map(item => item.trim()).filter(Boolean);
    return withAction(`result:${attempt.id}`, async () => {
      await api.result(obligation.id, attempt.id, {
        result_status: normalized,
        external_id: externalId,
        errors
      });
      await load();
      await reloadAttempts(obligation.id);
    });
  }
  return <div data-testid="admin-registries-page" className="space-y-5">
      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              {"ФРДО"} · {workspaceView === "overview" ? "Обзор выборки" : workspaceView === "batches" ? "Партии и отправки" : "Рабочий список"}
            </h2>



          </div>

          <button type="button" className={SECONDARY} onClick={load} disabled={loading}>
            {loading ? T.loading : T.refresh}
          </button>
        </div>

        <div data-testid="admin-registries-tabs"><RegistryNavigation view={workspaceView} registry={"frdo"} onNavigate={navigateRegistry} /></div>
        {<div data-testid="admin-registries-frdo-scopes" role="group" aria-label="Применимость ФРДО" className="mt-4 flex flex-wrap gap-2">
            {[["work", "В работе"], ["review", "Требуется определить необходимость передачи"], ["history", "Передача не требуется"]].map(([value, label]) => <button key={value} type="button" data-testid={`admin-registries-frdo-scope-${value}`} aria-pressed={frdoScope === value} className={frdoScope === value ? BLUE : SECONDARY} disabled={Boolean(busyKey)} onClick={() => {
          if (frdoScope === value) return;
          latestLoadRef.current += 1;
          setObligations([]);
          setExpandedId("");
          setEditingContextId("");
          setAttemptsById({});
          setLoading(true);
          setFrdoScope(value);
        }}>
                {label}
              </button>)}
          </div>}

        {frdoScope !== "work" ? <p data-testid="admin-registries-frdo-scope-notice" className="mt-3 text-sm text-slate-600">
            {frdoScope === "history" ? "История решений о применимости ФРДО. Курсы с настройкой «Не требуется» скрыты. Только просмотр." : "Записи, требующие определения применимости. Курсы с настройкой «Не требуется» скрыты. Утверждение и экспорт недоступны."}
          </p> : null}
        <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Как работает передача сведений</summary>
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          {T.warning}
        </div>

        {<div data-testid="admin-registries-frdo-portal-available" className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-200">
            <div className="font-semibold text-emerald-950">
              {T.frdoPortalAvailableTitle}
            </div>

            <div className="mt-1">
              {T.frdoPortalAvailable}
            </div>
          </div>}
        </details>
      </section>
      {workspaceView === "overview" && <RegistryOverview rows={filteredObligations} registry={"frdo"} scope={frdoScope} filters={[pilotCourseFilter && (pilotCourseOptions.find(c => c.id === pilotCourseFilter)?.label || "выбранный курс"), appliedFilters.q && `поиск «${appliedFilters.q}»`, appliedFilters.status && (registryStatuses[appliedFilters.status]?.[0] || appliedFilters.status), pilotOrganizationFilter && "организация", pilotGroupFilter && "группа"].filter(Boolean).join(", ")} loading={loading} error={error} onGroup={group => {
      setWorkspaceView("work");
      setTaskGroup(group);
      const url = new URL(window.location.href);
      url.searchParams.set("registry", "frdo");
      url.searchParams.set("registryView", "work");
      window.history.pushState({}, "", url);
    window.dispatchEvent(new Event("obrportal-registry-navigation"));
    }} />}
      <div hidden={workspaceView === "overview"} className="space-y-4">
      <section data-testid="admin-registries-pilot-facets" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Отбор записей для обработки</h2>

          </div>
          <button type="button" className={SECONDARY} onClick={() => {
            setPilotCourseFilter("");
            setPilotOrganizationFilter("");
            setPilotGroupFilter("");
          }}>
            Сбросить отбор
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {pilotOrganizationOptions.length > 0 && <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Организация
            <select data-testid="admin-registries-filter-organization" className={INPUT} value={pilotOrganizationFilter} disabled={!pilotOrganizationOptions.length || Boolean(busyKey)} onChange={event => {
              setPilotOrganizationFilter(event.target.value);
              setPilotGroupFilter("");
            }}>
              <option value="">Все организации</option>
              {pilotOrganizationOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>}
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Курс
            <select data-testid="admin-registries-filter-course" className={INPUT} value={pilotCourseFilter} disabled={Boolean(busyKey)} onChange={event => {
              setPilotCourseFilter(event.target.value);
              setPilotOrganizationFilter("");
              setPilotGroupFilter("");
            }}>
              <option value="">Все курсы</option>
              {pilotCourseOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          {pilotGroupOptions.length > 0 && <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Группа
            <select data-testid="admin-registries-filter-group" className={INPUT} value={pilotGroupFilter} disabled={!pilotGroupOptions.length || Boolean(busyKey)} onChange={event => {
              setPilotGroupFilter(event.target.value);
            }}>
              <option value="">Все группы</option>
              {pilotGroupOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>}
        </div>
        <form data-testid="admin-registries-filters" className="mt-3 grid gap-2 md:grid-cols-[1fr_230px_auto]" onSubmit={event => {
          event.preventDefault();
          setAppliedFilters({
            q: filters.q.trim(),
            status: filters.status
          });
        }}>
          <input className={INPUT} value={filters.q} placeholder={T.search} onChange={event => setFilters(current => ({
            ...current,
            q: event.target.value
          }))} />

          <select className={INPUT} value={filters.status} onChange={event => setFilters(current => ({
            ...current,
            status: event.target.value
          }))}>
            <option value="">
              {T.allStatuses}
            </option>

            {STATUS_OPTIONS.map(status => <option key={status} value={status}>
                {registryStatuses[status]?.[0] || statusLabel(status)}
              </option>)}
          </select>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={PRIMARY}>
              {T.apply}
            </button>

            <button type="button" className={SECONDARY} onClick={() => {
              setFilters({
                q: "",
                status: ""
              });
              setAppliedFilters({
                q: "",
                status: ""
              });
            }}>
              {T.reset}
            </button>
          </div>
        </form>
        <p data-testid="admin-registries-filter-count" className="mt-3 text-xs text-slate-600">
          Показано {filteredObligations.length} из {obligations.length} загруженных записей.
          {!pilotOrganizationOptions.length || !pilotGroupOptions.length ? " Отбор по организации или группе недоступен: в выборке нет соответствующих связей." : ""}
          {" "}До 100 записей за запрос; это не полный реестр.
        </p>
      </section>

      <div hidden={workspaceView !== "batches"} data-testid="registry-batch-workspace" className="space-y-3">
      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">Партии и отправки</h2>
        <p className="my-2 text-sm text-slate-600">Файл, ручная передача и результаты — отдельные этапы. Создание файла не подтверждает отправку или принятие.</p>
        <div role="group" aria-label="Реестр партий" className="flex flex-wrap gap-2">
          {[['frdo', 'ФРДО · XLSX'], ['mintrud', 'Минтруд · XML v1.0.9']].map(([key, label]) => <button type="button" key={key} className={SECONDARY} aria-pressed={"frdo" === key} disabled={Boolean(busyKey)} onClick={() => {
              navigateRegistry(key);
              setWorkspaceView("batches");
              const url = new URL(window.location.href);
              url.searchParams.set("registryView", "batches");
              window.history.replaceState({}, "", url);
            window.dispatchEvent(new Event("obrportal-registry-navigation"));
            }}>{label}</button>)}
        </div>
        <label className="mt-3 grid gap-1 text-sm">Стадия партии<select className={INPUT} value={batchStage} onChange={e => navigateBatchStage(e.target.value)}><option value="all">Все стадии</option><option value="exported">Файл подготовлен</option><option value="imported">Импорт подтверждён</option><option value="submitted">Ожидаются результаты</option><option value="reconciled">Сверка завершена</option></select></label>
        <p className="mt-2 text-xs text-slate-500">История по ответу API выбранного реестра. Отбор курса и записей ниже относится к кандидатам нового файла, а не к истории партий.</p>
      </section>
      {active && workspaceView === "batches" && selectedBatchId && <SelectedRegistryBatch key={`${"frdo"}:${selectedBatchId}`} id={selectedBatchId} submission={frdoSubmission} confirmedSubmission={confirmedFrdoSubmission} readOnly={frdoScope !== "work"} registry={new URLSearchParams(window.location.search).get("registry") || "frdo"} onClose={() => selectBatch("")} pending={false} />}
      {batchCandidateId && <p role="status" className="text-sm">Подготовка партии для записи: {obligations.find(r => r.id === batchCandidateId)?.user_full_name || "выбранный слушатель"}. <button type="button" className={SECONDARY} onClick={() => setBatchCandidateId("")}>Все кандидаты</button></p>}
      <FrdoBatchCreation visible={active && workspaceView === "batches"} readOnly={frdoScope !== "work" || loading || Boolean(error)} obligations={frdoScope === "work" ? filteredObligations.filter(row => !batchCandidateId || row.id === batchCandidateId) : []} onCreated={() => setFrdoHistoryRevision(value => value + 1)} onRefresh={load} onSelectBatch={selectBatch} />
      {<FrdoPoBatchesPanel confirmedSubmission={confirmedFrdoSubmission} refreshKey={frdoHistoryRevision} readOnly={frdoScope !== "work"} stage={batchStage} onSelectBatch={selectBatch} />}


      {null}

      {null}

      </div>


      {error ? <div data-testid="admin-registries-error" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div> : null}

      {taskGroup && <p role="status">Выбрана группа задач. <button type="button" className={SECONDARY} onClick={() => setTaskGroup("")}>Показать все загруженные записи</button></p>}
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table data-testid="admin-registries-table" className="w-full text-left text-sm">
            <thead className="hidden xl:table-header-group bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr className="grid grid-cols-[1.1fr_1.3fr_1fr_0.9fr_1.5fr_1.7fr]">
                <th className="px-4 py-3">Слушатель</th>
                <th className="px-4 py-3">Курс</th>
                <th className="px-4 py-3">Документ</th>
                <th className="px-4 py-3">Состояние</th>
                <th className="px-4 py-3">Что мешает обработке</th>
                <th className="px-4 py-3">Следующее действие</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {T.loading}
                  </td>
                </tr> : null}

              {!loading && filteredObligations.filter(row => !taskGroup || registryWorkflow(row, {
                registry: "frdo",
                scope: frdoScope
              }).group === taskGroup).length === 0 ? <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <RegistryEmptyState error={error} filtered={Boolean(appliedFilters.q || appliedFilters.status || pilotCourseFilter || pilotOrganizationFilter || pilotGroupFilter || taskGroup)} scope={frdoScope} />
                  </td>
                </tr> : null}

              {!loading ? filteredObligations.filter(row => !taskGroup || registryWorkflow(row, {
                registry: "frdo",
                scope: frdoScope
              }).group === taskGroup).map(obligation => {
                const attempts = attemptsById[obligation.id] || [];
                const canChange = frdoScope === "work";
                const canValidate = canChange && ["pending_data", "ready", "needs_approval"].includes(obligation.status);
                const canApprove = canChange && ["ready", "needs_approval"].includes(obligation.status);
                const canReopen = canChange && ["rejected", "correction_required"].includes(obligation.status);
                const readiness = getReadinessPresentation(obligation);
                return <tr key={obligation.id} className="align-top">
                        <td colSpan={6} className="p-0">
                          <div className="grid grid-cols-1 break-words sm:grid-cols-2 xl:grid-cols-[1.1fr_1.3fr_1fr_0.9fr_1.5fr_1.7fr]">
                            <div className="min-w-0 px-3 py-1.5 xl:py-3">
                              {null}

                              <div className="font-semibold text-slate-900">
                                {obligation.user_full_name || "\u2014"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {obligation.user_email}
                              </div>
                            </div>

                            <div className="min-w-0 px-3 py-1.5 xl:py-3">
                              <div className="font-medium text-slate-900">
                                {obligation.course_title}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {{
                            vocational_training: "Профессиональное обучение",
                            advanced_training: "Повышение квалификации",
                            professional_retraining: "Профессиональная переподготовка"
                          }[obligation.regulatory_program_type] || ""}
                              </div>
                            </div>

                            <div className="min-w-0 px-3 py-1.5 xl:py-3">
                              <div className="font-medium text-slate-900">
                                {registryDocumentLabel(obligation)}
                              </div>


                            </div>

                            <div className="min-w-0 px-3 py-1.5 xl:py-3">
                              <div className="[&>span]:h-auto [&>span]:py-1 [&>span]:leading-4"><StatusBadge tone={statusTone(obligation.status)}>
                                {registryStatuses[obligation.status]?.[0] || "Состояние требует проверки"}
                              </StatusBadge></div>
                              {obligation.status === "exported" && <p className="mt-1 text-xs text-slate-500">Отправка не подтверждена</p>}
                            </div>

                            <div className="min-w-0 px-3 py-1.5 xl:py-3 text-xs leading-5 text-slate-600">
                              <div data-testid="admin-registry-readiness-state" className={(obligation.readiness_errors || []).length || obligation.last_error ? "text-red-700" : "text-slate-400"}>
                                {(obligation.readiness_errors || []).length ? [...new Set(obligation.readiness_errors.map(item => {
                            const code = typeof item === "string" ? item : item.code;
                            return READINESS_LABELS[code] || (typeof item === "object" && /[а-яА-Я]/.test(item.message || "") ? item.message : "Есть замечание — откройте подробности");
                          }).filter(Boolean))].join("; ") : obligation.last_error ? "Есть замечания — откройте подробности" : "—"}
                              </div>
                              {false}
                            </div>

                            <div className="min-w-0 px-3 py-1.5 xl:py-3">
                              <RegistryNextAction row={obligation} options={{
                          registry: "frdo",
                          scope: frdoScope,
                          write: undefined
                        }} busy={Boolean(busyKey)} onAction={action => {
                          if (action === "validate") validate(obligation);else if (action === "approve") {
                            approve(obligation);
                          } else if (action === "profile") {
                            setEditingContextId("");
                            setEditingProfileId(obligation.id);
                          } else if (action === "context") {
                            setEditingProfileId("");
                            setEditingContextId(obligation.id);
                          }else if (action === "batch") {
                            navigateRegistry("batches");
                            setBatchCandidateId(obligation.id);
                          } else if (action === "history" && canChange) {
                            toggleAttempts(obligation);
                          } else {
                            const details = document.getElementById(`registry-details-${obligation.id}`);
                            if (details) details.open = true;
                          }
                        }} />
                              <RegistryDetails id={`registry-details-${obligation.id}`}> <p className="text-xs">{registryWorkflow(obligation, {
                              registry: "frdo",
                              scope: frdoScope,
                              write: undefined
                            }).description}</p>
                                <p className="text-xs">{registryWorkflow(obligation, {
                              registry: "frdo",
                              scope: frdoScope,
                              write: undefined
                            }).reason}</p>
                                <p className="text-xs">{readiness.text}</p>
                                <dl className="my-2 break-all text-xs"><dt>Номер документа</dt><dd>{obligation.document_number || "—"}</dd><dt>Тип документа</dt><dd>{obligation.document_type || "—"}</dd><dt>Идентификатор записи</dt><dd>{obligation.id}</dd></dl>
                                {obligation.last_error && <p className="text-xs text-red-700">{obligation.last_error}</p>}
                                                              <RegistryDetails title="Проверка профиля слушателя"><RegistryLearnerProfileWarning userId={obligation.user_id} registry={"frdo"} refreshKey={obligation} onEdit={canChange ? () => {
                              setEditingProfileId(obligation.id);
                              setEditingContextId("");
                            } : undefined} />

                              </RegistryDetails>{false}<div className="flex flex-wrap gap-2">
                                {canValidate ? <button type="button" className={SECONDARY} disabled={Boolean(busyKey)} onClick={() => validate(obligation)}>
                                    {T.validate}
                                  </button> : null}

                                {canApprove ? <button type="button" className={BLUE} disabled={Boolean(busyKey)} onClick={() => approve(obligation)}>
                                    {T.approve}
                                  </button> : null}

                                {canReopen ? <button type="button" className={BLUE} disabled={Boolean(busyKey)} onClick={() => reopen(obligation)}>
                                    {T.reopen}
                                  </button> : null}

                                {canChange && obligation.user_id ? <button type="button" className={SECONDARY} disabled={Boolean(busyKey)} onClick={() => {
                              setEditingProfileId(editingProfileId === obligation.id ? "" : obligation.id);
                              setEditingContextId("");
                            }}>
                                    Профиль слушателя
                                  </button> : null}

                                {canValidate && obligation.regulatory_program_type === FRDO_PO_PROGRAM_TYPE ? <button type="button" className={SECONDARY} disabled={Boolean(busyKey)} onClick={() => setEditingContextId(editingContextId === obligation.id ? "" : obligation.id)}>
                                      {T.frdoContext}
                                    </button> : null}

                                <button type="button" className={SECONDARY} disabled={Boolean(busyKey) || !canChange} onClick={() => toggleAttempts(obligation)}>
                                  {T.attempts}
                                </button>
                              </div></RegistryDetails>
                            </div>
                          </div>

                          {false}
                          {editingProfileId === obligation.id && canChange ? <div className="border-t border-slate-100 px-4 pb-4">
                              <AdminRegistryLearnerProfileForm userId={obligation.user_id} registry={"frdo"} onCancel={() => setEditingProfileId("")} onSaved={load} />
                            </div> : null}

                          {editingContextId === obligation.id && canChange ? <div className="border-t border-slate-100 px-4 pb-4">
                              {null}
                              {<FrdoPoContextForm obligation={obligation} busy={Boolean(busyKey)} onCancel={() => setEditingContextId("")} onSave={payload => saveContext(obligation, payload)} />}
                            </div> : null}

                          {expandedId === obligation.id && canChange ? <div className="border-t border-slate-100 p-4">
                              <AttemptList registry={"frdo"} obligation={obligation} attempts={attempts} busy={Boolean(busyKey)} onDownload={attempt => download(obligation, attempt)} onSubmitted={(attempt, reference) => markSubmitted(obligation, attempt, reference)} onResult={(attempt, payload) => recordResult(obligation, attempt, payload)} />
                            </div> : null}
                        </td>
                      </tr>;
              }) : null}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </div>;
}
