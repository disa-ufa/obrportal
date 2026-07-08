import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyAdminLearnerImport,
  getAdminCourses,
  getAdminLearnerImportDetail,
  getAdminLearnerImports,
  getAdminOrganizations,
  getOrgLearningGroups,
  uploadAdminLearnerImport,
} from "../api/client";

const DASH = "—";

function formatDateTime(value) {
  if (!value) {
    return DASH;
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusTone(status) {
  if (status === "parsed" || status === "applied") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "failed" || status === "invalid" || status === "error") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (status === "processing") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function getStatusLabel(status) {
  const labels = {
    parsed: "Проверен",
    applied: "Применён",
    valid: "Валидная",
    invalid: "Ошибка",
    error: "Ошибка",
    failed: "Сбой",
    processing: "Обработка",
    draft: "Черновик",
  };

  return labels[status] || status || "Неизвестно";
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusTone(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function SummaryCard({ label, value, tone = "slate" }) {
  const toneClass = {
    slate: "bg-white text-slate-900 ring-slate-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    red: "bg-rose-50 text-rose-800 ring-rose-200",
    blue: "bg-blue-50 text-blue-800 ring-blue-200",
  }[tone] || "bg-white text-slate-900 ring-slate-200";

  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}


function WorkflowStep({ number, title, description }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white shadow-sm">
        {number}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-black text-slate-950">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{description}</div>
      </div>
    </div>
  );
}


function getEntityLabel(items, id, fallback = DASH) {
  if (!id) {
    return fallback;
  }

  const found = items.find((item) => String(item.id) === String(id));
  return found?.title || found?.name || found?.short_name || found?.slug || id || fallback;
}

function getImportContextParts(item, courses, organizations, learningGroups) {
  if (!item) {
    return [];
  }

  return [
    ["Курс", getEntityLabel(courses, item.course_id)],
    ["Орг.", getEntityLabel(organizations, item.organization_id)],
    ["Группа", getEntityLabel(learningGroups, item.learning_group_id)],
  ];
}

function ImportContextCell({ item, courses, organizations, learningGroups }) {
  const parts = getImportContextParts(item, courses, organizations, learningGroups).filter(([, value]) => value && value !== DASH);

  if (!parts.length) {
    return <span className="text-slate-400">{DASH}</span>;
  }

  return (
    <div className="space-y-0.5 text-xs leading-5 text-slate-600">
      {parts.map(([label, value]) => (
        <div key={label} className="max-w-[220px] truncate">
          <span className="font-black text-slate-500">{label}:</span> {value}
        </div>
      ))}
    </div>
  );
}

function safeJsonPreview(value) {
  if (!value || typeof value !== "object") {
    return DASH;
  }

  const entries = Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && `${item}`.trim() !== "")
    .slice(0, 4);

  if (!entries.length) {
    return DASH;
  }

  return entries.map(([key, item]) => `${key}: ${item}`).join("; ");
}

export function LearnerImportsPage() {
  const [imports, setImports] = useState([]);
  const [selectedImport, setSelectedImport] = useState(null);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [courses, setCourses] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [learningGroups, setLearningGroups] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [learningGroupId, setLearningGroupId] = useState("");
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("parsed");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applyingImportId, setApplyingImportId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedRows = selectedImport?.rows || [];
  const canApplySelectedImport = selectedImport?.status === "parsed" && (selectedImport?.valid_rows || 0) > 0;
  const selectedImportIsApplying = selectedImport?.id && applyingImportId === selectedImport.id;

  const totals = useMemo(() => {
    return imports.reduce(
      (acc, item) => {
        acc.totalRows += item.total_rows || 0;
        acc.validRows += item.valid_rows || 0;
        acc.invalidRows += item.invalid_rows || 0;
        return acc;
      },
      { totalRows: 0, validRows: 0, invalidRows: 0 }
    );
  }, [imports]);

  const readyToApplyCount = useMemo(() => {
    return imports.filter((item) => item.status === "parsed" && (item.valid_rows || 0) > 0).length;
  }, [imports]);

  async function loadImports(overrides = {}) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminLearnerImports({
        q: overrides.q ?? query,
        status: overrides.status ?? statusFilter,
        limit: 100,
      });
      setImports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Не удалось загрузить импорты слушателей.");
    } finally {
      setLoading(false);
    }
  }

  async function openImport(batchId) {
    if (!batchId) {
      return;
    }

    setSelectedImportId(batchId);
    setDetailLoading(true);
    setError("");

    try {
      const detail = await getAdminLearnerImportDetail(batchId);
      setSelectedImport(detail);
    } catch (err) {
      setError(err.message || "Не удалось открыть импорт.");
      setSelectedImport(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleApplySelectedImport() {
    if (!selectedImport?.id) {
      return;
    }

    setApplyingImportId(selectedImport.id);
    setError("");
    setNotice("");

    try {
      const applied = await applyAdminLearnerImport(selectedImport.id);
      setSelectedImport(applied);
      setNotice(
        `Импорт применён: создано пользователей ${applied.created_users_count}, профилей ${applied.created_profiles_count}, назначений ${applied.created_enrollments_count}.`
      );
      await loadImports();
    } catch (err) {
      setError(err.message || "Не удалось применить импорт.");
    } finally {
      setApplyingImportId("");
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Выберите CSV или XLSX файл для импорта.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const created = await uploadAdminLearnerImport(file, {
        notes,
        course_id: courseId,
        organization_id: organizationId,
        learning_group_id: learningGroupId,
      });
      setNotice(`Импорт загружен: ${created.valid_rows} валидных строк, ${created.invalid_rows} строк с ошибками.`);
      setFile(null);
      setNotes("");
      await loadImports();
      await openImport(created.id);
    } catch (err) {
      setError(err.message || "Не удалось загрузить импорт.");
    } finally {
      setUploading(false);
    }
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    loadImports();
  }

  const loadImportReferences = useCallback(async () => {
    setReferenceLoading(true);

    try {
      const [coursesData, organizationsData, groupsData] = await Promise.all([
        getAdminCourses({ limit: 300 }),
        getAdminOrganizations(),
        getOrgLearningGroups({ limit: 300 }),
      ]);

      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setOrganizations(Array.isArray(organizationsData) ? organizationsData : []);
      setLearningGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (err) {
      setError(err.message || "Не удалось загрузить курсы, организации и группы.");
    } finally {
      setReferenceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImports();
    loadImportReferences();
  }, [loadImportReferences]);

  return (
    <div className="space-y-6" data-testid="admin-learner-imports-page">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Админка / Импорт слушателей</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Импорт слушателей</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Загрузите CSV или XLSX файл, проверьте распознанные строки и ошибки перед созданием профилей, назначений и документов.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadImports()}
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Обновляем..." : "Обновить список"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <WorkflowStep number="1" title="Загрузить файл" description="CSV/XLSX и контекст назначения" />
          <div className="hidden items-center text-2xl text-slate-300 lg:flex">→</div>
          <WorkflowStep number="2" title="Проверить строки" description="Валидация и просмотр ошибок" />
          <div className="hidden items-center text-2xl text-slate-300 lg:flex">→</div>
          <WorkflowStep number="3" title="Применить импорт" description="Создать профили и назначения" />
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
            {notice}
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Файлов" value={imports.length} tone="blue" />
        <SummaryCard label="Валидных строк" value={totals.validRows} tone="green" />
        <SummaryCard label="Строк с ошибками" value={totals.invalidRows} tone="red" />
        <SummaryCard label="Готово к применению" value={readyToApplyCount} tone="blue" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-6">
          <form onSubmit={handleUpload} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-black text-slate-950">Загрузить файл</h2>
            <p className="mt-1 text-sm text-slate-600">
              Поддерживаются .csv и .xlsx. На этом шаге данные только проверяются и сохраняются как batch импорта.
            </p>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Файл импорта
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>

            <div className="grid gap-3">
              <label className="block text-sm font-semibold text-slate-800">
                Курс для назначения
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  disabled={referenceLoading}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Без назначения на курс</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title || course.slug || course.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Организация
                <select
                  value={organizationId}
                  onChange={(event) => {
                    const nextOrganizationId = event.target.value;
                    setOrganizationId(nextOrganizationId);

                    const selectedGroup = learningGroups.find((group) => group.id === learningGroupId);
                    if (selectedGroup && nextOrganizationId && selectedGroup.organization_id !== nextOrganizationId) {
                      setLearningGroupId("");
                    }
                  }}
                  disabled={referenceLoading}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Без организации</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name || organization.short_name || organization.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-800">
                Группа
                <select
                  value={learningGroupId}
                  onChange={(event) => {
                    const nextGroupId = event.target.value;
                    setLearningGroupId(nextGroupId);

                    const selectedGroup = learningGroups.find((group) => group.id === nextGroupId);
                    if (selectedGroup?.organization_id) {
                      setOrganizationId(selectedGroup.organization_id);
                    }
                  }}
                  disabled={referenceLoading}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Без группы</option>
                  {learningGroups
                    .filter((group) => !organizationId || group.organization_id === organizationId)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name || group.title || group.id}
                      </option>
                    ))}
                </select>
              </label>

              <p className="text-xs leading-relaxed text-slate-500">
                Если выбрать курс, после применения импорта будут созданы назначения. Организация и группа необязательны.
              </p>
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Примечание
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Например: первый курс, группа июль 2026"
                className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </label>

            <button
              type="submit"
              disabled={uploading}
              className="mt-5 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Загружаем..." : "Загрузить и проверить"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">История импортов</h2>
                <p className="mt-1 text-sm text-slate-600">Последние загруженные файлы и сводка проверки строк.</p>
              </div>
              {loading ? <span className="text-sm text-slate-500">Загрузка...</span> : null}
            </div>

            <form
              onSubmit={handleApplyFilters}
              data-testid="learner-import-history-filters"
              className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]"
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по файлу или примечанию"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Все статусы</option>
                <option value="parsed">Проверен</option>
                <option value="applied">Применён</option>
                <option value="draft">Черновик</option>
                <option value="processing">Обработка</option>
                <option value="failed">Сбой</option>
              </select>

              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                Фильтр
              </button>
            </form>

            <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Файл</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Контекст</th>
                    <th className="px-4 py-3">Строки</th>
                    <th className="px-4 py-3">Ошибки</th>
                    <th className="px-4 py-3">Дата</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {imports.length ? imports.map((item) => (
                    <tr key={item.id} className={selectedImportId === item.id ? "bg-blue-50/60" : ""}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.source_filename || "Без имени"}</div>
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-500">{item.notes || DASH}</div>
                      </td>
                      <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                      <td className="px-4 py-3">
                        <ImportContextCell
                          item={item}
                          courses={courses}
                          organizations={organizations}
                          learningGroups={learningGroups}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="font-semibold">{item.valid_rows}</span> / {item.total_rows}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.invalid_rows}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(item.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openImport(item.id)}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                        Импорты пока не найдены.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Детали импорта</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Выберите импорт в таблице, чтобы посмотреть распознанные строки и ошибки.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {detailLoading ? <span className="text-sm text-slate-500">Загрузка...</span> : null}

                {selectedImport ? (
                  <button
                    type="button"
                    onClick={handleApplySelectedImport}
                    disabled={!canApplySelectedImport || selectedImportIsApplying}
                    title={
                      selectedImport.status === "applied"
                        ? "Импорт уже применён"
                        : canApplySelectedImport
                          ? "Создать или обновить пользователей и профили по валидным строкам"
                          : "Нет валидных строк для применения"
                    }
                    className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {selectedImportIsApplying ? "Применяем..." : "Применить импорт"}
                  </button>
                ) : null}
              </div>
            </div>

            {selectedImport ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <SummaryCard label="Всего" value={selectedImport.total_rows} />
                  <SummaryCard label="Валидных" value={selectedImport.valid_rows} tone="green" />
                  <SummaryCard label="С ошибками" value={selectedImport.invalid_rows} tone="red" />
                  <SummaryCard label="Статус" value={getStatusLabel(selectedImport.status)} tone="blue" />
                </div>

                <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">№</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3">Данные</th>
                        <th className="px-4 py-3">Ошибки</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 font-semibold text-slate-700">{row.row_number}</td>
                          <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                          <td className="px-4 py-3 text-slate-700">{safeJsonPreview(row.normalized_data_json)}</td>
                          <td className="px-4 py-3">
                            {row.validation_errors_json?.length ? (
                              <ul className="list-disc space-y-1 pl-5 text-rose-700">
                                {row.validation_errors_json.map((item) => <li key={item}>{item}</li>)}
                              </ul>
                            ) : (
                              <span className="text-slate-400">{DASH}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200">
                Детали импорта не выбраны.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
