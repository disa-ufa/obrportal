import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MintrudProtocolWorkspace } from "../components/admin/MintrudProtocolWorkspace";
import { protocolLocation, navigateProtocol } from "../utils/mintrudProtocolPreview";
import * as mainRegistryApi from "../api/client";
import { getAdminCourses, getAdminCourseDetail, getAdminMintrudLinkedProtocols } from "../api/client";
import { bindRegistrySession } from "../utils/registrySession";
import { StatusBadge } from "../components/ui/StatusBadge";
import { FrdoPoContextForm } from "../components/admin/FrdoPoContextForm";
import { AdminRegistryLearnerProfileForm } from "../components/admin/AdminRegistryLearnerProfileForm";
import { FrdoPoBatchesPanel } from "../components/admin/FrdoPoBatchesPanel";
import { MintrudProtocolCandidatesPanel } from "../components/admin/MintrudProtocolCandidatesPanel";
import { MintrudProtocolDraftsPanel } from "../components/admin/MintrudProtocolDraftsPanel";
import { MintrudLinkedProtocols } from "../components/admin/MintrudLinkedProtocols";
import { formatMintrudError, prepareAndDownloadMintrudBatch } from "../utils/mintrudWorkflow";


const MINTRUD_RESULT_PENDING_KEY =
  "obrportal_mintrud_result_pending_ids_v1";

function readPendingMintrudResultIds() {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(
        MINTRUD_RESULT_PENDING_KEY
      ) || "[]"
    );
    return Array.isArray(value)
      ? value.filter((id) => (
          typeof id === "string" && id.length > 0
        ))
      : [];
  } catch {
    return [];
  }
}

const T = {
  mintrudResultUncertain:
    "Результат отправки неизвестен. Повторное сохранение заблокировано. Проверьте состояние партии.",
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
  frdoPortalAvailable: "\u0414\u043b\u044f \u0424\u0418\u0421 \u0424\u0420\u0414\u041e XLSX \u0444\u043e\u0440\u043c\u0438\u0440\u0443\u0435\u0442\u0441\u044f \u043f\u0430\u043a\u0435\u0442\u043d\u043e \u0438\u0437 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439 \u043f\u043e \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u0451\u043d\u043d\u043e\u043c\u0443 \u0440\u0430\u0431\u043e\u0447\u0435\u043c\u0443 \u0448\u0430\u0431\u043b\u043e\u043d\u0443. \u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u0438 \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u0435 \u043f\u0430\u043a\u0435\u0442\u043e\u0432 \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u044e\u0442\u0441\u044f \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u043c\u0438 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041f\u043e\u0441\u043b\u0435 \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u044f \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u0430\u0439\u043b \u0432 \u0424\u0418\u0421 \u0424\u0420\u0414\u041e \u0432\u0440\u0443\u0447\u043d\u0443\u044e, \u043e\u0442\u043c\u0435\u0442\u044c\u0442\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0443 \u0438 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u0443\u0439\u0442\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442.",
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

const FRDO_PO_PROGRAM_TYPE = "vocational_training";


const ARTIFACT_KIND_LABELS = {
  [INTERNAL_EXPORT_ARTIFACT]:
    "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 JSON",
  [PORTAL_UPLOAD_ARTIFACT]:
    "\u0424\u0430\u0439\u043b \u0434\u043b\u044f \u043f\u043e\u0440\u0442\u0430\u043b\u0430",
};


function mintrudBatchStatusLabel(status) {
  if (status === "exported") {
    return T.mintrudBatchStatusExported;
  }

  if (status === "imported") {
    return T.mintrudBatchStatusImported;
  }

  if (status === "submitted") {
    return T.mintrudBatchStatusSubmitted;
  }

  return status || "\u2014";
}


function mintrudBatchStatusTone(status) {
  if (status === "submitted") {
    return "green";
  }

  if (status === "imported") {
    return "blue";
  }

  return "amber";
}


function formatMintrudBatchTime(value) {
  if (!value) {
    return "\u2014";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU");
}




function buildMintrudBatchResultForms(
  batch
) {
  const forms = {};

  (batch?.items || []).forEach(
    (item) => {
      forms[item.obligation_id] = {
        result_status:
          item.result_status
          || "",
        external_id:
          item.external_id
          || "",
        errors: (
          item.errors_json
          || []
        ).join("\n"),
      };
    }
  );

  return forms;
}


function mintrudBatchResultsComplete(batch, forms) {
  const entries = batch?.items || [];
  const allowed = [
    "accepted",
    "rejected",
    "correction_required",
  ];

  return (
    entries.length > 0 &&
    entries.every((item) =>
      allowed.includes(
        forms[item.obligation_id]?.result_status
      )
    )
  );
}

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


function artifactDownloadLabel(
  attempt,
  registry
) {
  if (
    attempt?.artifact_kind
    === PORTAL_UPLOAD_ARTIFACT
  ) {
    if (registry === "frdo") {
      return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c XLSX \u0434\u043b\u044f \u0424\u0418\u0421 \u0424\u0420\u0414\u041e";
    }

    if (registry === "mintrud") {
      return "\u0421\u043a\u0430\u0447\u0430\u0442\u044c XML \u0434\u043b\u044f \u0415\u0418\u0421\u041e\u0422";
    }

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
  if (obligation?.registry === "mintrud" && obligation?.status === "approved") {
    return {
      kind: "review",
      text: "Данные утверждены ранее. Перед XML система проверит актуальность снимка. При отказе проверьте данные и выполните повторное утверждение.",
    };
  }
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


function formatApiError(error, registry) {
  if (registry === "mintrud") return formatMintrudError(error, READINESS_LABELS);
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
  onOpenProtocol,
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

  // P3.4C: audit-provenance lock for fields already sourced from a
  // recorded commission protocol. The server enforces this restriction too.
  const [sourceState, setSourceState] = useState({ loading: true, error: "", protocols: [] });
  useEffect(() => {
    let current = true;
    setSourceState({ loading: true, error: "", protocols: [] });
    getAdminMintrudLinkedProtocols(obligation.id)
      .then((value) => {
        if (current) setSourceState({
          loading: false, error: "",
          protocols: Array.isArray(value?.protocols) ? value.protocols : [],
        });
      })
      .catch((error) => {
        if (current) setSourceState({ loading: false, error: error?.message || "Нет данных об источнике", protocols: [] });
      });
    return () => { current = false; };
  }, [obligation.id]);
  const sourceProtocol = sourceState.protocols.find((item) => item.sync_provenance?.ever_synced);
  const authoritativeProtocol = sourceState.protocols.find((item) => item.sync_provenance?.applied);
  const protocolSourceKeys = ["protocol_number", "knowledge_check_date", "knowledge_check_result"];

  // P3.4E: only *display* a unique, non-conflicting source protocol when all
  // three registry values are still empty. Never put preview values into form
  // state: submit() must send only the saved registry context, not a draft.
  const soleLinkedProtocol = sourceState.protocols.length === 1
    ? sourceState.protocols[0] : null;
  const candidateFields = soleLinkedProtocol?.fields || {};
  const hasAllProposedFields = protocolSourceKeys.every((key) => {
    const value = candidateFields[key]?.source;
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
  const hasAnyStoredCheckField = protocolSourceKeys.some((key) => Boolean(form[key]));
  const previewProtocol = !sourceState.loading && !sourceState.error &&
    !sourceProtocol && !hasAnyStoredCheckField &&
    soleLinkedProtocol && hasAllProposedFields &&
    (soleLinkedProtocol.status === "draft" ||
      (soleLinkedProtocol.status === "recorded" && soleLinkedProtocol.recorded_snapshot_verified === true)) &&
    (soleLinkedProtocol.conflict_fields || []).length === 0 &&
    (soleLinkedProtocol.history_reasons || []).length === 0 &&
    (soleLinkedProtocol.structural_issues || []).length === 0
      ? soleLinkedProtocol : null;
  const previewValues = previewProtocol ? {
    protocol_number: String(candidateFields.protocol_number.source),
    knowledge_check_date: String(candidateFields.knowledge_check_date.source).slice(0, 10),
    knowledge_check_result: String(candidateFields.knowledge_check_result.source),
  } : null;
  const sourceFieldsLocked = sourceState.loading || Boolean(sourceState.error) ||
    Boolean(sourceProtocol) || Boolean(previewValues);

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
      Object.entries(form).filter(([key]) => (
        !sourceFieldsLocked || !protocolSourceKeys.includes(key)
      )).map(
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

      {authoritativeProtocol ? (
        <p data-testid="mintrud-context-audit-provenance" className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
          Номер, дата и результат заполнены из протокола № {authoritativeProtocol.protocol_number}.
          Эти три поля доступны только для просмотра. Должность и сведения работодателя можно уточнять отдельно.
        </p>
      ) : sourceProtocol ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          Есть история синхронизации протокола № {sourceProtocol.protocol_number}, но значения расходятся или требуют проверки.
          Ручная замена реквизитов проверки запрещена; необходима отдельная процедура сверки.
        </p>
      ) : sourceState.error ? (
        <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          Не удалось проверить происхождение реквизитов: {sourceState.error}. Поля проверки временно заблокированы.
        </p>
      ) : sourceState.loading ? (
        <p className="mt-3 text-xs text-slate-600">Проверяем источник реквизитов протокола…</p>
      ) : previewProtocol ? (
        <div data-testid="mintrud-draft-preview-not-saved" role="note" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-semibold">
            Предварительное отображение из {previewProtocol.status === "draft" ? "черновика" : "зафиксированного протокола"} № {previewProtocol.protocol_number}.
          </p>
          <p className="mt-1">
            Номер, дата и результат показаны ниже только для просмотра. В реестре Минтруда они пока пустые.
            Кнопка «Сохранить» не перенесёт эти три значения в PostgreSQL.
          </p>
          <p className="mt-1">
            {previewProtocol.status === "draft"
              ? "Сначала необходимо провести проверку знаний и зафиксировать фактическое решение комиссии."
              : "Результаты комиссии зафиксированы. Для переноса нужна отдельная сверка и подтверждённая синхронизация."}
          </p>
          <button type="button" className="mt-2 rounded-lg border border-amber-500 bg-white px-3 py-1.5 font-semibold"
            onClick={() => onOpenProtocol?.(previewProtocol)}>
            {previewProtocol.status === "draft"
              ? "Открыть протокол для оформления комиссии"
              : "Перейти к сверке и разрешённой синхронизации"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-600">
          Нет подтверждённой синхронизации с протоколом комиссии.
          {sourceState.protocols.length > 1
            ? " Связано несколько протоколов — выберите правильный вручную, предпросмотр в полях отключён."
            : " Значения из черновика не записываются в реестр автоматически."}
        </p>
      )}
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
            value={previewValues?.knowledge_check_result ?? form.knowledge_check_result}
            disabled={sourceFieldsLocked}
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
            value={previewValues?.knowledge_check_date ?? form.knowledge_check_date}
            disabled={sourceFieldsLocked}
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
            value={previewValues?.protocol_number ?? form.protocol_number}
            disabled={sourceFieldsLocked}
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
                {artifactDownloadLabel(attempt, registry)}
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
  return String(
    value?.course_title || value?.course?.title || value?.title || ""
  ).trim().toLocaleLowerCase("ru-RU");
}

function pilotCourseMode(course, field) {
  return String(course?.[field] ?? course?.course?.[field] ?? "")
    .trim().toLowerCase();
}

async function pilotVisibleObligations(rows, registry) {
  if (!rows.length) return rows;

  const field = registry === "frdo"
    ? "frdo_requirement_mode"
    : "mintrud_requirement_mode";

  // The obligation response may already contain the course setting.
  const unresolved = rows.filter((row) => !pilotCourseMode(row, field));
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
      if (!byTitle.has(title)
          || (previous && String(previous.id || previous.course_id) === id)) {
        byTitle.set(title, course);
      } else {
        byTitle.set(title, null);
      }
    }
  }

  courses.forEach(remember);

  const missingIds = [...new Set(unresolved
    .map((row) => {
      const id = pilotCourseId(row);
      if (id) return id;
      // Some obligation responses expose only a course title.
      return String(byTitle.get(pilotCourseTitle(row))?.id || "").trim();
    })
    .filter((id) => id && !pilotCourseMode(byId.get(id), field)))];

  // Resolve only distinct courses present on the current page (maximum 100 rows).
  // No database writes: these are existing GET endpoints.
  await Promise.all(missingIds.map(async (courseId) => {
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
    const course = (id && byId.get(id))
      || (!id || String(byName?.id || "") === id ? byName : null);
    const mode = pilotCourseMode(row, field) || pilotCourseMode(course, field);

    if (!mode) {
      unknownSettings += 1;
    } else if (mode !== "not_required") {
      visible.push(row);
    }
  }

  if (unknownSettings > 0) {
    // Fail closed: do not show potentially excluded learners or allow selection.
    throw new Error(
      "Не удалось определить настройки реестра для части курсов. " +
      "Рабочий список скрыт; проверьте доступ к данным курсов."
    );
  }

  return visible;
}

// F1 pilot facets: only IDs explicitly supplied by registry rows are used.
// Do not infer an organization/group from a learner's name or course title.
function pilotRegistryFacet(row, facet) {
  const source = facet === "organization"
    ? [
        [row?.enrollment_organization_id, row?.enrollment_organization_name],
        [row?.organization_id, row?.organization_name],
        [row?.organization?.id, row?.organization?.name],
        [row?.enrollment?.organization_id, row?.enrollment?.organization_name],
      ]
    : [
        [row?.learning_group_id, row?.learning_group_name],
        [row?.group_id, row?.group_name],
        [row?.learning_group?.id, row?.learning_group?.name],
        [row?.group?.id, row?.group?.name],
        [row?.enrollment?.group_id, row?.enrollment?.group_name],
      ];
  for (const [rawId, rawName] of source) {
    const id = String(rawId ?? "").trim();
    if (!id) continue;
    const name = String(rawName ?? "").trim();
    return {
      id,
      label: name || (facet === "organization" ? "Организация " : "Группа ") + id.slice(0, 8),
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
  return [...values.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "ru-RU")
  );
}

export function MainMintrudRegistriesPage({ onFrdo }) {
  const ownedApi = useMemo(() => bindRegistrySession(Object.fromEntries(["approveAdminFrdoObligation", "approveAdminMintrudObligation", "prepareAdminMintrudSubmissionBatch", "downloadAdminMintrudSubmissionBatch", "getAdminMintrudSubmissionBatch", "getAdminMintrudSubmissionBatches", "markAdminMintrudSubmissionBatchImported", "markAdminMintrudSubmissionBatchSubmitted", "reopenAdminFrdoObligation", "reopenAdminMintrudObligation", "downloadAdminFrdoSubmissionAttempt", "downloadAdminMintrudSubmissionAttempt", "getAdminCourses", "getAdminCourseDetail", "getAdminFrdoObligations", "getAdminFrdoSubmissionAttempts", "getAdminMintrudObligations", "getAdminMintrudLinkedProtocols", "getAdminMintrudSubmissionAttempts", "markAdminFrdoSubmissionAttemptSubmitted", "markAdminMintrudSubmissionAttemptSubmitted", "recordAdminFrdoSubmissionAttemptResult", "recordAdminMintrudSubmissionAttemptResult", "recordAdminMintrudSubmissionBatchResult", "updateAdminFrdoObligationContext", "updateAdminMintrudObligationContext", "validateAdminFrdoObligation", "validateAdminMintrudObligation"].map(name => [name, mainRegistryApi[name]]))), []);
  const { approveAdminFrdoObligation, approveAdminMintrudObligation, prepareAdminMintrudSubmissionBatch, downloadAdminMintrudSubmissionBatch, getAdminMintrudSubmissionBatch, getAdminMintrudSubmissionBatches, markAdminMintrudSubmissionBatchImported, markAdminMintrudSubmissionBatchSubmitted, reopenAdminFrdoObligation, reopenAdminMintrudObligation, downloadAdminFrdoSubmissionAttempt, downloadAdminMintrudSubmissionAttempt, getAdminCourses, getAdminFrdoObligations, getAdminFrdoSubmissionAttempts, getAdminMintrudObligations, getAdminMintrudLinkedProtocols, getAdminMintrudSubmissionAttempts, markAdminFrdoSubmissionAttemptSubmitted, markAdminMintrudSubmissionAttemptSubmitted, recordAdminFrdoSubmissionAttemptResult, recordAdminMintrudSubmissionAttemptResult, recordAdminMintrudSubmissionBatchResult, updateAdminFrdoObligationContext, updateAdminMintrudObligationContext, validateAdminFrdoObligation, validateAdminMintrudObligation } = ownedApi;
  const [activeRegistry, setActiveRegistry] = useState("mintrud");
  const [protocolRoute, setProtocolRoute] = useState(protocolLocation);
  useEffect(() => {
    const sync = () => setProtocolRoute(protocolLocation());
    window.addEventListener('popstate', sync);
    window.addEventListener('obrportal-registry-navigation', sync);
    return () => {window.removeEventListener('popstate', sync);window.removeEventListener('obrportal-registry-navigation', sync);};
  }, []);

  const [frdoScope, setFrdoScope] = useState("work");
  const latestLoadRef = useRef(0);

  const [filters, setFilters] = useState({
    q: "",
    status: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    q: "",
    status: "",
  });

  const [obligations, setObligations] = useState([]);
  const [pilotCourseFilter, setPilotCourseFilter] = useState("");
  const [pilotOrganizationFilter, setPilotOrganizationFilter] = useState("");
  const [pilotGroupFilter, setPilotGroupFilter] = useState("");
  const [pilotCourseCatalog, setPilotCourseCatalog] = useState([]);
  const [focusedProtocol, setFocusedProtocol] = useState(null);

  useEffect(() => {
    let current = true;
    getAdminCourses()
      .then((payload) => {
        if (current) setPilotCourseCatalog(pilotCourseItems(payload));
      })
      .catch(() => {
        // Keep the registry list usable if the course catalog is inaccessible.
      });
    return () => { current = false; };
  }, []);

  const pilotCourseOptions = useMemo(() => {
    const byId = new Map();
    for (const course of pilotCourseCatalog) {
      const id = String(course?.id ?? course?.course_id ?? "").trim();
      if (!id) continue;
      const title = String(course?.title ?? course?.name ?? "").trim();
      byId.set(id, {id, label: title || `Курс ${id.slice(0, 8)}`});
    }
    for (const row of obligations) {
      const id = pilotCourseId(row);
      if (id && !byId.has(id)) {
        byId.set(id, {id, label: String(row.course_title || `Курс ${id.slice(0, 8)}`)});
      }
    }
    return [...byId.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "ru-RU")
    );
  }, [pilotCourseCatalog, obligations]);

  const pilotOrganizationOptions = useMemo(() =>
    pilotRegistryFacetOptions(obligations, "organization"), [obligations]
  );

  const pilotGroupOptions = useMemo(() =>
    pilotRegistryFacetOptions(
      obligations.filter((row) =>
        !pilotOrganizationFilter ||
        pilotRegistryFacet(row, "organization")?.id === pilotOrganizationFilter
      ),
      "group"
    ),
    [obligations, pilotOrganizationFilter]
  );

  const filteredObligations = useMemo(() => obligations.filter((row) => {
    if (pilotOrganizationFilter &&
        pilotRegistryFacet(row, "organization")?.id !== pilotOrganizationFilter) {
      return false;
    }
    if (pilotGroupFilter &&
        pilotRegistryFacet(row, "group")?.id !== pilotGroupFilter) {
      return false;
    }
    return true;
  }), [obligations, pilotOrganizationFilter, pilotGroupFilter]);
  function openLinkedProtocol(protocol) {
    if (protocol?.course_id) {
      setPilotCourseFilter(String(protocol.course_id));
      setPilotOrganizationFilter("");
      setPilotGroupFilter("");
    }
    setFocusedProtocol({
      id: String(protocol.id),
      course_id: String(protocol.course_id),
      request: Date.now(),
    });
  }

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

  const [expandedId, setExpandedId] = useState("");
  const [editingContextId, setEditingContextId] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [attemptsById, setAttemptsById] = useState({});
  const [
    selectedMintrudIds,
    setSelectedMintrudIds,
  ] = useState([]);

  const [
    mintrudBatches,
    setMintrudBatches,
  ] = useState([]);

  const [
    mintrudBatchSubmitId,
    setMintrudBatchSubmitId,
  ] = useState("");

  const [
    mintrudBatchSubmitReference,
    setMintrudBatchSubmitReference,
  ] = useState("");

  const [
    mintrudBatchResultId,
    setMintrudBatchResultId,
  ] = useState("");

  const [
    mintrudBatchDetail,
    setMintrudBatchDetail,
  ] = useState(null);

  const [
    mintrudBatchResultForms,
    setMintrudBatchResultForms,
  ] = useState({});

  const [
    mintrudResultPendingIds,
    setMintrudResultPendingIds,
  ] = useState(readPendingMintrudResultIds);

  const mintrudResultPendingRef = useRef(
    new Set(mintrudResultPendingIds)
  );

  const selectedMintrudIdSet = useMemo(
    () => new Set(
      selectedMintrudIds
    ),
    [selectedMintrudIds]
  );

  const selectableMintrudIds = useMemo(
    () => filteredObligations
      .filter((obligation) => (
        obligation.status === "approved"
      ))
      .map((obligation) => (
        obligation.id
      )),
    [filteredObligations]
  );

  const selectedMintrudIdsInVisibleOrder = useMemo(
    () => filteredObligations
      .filter((obligation) => (
        obligation.status === "approved"
        && selectedMintrudIdSet.has(
          obligation.id
        )
      ))
      .map((obligation) => (
        obligation.id
      )),
    [
      filteredObligations,
      selectedMintrudIdSet,
    ]
  );

  const allSelectableMintrudSelected = (
    selectableMintrudIds.length > 0
    && selectableMintrudIds.every(
      (obligationId) => (
        selectedMintrudIdSet.has(
          obligationId
        )
      )
    )
  );


  const api = useMemo(() => {
    if (activeRegistry === "mintrud") {
      return {
        list: getAdminMintrudObligations,
        validate: validateAdminMintrudObligation,
        approve: approveAdminMintrudObligation,

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

      reopen: reopenAdminFrdoObligation,
      attempts: getAdminFrdoSubmissionAttempts,
      download: downloadAdminFrdoSubmissionAttempt,
      submitted: markAdminFrdoSubmissionAttemptSubmitted,
      result: recordAdminFrdoSubmissionAttemptResult,
    };
  }, [activeRegistry]);

  const load = useCallback(async () => {
    const requestId = ++latestLoadRef.current;
    setLoading(true);
    setError("");

    try {
      const result = await api.list({
        q: appliedFilters.q,
        status: appliedFilters.status,
        course_id: pilotCourseFilter || undefined,
        limit: 100,
        ...(activeRegistry === "frdo"
          ? { applicability_scope: frdoScope }
          : {}),
      });

      if (requestId !== latestLoadRef.current) return;

      const rows = Array.isArray(result) ? result : [];
      // The course-level exclusion applies to work, review and history alike.
      const visible = await pilotVisibleObligations(rows, activeRegistry);

      if (requestId !== latestLoadRef.current) return;
      setObligations(visible);
      if (activeRegistry === "mintrud") {
        setSelectedMintrudIds((current) => current.filter(
          (id) => visible.some((item) => item.id === id)
        ));
      }

      if (
        activeRegistry === "mintrud"
      ) {
        const batches = await (
          getAdminMintrudSubmissionBatches()
        );

        if (requestId !== latestLoadRef.current) return;

        setMintrudBatches(
          Array.isArray(batches)
            ? batches
            : []
        );
      } else {
        setMintrudBatches([]);
      }
    } catch (err) {
      if (requestId === latestLoadRef.current) {
        setObligations([]);
        setSelectedMintrudIds([]);
        setError(formatApiError(err, activeRegistry));
      }
    } finally {
      if (requestId === latestLoadRef.current) {
        setLoading(false);
      }
    }
  }, [
    api,
    activeRegistry,
    appliedFilters.q,
    appliedFilters.status,
    pilotCourseFilter,
    frdoScope,
  ]);

  useEffect(() => {
    setExpandedId("");
    setEditingContextId("");
    setEditingProfileId("");
    setAttemptsById({});
    setMintrudBatchSubmitId("");
    setMintrudBatchSubmitReference("");
    setMintrudBatchResultId("");
    setMintrudBatchDetail(null);
    setMintrudBatchResultForms({});
    setObligations([]);
    load();

    return () => {
      latestLoadRef.current += 1;
    };
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
      setError(formatApiError(err, activeRegistry));
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
        // The protected approve endpoint rechecks readiness and captures a fresh snapshot.
        // /validate intentionally rejects the approved lifecycle state.
        if (activeRegistry === "mintrud" && obligation.status === "approved") {
          await api.approve(obligation.id);
          await load();
          return;
        }
        const validated = await api.validate(
          obligation.id
        );

        await load();

        const readinessErrors = (
          validated?.issues
          || validated?.obligation?.readiness_errors
          || validated?.readiness_errors
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
          ].includes(validated?.obligation?.status || validated?.status)
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

  function toggleMintrudBatchSelection(
    obligationId
  ) {
    setSelectedMintrudIds(
      (current) => (
        current.includes(
          obligationId
        )
          ? current.filter(
            (item) => (
              item !== obligationId
            )
          )
          : [
            ...current,
            obligationId,
          ]
      )
    );
  }

  function selectAllMintrudBatch() {
    setSelectedMintrudIds([
      ...selectableMintrudIds,
    ]);
  }

  function clearMintrudBatchSelection() {
    setSelectedMintrudIds([]);
  }

  async function prepareMintrudBatch() {
    const obligationIds = [
      ...selectedMintrudIdsInVisibleOrder,
    ];

    if (!obligationIds.length) {
      setError(
        T.mintrudBatchNeedSelection
      );

      return;
    }

    await withAction(
      "mintrud-batch",
      async () => {
        await prepareAndDownloadMintrudBatch({
          ids: obligationIds,
          create: prepareAdminMintrudSubmissionBatch,
          download: downloadAdminMintrudSubmissionBatch,
          reload: load,
          clearSelection: () => setSelectedMintrudIds([]),
        });
      }
    );
  }


  async function downloadMintrudBatch(
    batch
  ) {
    await withAction(
      `mintrud-batch-download:${batch.id}`,
      () => (
        downloadAdminMintrudSubmissionBatch(
          batch.id
        )
      )
    );
  }


  async function confirmMintrudBatchImported(
    batch
  ) {
    await withAction(
      `mintrud-batch-imported:${batch.id}`,
      async () => {
        await (
          markAdminMintrudSubmissionBatchImported(
            batch.id
          )
        );

        await load();
      }
    );
  }


  function openMintrudBatchSubmitForm(
    batch
  ) {
    setMintrudBatchSubmitId(
      batch.id
    );

    setMintrudBatchSubmitReference(
      batch.external_reference || ""
    );
  }


  async function confirmMintrudBatchSubmitted(
    event,
    batch
  ) {
    event.preventDefault();

    const success = await withAction(
      `mintrud-batch-submitted:${batch.id}`,
      async () => {
        await (
          markAdminMintrudSubmissionBatchSubmitted(
            batch.id,
            {
              external_reference:
                mintrudBatchSubmitReference.trim()
                || null,
            }
          )
        );

        await load();
      }
    );

    if (success) {
      setMintrudBatchSubmitId("");
      setMintrudBatchSubmitReference("");
    }
  }




  function updateMintrudResultPending(batchId, pending) {
    const pendingIds = mintrudResultPendingRef.current;

    if (pending) {
      pendingIds.add(batchId);
    } else {
      pendingIds.delete(batchId);
    }

    const updated = [...pendingIds];
    setMintrudResultPendingIds(updated);

    try {
      window.sessionStorage.setItem(
        MINTRUD_RESULT_PENDING_KEY,
        JSON.stringify(updated)
      );
    } catch {
      // Keep the in-memory submission fence active.
    }
  }

  async function openMintrudBatchResults(
    batch
  ) {
    await withAction(
      `mintrud-batch-result-open:${batch.id}`,
      async () => {
        const detail = await (
          getAdminMintrudSubmissionBatch(
            batch.id
          )
        );

        if (!detail || detail.id !== batch.id) {
          throw new Error("Batch detail mismatch.");
        }

        if (detail.reconciled_at) {
          updateMintrudResultPending(batch.id, false);
        } else if (
          mintrudResultPendingRef.current.has(batch.id) &&
          mintrudBatchResultId === batch.id
        ) {
          // Preserve the operator's unsent draft.
          return;
        }

        setMintrudBatchResultId(
          batch.id
        );

        setMintrudBatchDetail(
          detail
        );

        setMintrudBatchResultForms(
          buildMintrudBatchResultForms(
            detail
          )
        );
      }
    );
  }


  function closeMintrudBatchResults() {
    setMintrudBatchResultId("");
    setMintrudBatchDetail(null);
    setMintrudBatchResultForms({});
  }


  function updateMintrudBatchResultForm(
    obligationId,
    field,
    value
  ) {
    setMintrudBatchResultForms(
      (current) => ({
        ...current,
        [obligationId]: {
          ...(current[
            obligationId
          ] || {
            result_status: "accepted",
            external_id: "",
            errors: "",
          }),
          [field]: value,
        },
      })
    );
  }


  async function submitMintrudBatchResults(
    event,
    batch
  ) {
    event.preventDefault();

    if (
      mintrudResultPendingRef.current.has(batch.id) ||
      mintrudBatchDetail?.reconciled_at
    ) {
      setError(T.mintrudResultUncertain);
      return;
    }

    if (
      !mintrudBatchResultsComplete(
        mintrudBatchDetail,
        mintrudBatchResultForms
      )
    ) {
      setError(T.mintrudBatchIncompleteResults);
      return;
    }


    if (
      !mintrudBatchDetail
      || mintrudBatchDetail.id
        !== batch.id
    ) {
      setError(
        "Batch detail is not loaded."
      );

      return;
    }

    const items = (
      mintrudBatchDetail.items
      || []
    ).map(
      (item) => {
        const form = (
          mintrudBatchResultForms[
            item.obligation_id
          ] || {
            result_status: "",
            external_id: "",
            errors: "",
          }
        );

        const resultStatus = (
          `${form.result_status || ""}`
          .trim()
        );

        if (
          ![
            "accepted",
            "rejected",
            "correction_required",
          ].includes(
            resultStatus
          )
        ) {
          throw new Error(
            "Unsupported result_status"
          );
        }

        return {
          obligation_id:
            item.obligation_id,
          result_status:
            resultStatus,
          external_id:
            resultStatus === "accepted"
              ? (
                  `${form.external_id || ""}`
                    .trim()
                  || null
                )
              : null,
          errors:
            resultStatus === "accepted"
              ? []
              : (
                  `${form.errors || ""}`
                    .split("\n")
                    .map(
                      (value) => (
                        value.trim()
                      )
                    )
                    .filter(Boolean)
                ),
        };
      }
    );

    const counts = items.reduce(
      (totals, item) => {
        totals[item.result_status] += 1;
        return totals;
      },
      {
        accepted: 0,
        rejected: 0,
        correction_required: 0,
      }
    );

    const confirmed = window.confirm(
      [
        T.mintrudBatchFinalConfirmTitle,
        T.mintrudBatchFinalConfirmWarning,
        "",
        `${T.mintrudBatchFinalTotal}: ${items.length}`,
        `${T.mintrudBatchFinalAccepted}: ${counts.accepted}`,
        `${T.mintrudBatchFinalRejected}: ${counts.rejected}`,
        `${T.mintrudBatchFinalCorrection}: ${counts.correction_required}`,
      ].join("\n")
    );

    if (!confirmed) {
      return;
    }

    updateMintrudResultPending(batch.id, true);

    const success = await withAction(
      `mintrud-batch-result:${batch.id}`,
      async () => {
        let detail = null;

        try {
          detail = await recordAdminMintrudSubmissionBatchResult(
            batch.id,
            { items }
          );
        } catch (postError) {
          try {
            const latest = await getAdminMintrudSubmissionBatch(
              batch.id
            );

            if (
              latest?.id === batch.id &&
              latest.reconciled_at
            ) {
              detail = latest;
            }
          } catch {
            // GET failed: do not conclude POST was rolled back.
          }

          if (!detail) {
            throw postError;
          }
        }

        if (
          detail?.id !== batch.id ||
          !detail.reconciled_at
        ) {
          throw new Error("Result recording is not confirmed.");
        }

        updateMintrudResultPending(batch.id, false);

        setMintrudBatchDetail(
          detail
        );

        setMintrudBatchResultForms(
          buildMintrudBatchResultForms(
            detail
          )
        );

        await load();
      }
    );

    if (!success) {
      if (mintrudResultPendingRef.current.has(batch.id)) {
        setError(T.mintrudResultUncertain);
      }
      return;
    }
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
        if (activeRegistry === "mintrud") {
          await updateAdminMintrudObligationContext(
            obligation.id,
            payload
          );
        } else {
          await updateAdminFrdoObligationContext(
            obligation.id,
            payload
          );
        }

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
            onClick={() => {load(); window.dispatchEvent(new Event("obrportal-mintrud-inputs-change"));}}
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
            onClick={() => {
              if (activeRegistry === "frdo") return;
              latestLoadRef.current += 1;
              setObligations([]);
              setLoading(true);
              setSelectedMintrudIds([]);
              setPilotCourseFilter("");
              setPilotOrganizationFilter("");
              setPilotGroupFilter("");
              onFrdo();
            }}
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
            onClick={() => {
              if (activeRegistry === "mintrud") return;
              latestLoadRef.current += 1;
              setObligations([]);
              setLoading(true);
              setSelectedMintrudIds([]);
              setPilotCourseFilter("");
              setPilotOrganizationFilter("");
              setPilotGroupFilter("");
              setActiveRegistry("mintrud");
            }}
          >
            {T.mintrud}
          </button>
        </div>

        {activeRegistry === "frdo" ? (
          <div
            data-testid="admin-registries-frdo-scopes"
            role="group"
            aria-label="Применимость ФРДО"
            className="mt-4 flex flex-wrap gap-2"
          >
            {[
              ["work", "В работе"],
              ["review", "На проверке"],
              ["history", "История"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                data-testid={`admin-registries-frdo-scope-${value}`}
                aria-pressed={frdoScope === value}
                className={frdoScope === value ? BLUE : SECONDARY}
                disabled={Boolean(busyKey)}
                onClick={() => {
                  if (frdoScope === value) return;
                  latestLoadRef.current += 1;
                  setObligations([]);
                  setExpandedId("");
                  setEditingContextId("");
                  setAttemptsById({});
                  setSelectedMintrudIds([]);
                  setLoading(true);
                  setFrdoScope(value);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {activeRegistry === "frdo" && frdoScope !== "work" ? (
          <p
            data-testid="admin-registries-frdo-scope-notice"
            className="mt-3 text-sm text-slate-600"
          >
            {frdoScope === "history"
              ? "История решений о применимости ФРДО. Курсы с настройкой «Не требуется» скрыты. Только просмотр."
              : "Записи, требующие определения применимости. Курсы с настройкой «Не требуется» скрыты. Утверждение и экспорт недоступны."}
          </p>
        ) : null}
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          {activeRegistry === "mintrud"
            ? T.mintrudWarning
            : T.warning}
        </div>

        {activeRegistry === "frdo" ? (
          <div
            data-testid="admin-registries-frdo-portal-available"
            className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-200"
          >
            <div className="font-semibold text-emerald-950">
              {T.frdoPortalAvailableTitle}
            </div>

            <div className="mt-1">
              {T.frdoPortalAvailable}
            </div>
          </div>
        ) : (
          <div
            data-testid="admin-registries-mintrud-portal-available"
            className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 ring-1 ring-emerald-200"
          >
            <div className="font-semibold text-emerald-950">
              {T.mintrudPortalAvailableTitle}
            </div>

            <div className="mt-1">
              {T.mintrudPortalAvailable}
            </div>
          </div>
        )}
      </section>

      <nav aria-label="Режим Минтруда" className="flex flex-wrap gap-2">
        <button type="button" className={SECONDARY} aria-pressed={protocolRoute.mode === 'learners'} onClick={() => navigateProtocol({mode: 'learners', id: ''})}>По слушателям</button>
        <button type="button" className={SECONDARY} aria-pressed={protocolRoute.mode === 'protocols'} onClick={() => navigateProtocol({mode: 'protocols', id: ''})}>По протоколам</button>
        <button type="button" className={SECONDARY} onClick={() => {navigateProtocol({mode: 'learners', id: ''}); setTimeout(() => document.querySelector('[data-testid="admin-registries-mintrud-batch"]')?.scrollIntoView(), 0);}}>XML-партии</button>
      </nav>
      {protocolRoute.mode === 'protocols' && error && <p role="alert" className="text-red-700">{error}</p>}
      {protocolRoute.mode === 'protocols' && <MintrudProtocolWorkspace route={protocolRoute} courses={pilotCourseOptions} formatIssue={formatReadinessIssue}
        onManage={protocol => {navigateProtocol({mode: 'learners', id: ''}); openLinkedProtocol(protocol);}}
        renderEditor={({row, target}, close) => {
          const obligation = {id: row.obligation_id, user_id: row.user_id, status: row.registry_status, mintrud_context: row.mintrud_context};
          if (!row.user_id || !row.obligation_id) return <p role="alert">Связь участника не подтверждена. Исправление требует отдельной сверки.</p>;
          return <div className="rounded-xl border border-slate-200 p-4" key={`${row.member_id}-${target}`}>
            <h3 className="font-bold">{row.learner_name} · {target === 'profile' ? 'Карточка слушателя' : 'Данные Минтруда'}</h3>
            <p>Изменения сохраняются только отдельным действием в существующем редакторе.</p>
            {target === 'profile' ? <AdminRegistryLearnerProfileForm userId={row.user_id} onCancel={close} onSaved={close}/> : <MintrudContextForm obligation={obligation} busy={Boolean(busyKey)} onCancel={close} onOpenProtocol={protocol => {close(); navigateProtocol({mode:'learners',id:''}); openLinkedProtocol(protocol);}} onSave={payload => withAction(`context:${obligation.id}`, async () => {await updateAdminMintrudObligationContext(obligation.id, payload); close(); await load();})}/>}
          </div>;
        }}/>
      }
      <div hidden={protocolRoute.mode === 'protocols'} className="space-y-5">
      <section
        data-testid="admin-registries-pilot-facets"
        className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Отбор записей для обработки</h2>
            <p className="mt-1 text-xs text-slate-600">
              Курс отбирается на сервере. Организация и группа — по загруженным строкам, если API передаёт их привязки.
            </p>
          </div>
          <button
            type="button"
            className={SECONDARY}
            onClick={() => {
              setSelectedMintrudIds([]);
              setPilotCourseFilter("");
              setPilotOrganizationFilter("");
              setPilotGroupFilter("");
            }}
          >
            Сбросить отбор
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Организация
            <select
              data-testid="admin-registries-filter-organization"
              className={INPUT}
              value={pilotOrganizationFilter}
              disabled={!pilotOrganizationOptions.length || Boolean(busyKey)}
              onChange={(event) => {
                setPilotOrganizationFilter(event.target.value);
                setPilotGroupFilter("");
                setSelectedMintrudIds([]);
              }}
            >
              <option value="">Все организации</option>
              {pilotOrganizationOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Курс
            <select
              data-testid="admin-registries-filter-course"
              className={INPUT}
              value={pilotCourseFilter}
              disabled={Boolean(busyKey)}
              onChange={(event) => {
                setPilotCourseFilter(event.target.value);
                setPilotOrganizationFilter("");
                setPilotGroupFilter("");
                setSelectedMintrudIds([]);
              }}
            >
              <option value="">Все курсы</option>
              {pilotCourseOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            Группа
            <select
              data-testid="admin-registries-filter-group"
              className={INPUT}
              value={pilotGroupFilter}
              disabled={!pilotGroupOptions.length || Boolean(busyKey)}
              onChange={(event) => {
                setPilotGroupFilter(event.target.value);
                setSelectedMintrudIds([]);
              }}
            >
              <option value="">Все группы</option>
              {pilotGroupOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
        <p data-testid="admin-registries-filter-count" className="mt-3 text-xs text-slate-600">
          Показано {filteredObligations.length} из {obligations.length} загруженных записей.
          {(!pilotOrganizationOptions.length || !pilotGroupOptions.length)
            ? " Фильтры организации/группы станут доступны, когда список реестра будет передавать соответствующие идентификаторы."
            : ""}
          {" "}Это пилотный отбор: максимум 100 записей в одной загрузке, не полный список всех подходящих записей.
        </p>
      </section>

      {activeRegistry === "frdo" ? (
        <FrdoPoBatchesPanel
          obligations={frdoScope === "work" ? filteredObligations : []}
          onRefresh={load}
          readOnly={frdoScope !== "work"}
        />
      ) : null}

      {activeRegistry === "mintrud" ? (
        <MintrudProtocolCandidatesPanel
          courseId={pilotCourseFilter}
          organizationId={pilotOrganizationFilter}
          groupId={pilotGroupFilter}
        />
      ) : null}

      {activeRegistry === "mintrud" ? (
        <MintrudProtocolDraftsPanel
          focusProtocol={focusedProtocol}
          courseId={pilotCourseFilter}
          organizationId={pilotOrganizationFilter}
          groupId={pilotGroupFilter}
        />
      ) : null}

      {activeRegistry === "mintrud" ? (
        <section
          data-testid="admin-registries-mintrud-batch"
          className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-sm font-bold text-slate-900">
                {T.mintrudBatchSelected}:{" "}
                {selectedMintrudIdsInVisibleOrder.length}
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                {T.mintrudBatchHint}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="admin-registries-mintrud-batch-select-all"
                className={SECONDARY}
                disabled={
                  Boolean(busyKey)
                  || selectableMintrudIds.length === 0
                  || allSelectableMintrudSelected
                }
                onClick={selectAllMintrudBatch}
              >
                {T.mintrudBatchSelectAll}
              </button>

              <button
                type="button"
                data-testid="admin-registries-mintrud-batch-clear"
                className={SECONDARY}
                disabled={
                  Boolean(busyKey)
                  || selectedMintrudIdsInVisibleOrder.length === 0
                }
                onClick={clearMintrudBatchSelection}
              >
                {T.mintrudBatchClear}
              </button>

              <button
                type="button"
                data-testid="admin-registries-mintrud-batch-download"
                className={PRIMARY}
                disabled={
                  Boolean(busyKey)
                  || selectedMintrudIdsInVisibleOrder.length === 0
                }
                onClick={prepareMintrudBatch}
              >
                {T.mintrudBatchPrepareDownload}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeRegistry === "mintrud" ? (
        <section
          data-testid="admin-registries-mintrud-batch-history"
          className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
        >
          <div>
            <div className="text-base font-black text-slate-950">
              {T.mintrudBatchHistoryTitle}
            </div>

            <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-600">
              {T.mintrudBatchHistoryHint}
            </p>
          </div>

          {!mintrudBatches.length ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {T.mintrudBatchHistoryEmpty}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {mintrudBatches.map((batch) => (
                <div
                  key={batch.id}
                  data-testid={`admin-registries-mintrud-batch-item-${batch.id}`}
                  className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {batch.id}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        XML v{batch.schema_version}
                        {" / "}
                        {batch.obligation_count}
                        {" obligations / "}
                        {batch.record_count}
                        {" RegistryRecord"}
                      </div>
                    </div>

                    <StatusBadge
                      tone={
                        mintrudBatchStatusTone(
                          batch.status
                        )
                      }
                    >
                      {mintrudBatchStatusLabel(
                        batch.status
                      )}
                    </StatusBadge>
                  </div>

                  <div className="mt-3 grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                    <div>
                      {"\u0421\u043e\u0437\u0434\u0430\u043d: "}
                      {formatMintrudBatchTime(
                        batch.generated_at
                      )}
                    </div>

                    <div>
                      {"\u0418\u043c\u043f\u043e\u0440\u0442: "}
                      {formatMintrudBatchTime(
                        batch.imported_at
                      )}
                    </div>

                    <div>
                      {"\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430: "}
                      {formatMintrudBatchTime(
                        batch.submitted_at
                      )}
                    </div>

                    <div className="break-all">
                      {"external_reference: "}
                      {batch.external_reference || "\u2014"}
                    </div>
                  </div>

                  <div className="mt-3 break-all text-[11px] text-slate-400">
                    SHA-256: {batch.artifact_sha256}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {batch.has_artifact ? (
                      <button
                        type="button"
                        className={SECONDARY}
                        disabled={Boolean(busyKey)}
                        onClick={() => (
                          downloadMintrudBatch(
                            batch
                          )
                        )}
                      >
                        {T.mintrudBatchDownload}
                      </button>
                    ) : null}

                    {batch.status === "exported" ? (
                      <button
                        type="button"
                        data-testid={`admin-registries-mintrud-batch-imported-${batch.id}`}
                        className={BLUE}
                        disabled={Boolean(busyKey)}
                        onClick={() => (
                          confirmMintrudBatchImported(
                            batch
                          )
                        )}
                      >
                        {T.mintrudBatchConfirmImported}
                      </button>
                    ) : null}

                    {batch.status === "submitted" ? (
                      <button
                        type="button"
                        data-testid={`admin-registries-mintrud-batch-results-open-${batch.id}`}
                        className={SECONDARY}
                        disabled={Boolean(busyKey)}
                        onClick={() => (
                          mintrudBatchResultId
                            === batch.id
                            ? closeMintrudBatchResults()
                            : openMintrudBatchResults(
                                batch
                              )
                        )}
                      >
                        {mintrudBatchResultId
                          === batch.id
                          ? T.cancel
                          : batch.reconciled_at
                            ? T.mintrudBatchViewResults
                            : T.mintrudBatchRecordResults}
                      </button>
                    ) : null}

                    {batch.status === "imported"
                    && mintrudBatchSubmitId
                      !== batch.id ? (
                      <button
                        type="button"
                        data-testid={`admin-registries-mintrud-batch-submitted-open-${batch.id}`}
                        className={PRIMARY}
                        disabled={Boolean(busyKey)}
                        onClick={() => (
                          openMintrudBatchSubmitForm(
                            batch
                          )
                        )}
                      >
                        {T.mintrudBatchConfirmSubmitted}
                      </button>
                    ) : null}
                  </div>

                  {batch.status === "imported"
                  && mintrudBatchSubmitId
                    === batch.id ? (
                    <form
                      data-testid={`admin-registries-mintrud-batch-submitted-form-${batch.id}`}
                      className="mt-4 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                      onSubmit={(event) => (
                        confirmMintrudBatchSubmitted(
                          event,
                          batch
                        )
                      )}
                    >
                      <label className="grid gap-1 text-xs font-semibold text-slate-700">
                        {T.mintrudBatchExternalReference}

                        <input
                          className={INPUT}
                          value={
                            mintrudBatchSubmitReference
                          }
                          maxLength={255}
                          disabled={Boolean(busyKey)}
                          onChange={(event) => (
                            setMintrudBatchSubmitReference(
                              event.target.value
                            )
                          )}
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          className={PRIMARY}
                          disabled={Boolean(busyKey)}
                        >
                          {T.mintrudBatchConfirmSubmitted}
                        </button>

                        <button
                          type="button"
                          className={SECONDARY}
                          disabled={Boolean(busyKey)}
                          onClick={() => {
                            setMintrudBatchSubmitId("");
                            setMintrudBatchSubmitReference("");
                          }}
                        >
                          {T.cancel}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {batch.status === "submitted"
                  && mintrudBatchResultId
                    === batch.id
                  && mintrudBatchDetail?.id
                    === batch.id ? (
                    <form
                      data-testid={`admin-registries-mintrud-batch-result-form-${batch.id}`}
                      className="mt-4 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                      onSubmit={(event) => (
                        submitMintrudBatchResults(
                          event,
                          batch
                        )
                      )}
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {T.mintrudBatchResults}
                        </div>

                        <div className="mt-1 text-xs leading-5 text-slate-600">
                          {mintrudBatchDetail.reconciled_at
                            ? (
                                T.mintrudBatchReconciled
                                + ": "
                                + formatMintrudBatchTime(
                                    mintrudBatchDetail
                                      .reconciled_at
                                  )
                              )
                            : T.mintrudBatchResultsHint}
                        </div>
                        {mintrudResultPendingIds.includes(batch.id) ? (
                          <div
                            data-testid={`admin-registries-mintrud-result-pending-${batch.id}`}
                            className="mt-2 text-sm text-amber-800"
                          >
                            <p>{T.mintrudResultUncertain}</p>
                            <button
                              type="button"
                              data-testid={`admin-registries-mintrud-result-check-${batch.id}`}
                              className={SECONDARY}
                              disabled={Boolean(busyKey)}
                              onClick={() => openMintrudBatchResults(batch)}
                            >
                              {T.mintrudResultCheck}
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {(mintrudBatchDetail.items || []).map(
                        (item) => {
                          const form = (
                            mintrudBatchResultForms[
                              item.obligation_id
                            ] || {
                              result_status: "",
                              external_id: "",
                              errors: "",
                            }
                          );

                          const readOnly = Boolean(
                            mintrudBatchDetail
                              .reconciled_at
                          );

                          return (
                            <div
                              key={item.id}
                              data-testid={`admin-registries-mintrud-batch-result-item-${item.obligation_id}`}
                              className="grid gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"
                            >
                              <div className="text-xs text-slate-600">
                                <span className="font-semibold text-slate-900">
                                  {T.mintrudBatchObligation}
                                  {": "}
                                </span>
                                <span className="break-all">
                                  {item.obligation_id}
                                </span>
                                {" / RegistryRecord: "}
                                {item.record_count}
                              </div>

                              <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                {T.mintrudBatchResultStatus}

                                <select
                                  className={INPUT}
                                  value={
                                    form.result_status
                                  }
                                  disabled={
                                    Boolean(busyKey)
                                    || readOnly
                                  }
                                  onChange={(event) => (
                                    updateMintrudBatchResultForm(
                                      item.obligation_id,
                                      "result_status",
                                      event.target.value
                                    )
                                  )}
                                >
                                  <option value="" disabled>
                                    {T.mintrudBatchChooseResult}
                                  </option>
                                  <option value="accepted">
                                    {statusLabel(
                                      "accepted"
                                    )}
                                  </option>

                                  <option value="rejected">
                                    {statusLabel(
                                      "rejected"
                                    )}
                                  </option>

                                  <option value="correction_required">
                                    {statusLabel(
                                      "correction_required"
                                    )}
                                  </option>
                                </select>
                              </label>

                              {form.result_status
                                === "accepted" ? (
                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                  {T.mintrudBatchExternalId}

                                  <input
                                    className={INPUT}
                                    value={
                                      form.external_id
                                    }
                                    maxLength={255}
                                    disabled={
                                      Boolean(busyKey)
                                      || readOnly
                                    }
                                    onChange={(event) => (
                                      updateMintrudBatchResultForm(
                                        item.obligation_id,
                                        "external_id",
                                        event.target.value
                                      )
                                    )}
                                  />
                                </label>
                              ) : (
                                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                                  {T.mintrudBatchErrors}

                                  <textarea
                                    className={`${INPUT} min-h-20 py-2`}
                                    value={
                                      form.errors
                                    }
                                    disabled={
                                      Boolean(busyKey)
                                      || readOnly
                                    }
                                    onChange={(event) => (
                                      updateMintrudBatchResultForm(
                                        item.obligation_id,
                                        "errors",
                                        event.target.value
                                      )
                                    )}
                                  />
                                </label>
                              )}
                            </div>
                          );
                        }
                      )}

                      {!mintrudBatchDetail.reconciled_at ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className={PRIMARY}
                            disabled={
                              Boolean(busyKey) ||
                              mintrudResultPendingIds.includes(batch.id) ||
                              !mintrudBatchResultsComplete(
                                mintrudBatchDetail,
                                mintrudBatchResultForms
                              )
                            }
                          >
                            {T.mintrudBatchRecordResults}
                          </button>

                          <button
                            type="button"
                            className={SECONDARY}
                            disabled={Boolean(busyKey)}
                            onClick={
                              closeMintrudBatchResults
                            }
                          >
                            {T.cancel}
                          </button>
                        </div>
                      ) : null}
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

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

              {!loading && filteredObligations.length === 0 ? (
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
                ? filteredObligations.map((obligation) => {
                    const attempts =
                      attemptsById[obligation.id] || [];

                    const canChange = (
                      activeRegistry !== "frdo"
                      || frdoScope === "work"
                    );

                    const canValidate = canChange && [
                      "pending_data",
                      "ready",
                      "needs_approval",
                    ].includes(
                      obligation.status
                    );

                    const canApprove = canChange && [
                      "ready",
                      "needs_approval",
                    ].includes(
                      obligation.status
                    ) || (activeRegistry === "mintrud" && obligation.status === "approved");

                    const canExport =
                      obligation.status === "approved";

                    const canReopen = canChange && [
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
                              {activeRegistry === "mintrud" ? (
                                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                                  <input
                                    data-testid={`admin-registries-mintrud-batch-select-${obligation.id}`}
                                    type="checkbox"
                                    checked={
                                      selectedMintrudIdSet.has(
                                        obligation.id
                                      )
                                    }
                                    disabled={
                                      !canExport
                                      || Boolean(busyKey)
                                    }
                                    onChange={() => (
                                      toggleMintrudBatchSelection(
                                        obligation.id
                                      )
                                    )}
                                  />

                                  <span>
                                    {T.mintrudBatchSelect}
                                  </span>
                                </label>
                              ) : null}

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
                                  {activeRegistry === "mintrud"
                                    ? formatMintrudError({ message: obligation.last_error }, READINESS_LABELS)
                                    : obligation.last_error}
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
                                    {activeRegistry === "mintrud" && obligation.status === "approved"
                                      ? "Повторно утвердить" : T.approve}
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

                                {canChange && obligation.user_id ? (
                                  <button
                                    type="button"
                                    className={SECONDARY}
                                    disabled={Boolean(busyKey)}
                                    onClick={() => {
                                      setEditingProfileId(
                                        editingProfileId === obligation.id ? "" : obligation.id
                                      );
                                      setEditingContextId("");
                                    }}
                                  >
                                    Исправить данные
                                  </button>
                                ) : null}

                                {canValidate
                                  && (
                                    activeRegistry === "mintrud"
                                    || obligation.regulatory_program_type
                                      === FRDO_PO_PROGRAM_TYPE
                                  ) ? (
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
                                      {activeRegistry === "mintrud"
                                        ? T.context
                                        : T.frdoContext}
                                    </button>
                                  ) : null}

                                <button
                                  type="button"
                                  className={SECONDARY}
                                  disabled={Boolean(busyKey) || !canChange}
                                  onClick={() => toggleAttempts(obligation)}
                                >
                                  {T.attempts}
                                </button>
                              </div>
                            </div>
                          </div>

                          {editingProfileId === obligation.id && canChange ? (
                            <div className="border-t border-slate-100 px-4 pb-4">
                              <AdminRegistryLearnerProfileForm
                                userId={obligation.user_id}
                                onCancel={() => setEditingProfileId("")}
                                onSaved={load}
                              />
                              {activeRegistry === "mintrud" ? (
                                <MintrudLinkedProtocols
                                  obligationId={obligation.id}
                                  onOpenProtocol={openLinkedProtocol}
                                />
                              ) : null}
                              {canValidate && (
                                activeRegistry === "mintrud"
                                || obligation.regulatory_program_type === FRDO_PO_PROGRAM_TYPE
                              ) ? (
                                activeRegistry === "mintrud" ? (
                                  <MintrudContextForm
                                    key={`${obligation.id}-mintrud-context-${obligation.mintrud_context?.protocol_number || ""}-${obligation.mintrud_context?.knowledge_check_date || ""}-${obligation.mintrud_context?.knowledge_check_result || ""}`}
                                    obligation={obligation}
                                    busy={Boolean(busyKey)}
                                    onCancel={() => setEditingProfileId("")}
                                    onOpenProtocol={openLinkedProtocol}
                                    onSave={(payload) => saveContext(obligation, payload)}
                                  />
                                ) : (
                                  <FrdoPoContextForm
                                    key={`${obligation.id}-frdo-context`}
                                    obligation={obligation}
                                    busy={Boolean(busyKey)}
                                    onCancel={() => setEditingProfileId("")}
                                    onSave={(payload) => saveContext(obligation, payload)}
                                  />
                                )
                              ) : null}
                            </div>
                          ) : null}

                          {editingContextId === obligation.id && canChange ? (
                            <div className="border-t border-slate-100 px-4 pb-4">
                              {activeRegistry === "mintrud" ? (
                                <MintrudLinkedProtocols
                                  obligationId={obligation.id}
                                  onOpenProtocol={openLinkedProtocol}
                                />
                              ) : null}
                              {activeRegistry === "mintrud" ? (
                                <MintrudContextForm
                                  key={`${obligation.id}-mintrud-context-${obligation.mintrud_context?.protocol_number || ""}-${obligation.mintrud_context?.knowledge_check_date || ""}-${obligation.mintrud_context?.knowledge_check_result || ""}`}
                                  obligation={obligation}
                                  busy={Boolean(busyKey)}
                                  onCancel={() => setEditingContextId("")}
                                  onOpenProtocol={openLinkedProtocol}
                                  onSave={(payload) => saveContext(
                                    obligation,
                                    payload
                                  )}
                                />
                              ) : (
                                <FrdoPoContextForm
                                  obligation={obligation}
                                  busy={Boolean(busyKey)}
                                  onCancel={() => setEditingContextId("")}
                                  onSave={(payload) => saveContext(
                                    obligation,
                                    payload
                                  )}
                                />
                              )}
                            </div>
                          ) : null}

                          {expandedId === obligation.id && canChange ? (
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
    </div>
  );
}
