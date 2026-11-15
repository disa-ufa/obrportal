import { validMintrudApprovalEventId } from "./mintrudBatchCreateJournal.js";

const REAPPROVE = "Проверьте данные и нажмите «Повторно утвердить».";

// Only fixed messages are displayed: API errors can include XML values or paths.
export function formatMintrudError(error, readinessLabels = {}) {
  const detail = error?.payload?.detail;
  if (detail?.code === "mintrud.batch_selection_changed") return "Готовность выбранных записей изменилась. Список обновлён; проверьте применимость, утверждение и историю.";
  if (/registry\.applicability|registry\.manual_authority/.test(typeof detail === "string" ? detail : detail?.code || "")) return "Применимость не подтверждена. Откройте проверку применимости; исторические записи требуют отдельной сверки.";
  if (detail?.code === "registry.batch_export.disabled") return "Пакетная выгрузка отключена в этой среде. История доступна для просмотра.";
  const issues = detail?.issues || detail?.readiness_errors || [];
  if (issues.length) {
    const labels = issues.map((item) => readinessLabels[item?.code]).filter(Boolean);
    return labels.length === issues.length
      ? labels.join("; ")
      : "Данные не готовы. Запустите проверку готовности и исправьте замечания перед утверждением.";
  }
  const text = typeof detail === "string" ? detail : (detail?.message || error?.message || "");
  if (/missing_snapshot|snapshot is missing/i.test(text)) {
    return `У старого утверждения отсутствует сохранённый снимок данных. ${REAPPROVE}`;
  }
  if (/missing_fingerprint|fingerprint is missing/i.test(text)) {
    return `У утверждения отсутствует контрольная сумма. ${REAPPROVE}`;
  }
  if (/stale|fingerprint.*mismatch|must be approved/i.test(text)) {
    return `Утверждение отсутствует или потеряло актуальность. ${REAPPROVE}`;
  }
  if (/learn.program|mintrud.*program/i.test(text)) {
    return "Для курса не выбрана доступная программа Минтруда. Проверьте справочник и привязку программы в карточке курса.";
  }
  if (/XSD|not well.formed/i.test(text)) {
    return "XML не прошёл проверку схемы ЕИСОТ 1.0.9. Проверьте данные и обратитесь к администратору; пакет не подготовлен.";
  }
  if (/file is missing|no attached artifact|batch not found/i.test(text)) {
    return "Файл пакета не найден. История сохранена; обратитесь к администратору для проверки хранилища.";
  }
  if (/checksum/i.test(text)) {
    return "Контрольная сумма файла не совпадает. Скачивание остановлено; обратитесь к администратору.";
  }
  if (/storage|failed to fetch|network|download/i.test(text)) {
    return "Не удалось получить XML. Проверьте соединение и повторите скачивание из истории пакетов. При повторной ошибке обратитесь к администратору.";
  }
  if (error?.status === 403) return "Недостаточно прав для операции Минтруда.";
  if (error?.status === 401) return "Сеанс завершён. Войдите снова.";
  return "Операция Минтруда не выполнена. Проверьте готовность данных и историю пакетов; при повторной ошибке обратитесь к администратору.";
}

export async function prepareAndDownloadMintrudBatch({ ids, create, download, reload, clearSelection }) {
  const batch = await create(ids);
  if (!batch?.id) throw new Error("Batch id missing");
  clearSelection();
  let downloadError;
  try {
    await download(batch.id);
  } catch (error) {
    downloadError = error;
  }
  // Creation already committed. Refresh history even when the browser download fails.
  try {
    await reload();
  } catch (error) {
    if (!downloadError) throw error;
  }
  if (downloadError) throw downloadError;
  return batch;
}

export async function verifyMintrudExportSelection(api, ids, { requireApprovalEvents = false } = {}) {
  const gate = await api.getAdminMintrudExportStatus();
  if (gate?.enabled !== true || gate.read_only !== true) throw new Error("Разрешение на экспорт не подтверждено.");
  const reviews = await Promise.all(ids.map(id => api.getAdminMintrudExportReadiness(id)));
  if (!ids.length || new Set(ids).size !== ids.length || reviews.some((item, index) =>
    item?.obligation_id !== ids[index] || item.batch_eligible !== true || item.read_only !== true || item.not_authorization_for_export !== true)) {
    throw new Error("Готовность выбранных записей не подтверждена.");
  }
  if (requireApprovalEvents) {
    const targets = reviews.map((item, index) => ({
      obligation_id: ids[index],
      approval_event_id: item.approval_event_id,
    }));

    if (targets.some(item =>
      !validMintrudApprovalEventId(item.approval_event_id)
    )) {
      throw new Error("Не удалось подтвердить идентификатор события утверждения.");
    }

    return { gate, targets };
  }

  return gate;
}

// Only responses that establish rejection before the batch writer
// may release the reservation. A general HTTP 409 is NOT sufficient.
export function isDefiniteMintrudPrewriteRejection(error) {
  const detail = error?.payload?.detail;

  if (error?.status === 422 &&
      Array.isArray(detail) &&
      detail.length > 0 &&
      detail.every(item =>
        Array.isArray(item?.loc) &&
        item.loc[0] === "body" &&
        typeof item.type === "string" &&
        item.type.length > 0
      )) {
    return true;
  }

  if (error?.status === 403 &&
      detail === "Permission required: mintrud.export") {
    return true;
  }

  if (error?.status === 409 &&
      detail !== null &&
      typeof detail === "object" &&
      !Array.isArray(detail) &&
      detail.code === "registry.batch_export.disabled") {
    return true;
  }

  return false;
}

// No automatic retry. An unknown result keeps every selected ID
// reserved, even if the caller later receives an unrelated error.
export async function createMintrudBatchWithDefiniteRejection({
  ids, create, attemptedIds, journal = null, targets = null,
}) {
  if (journal) {
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length ||
        !Array.isArray(targets) || targets.length !== ids.length ||
        targets.some((item, index) =>
          item?.obligation_id !== ids[index] ||
          !validMintrudApprovalEventId(item.approval_event_id)
        )) {
      throw new Error("Не удалось подтвердить выбранные записи и их события утверждения.");
    }

    const reservation = journal.begin(targets);
    if (!reservation) {
      throw new Error("Создание XML заблокировано. Проверьте историю пакетов и состояние журнала попыток.");
    }

    try {
      return await create(ids);
    } catch (error) {
      if (isDefiniteMintrudPrewriteRejection(error)) {
        journal.releaseDefiniteRejection(reservation);
      }
      throw error;
    }
  }

  if (!Array.isArray(ids) || !ids.length ||
      new Set(ids).size !== ids.length ||
      ids.some(id => attemptedIds.has(id))) {
    throw new Error("Создание пакета остановлено. Проверьте выбор записей и историю пакетов.");
  }

  ids.forEach(id => attemptedIds.add(id));

  try {
    return await create(ids);
  } catch (error) {
    if (isDefiniteMintrudPrewriteRejection(error)) {
      ids.forEach(id => attemptedIds.delete(id));
    }
    throw error;
  }
}
