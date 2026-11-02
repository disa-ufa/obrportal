import { useEffect, useState } from "react";
import { getAdminMintrudProtocolCandidates } from "../../api/client";

function showDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ru-RU");
}

export function MintrudProtocolCandidatesPanel({ courseId, organizationId, groupId }) {
  const [opened, setOpened] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!opened) return undefined;
    let canceled = false;
    setLoading(true);
    setError("");
    getAdminMintrudProtocolCandidates({
      course_id: courseId || undefined,
      organization_id: organizationId || undefined,
      learning_group_id: groupId || undefined,
      limit: 100,
    }).then((response) => {
      if (canceled) return;
      setRows(Array.isArray(response) ? response : []);
    }).catch(() => {
      if (canceled) return;
      setRows([]);
      setError("Не удалось получить список. Проверьте доступ к API Минтруда.");
    }).finally(() => {
      if (!canceled) setLoading(false);
    });
    return () => { canceled = true; };
  }, [opened, courseId, organizationId, groupId, revision]);

  return (
    <section data-testid="mintrud-protocol-candidates"
      className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Протоколы проверки знаний — предварительный подбор</h2>
          <p className="mt-1 text-xs text-slate-600">
            Завершение курса и результат онлайн-теста не заменяют проверку комиссией и подписанный протокол.
          </p>
        </div>
        <div className="flex gap-2">
          {opened && <button type="button" className="rounded-xl border px-3 py-2 text-xs"
            onClick={() => setRevision((x) => x + 1)}>Обновить</button>}
          <button type="button" data-testid="mintrud-protocol-candidates-toggle"
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
            onClick={() => setOpened((x) => !x)}>
            {opened ? "Скрыть" : "Подобрать слушателей"}
          </button>
        </div>
      </div>
      {opened && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-amber-800">
            Только просмотр, максимум 100 записей. Учитываются выбранные выше курс, организация и группа.
            Показанные даты онлайн-тестов не являются автоматически датами проверки знаний комиссией.
          </p>
          {loading ? <p className="text-xs">Загрузка…</p> : null}
          {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
          {!loading && !error && rows.length === 0 && <p className="text-xs text-slate-600">Подходящих завершённых зачислений нет.</p>}
          {!loading && !error && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr className="border-b bg-slate-50">
                  <th className="p-2">Слушатель / курс</th>
                  <th className="p-2">Завершение курса</th>
                  <th className="p-2">Онлайн-тесты</th>
                  <th className="p-2">Статус подготовки</th>
                </tr></thead>
                <tbody>{rows.map((item) => (
                  <tr key={item.obligation_id} className="border-b align-top">
                    <td className="p-2"><strong>{item.learner_name || "Без имени"}</strong>
                      <div className="text-slate-600">{item.course_title || "—"}</div></td>
                    <td className="p-2">{showDate(item.completed_at)}</td>
                    <td className="p-2">{item.passed_quiz_attempts || 0} успешных из {item.quiz_attempts || 0} попыток
                      <div className="text-slate-600">Последний успешный: {showDate(item.last_passed_at)}</div></td>
                    <td className="p-2">{item.review_label}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-500">Создание, подписание протоколов и отправка в ЕИСОТ здесь отключены до следующих этапов.</p>
        </div>
      )}
    </section>
  );
}
