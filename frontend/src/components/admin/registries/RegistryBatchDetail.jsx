const labels = { accepted: "Принято", rejected: "Отклонено", correction_required: "Требуется исправление" };
export default function RegistryBatchDetail({ state, onRetry }) {
  if (state.loading) return <p role="status">Загрузка состава партии…</p>;
  if (state.error) return <div role="alert">Не удалось получить состав партии. Результаты не подтверждены. <button type="button" onClick={onRetry}>Повторить чтение</button></div>;
  if (!state.detail) return null;
  const items = state.detail.items;
  return <section aria-label="Состав партии" className="mt-3 space-y-3">
    <p className="text-xs">Идентификаторы относятся к обязательствам. Связь с текущим профилем, курсом или протоколом здесь не подтверждена.</p>
    {!items.length ? <p role="status">Состав партии пуст.</p> : <ol className="space-y-3">{items.map(item => <li key={item.id || item.obligation_id} className="rounded-xl border p-3 break-words">
      <p>Запись {item.position} · Реестровых записей: {item.record_count ?? "—"}</p>
      <p className="break-all">Обязательство: {item.obligation_id}</p>
      <p>Результат: {item.result_status == null ? "Не зафиксирован" : labels[item.result_status] || "Неизвестный результат"}</p>
      <p>Внешний идентификатор: {item.external_id || "—"}</p>
      <p>Дата фиксации: {item.result_recorded_at || "—"}</p>
      {item.errors_json?.length > 0 && <ul>{item.errors_json.map((error, index) => <li key={index}>{String(error)}</li>)}</ul>}
    </li>)}</ol>}
    <button type="button" onClick={onRetry}>Обновить состав</button>
  </section>;
}
