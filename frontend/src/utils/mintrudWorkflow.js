const REAPPROVE = "Проверьте данные и нажмите «Повторно утвердить».";

// Only fixed messages are displayed: API errors can include XML values or paths.
export function formatMintrudError(error, readinessLabels = {}) {
  const detail = error?.payload?.detail;
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
