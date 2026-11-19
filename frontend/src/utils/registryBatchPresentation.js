export function registryBatchPresentation(batch, detail) {
  const frdo = batch.registry === "frdo";
  const known = ["frdo", "mintrud"].includes(batch.registry);
  const type = frdo ? "XLSX" : "XML";
  const done = batch.status === "submitted" && Boolean(batch.reconciled_at);
  const stages = frdo ? {
    exported: ["Файл сформирован", "После фактической загрузки во ФРДО необходимо зафиксировать отправку."],
    submitted: ["Отправка подтверждена", "Ожидаются результаты. ФРДО допускает частичную сверку."],
  } : {
    exported: ["XML подготовлен", "После импорта XML во внешнем кабинете подтвердите выполненный импорт."],
    imported: ["Импорт подтверждён", "После фактического подписания и отправки отметьте это действие."],
    submitted: ["Отправка подтверждена", "Необходимо получить результаты всех записей для окончательной сверки."],
  };
  const stage = known && stages[batch.status];
  const items = detail?.id === batch.id && Array.isArray(detail.items) ? detail.items : null;
  return {
    title: known ? `${frdo ? "ФРДО" : "Минтруд"} · ${type}` : "Партия неизвестного типа",
    stage: done && known ? "Сверка завершена" : stage?.[0] || "Неизвестная стадия",
    next: done && known ? "Итоговые результаты обработки зафиксированы. Доступен просмотр." : stage?.[1] || "Проверьте исторические сведения партии. Доступность операций не подтверждена.",
    results: items ? `Результаты зафиксированы: ${items.filter(item => item.result_status != null).length} из ${items.length} обязательств` : "Для просмотра фактических результатов загрузите состав партии.",
  };
}

// One owner per mounted card. Invalidate on close, switch, retry and unmount.
export function createBatchDetailReader() {
  let version = 0;
  return {
    cancel() { version += 1; },
    async read(id, load, publish) {
      const request = ++version;
      publish({ id, loading: true, detail: null, error: false });
      try {
        const detail = await load(id);
        if (request !== version) return;
        if (detail?.id !== id || !Array.isArray(detail.items)) throw new Error("Batch detail mismatch");
        publish({ id, loading: false, detail, error: false });
      } catch {
        if (request === version) publish({ id, loading: false, detail: null, error: true });
      }
    },
  };
}
