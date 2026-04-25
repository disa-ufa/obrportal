import { useEffect, useMemo, useState } from "react";
import {
  createAdminDocument,
  deleteAdminDocument,
  downloadAdminDocument,
  getAdminDocuments,
  getAdminEnrollments,
  getAdminUsers,
  updateAdminDocument,
} from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

const DOCUMENT_STATUSES = [
  { value: "available", label: "Доступен" },
  { value: "draft", label: "Черновик" },
  { value: "revoked", label: "Отозван" },
];

function getDocumentStatusLabel(status) {
  return DOCUMENT_STATUSES.find((item) => item.value === status)?.label || status || "-";
}

function getDocumentStatusTone(status) {
  switch (status) {
    case "available":
      return "bg-green-50 text-green-700 ring-green-200";
    case "draft":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "revoked":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function getLearnerVisibilityLabel(documentItem) {
  if (documentItem.status === "available" && documentItem.file_available) {
    return "Слушатель может скачать";
  }

  if (documentItem.status === "available" && !documentItem.file_available) {
    return "Нужен файл для скачивания";
  }

  if (documentItem.file_available) {
    return "Файл скрыт от слушателя";
  }

  return "Файл не загружен";
}

function getLearnerVisibilityTone(documentItem) {
  if (documentItem.status === "available" && documentItem.file_available) {
    return "bg-green-50 text-green-700 ring-green-200";
  }

  if (documentItem.file_available) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getEnrollmentOptionLabel(enrollment) {
  const courseTitle = enrollment.course_title || "Программа без названия";
  const status = getEnrollmentStatusLabel(enrollment.status);
  const group = enrollment.learning_group_name ? ` · ${enrollment.learning_group_name}` : "";
  const organization = enrollment.organization_name ? ` · ${enrollment.organization_name}` : "";

  return `${courseTitle} · ${status}${group}${organization}`;
}

function getEnrollmentStatusLabel(status) {
  const labels = {
    assigned: "Назначен",
    in_progress: "В процессе",
    completed: "Завершён",
    cancelled: "Отменён",
  };

  return labels[status] || status || "-";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildDocumentVerificationPath(code) {
  if (!code) {
    return "/verify-document";
  }

  return `/verify-document?number=${encodeURIComponent(code)}`;
}

function buildEditForm(documentItem) {
  return {
    title: documentItem.title || "",
    document_type: documentItem.document_type || "",
    document_number: documentItem.document_number || "",
    status: documentItem.status || "available",
    enrollment_id: documentItem.enrollment_id || "",
  };
}

function EmptyState({ onReset }) {
  return (
    <div className="rounded-[2rem] bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200">
      <div className="font-semibold text-slate-900">Документы не найдены</div>
      <p className="mt-2 leading-6">
        Попробуйте снять фильтр по пользователю, статусу, типу документа или загрузите первый документ.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
      >
        Сбросить фильтр
      </button>
    </div>
  );
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const [filterUserId, setFilterUserId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDocumentType, setFilterDocumentType] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSavingId, setEditSavingId] = useState("");
  const [downloadSavingId, setDownloadSavingId] = useState("");
  const [deleteSavingId, setDeleteSavingId] = useState("");
  const [statusSavingKey, setStatusSavingKey] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    user_id: "",
    title: "",
    document_type: "Сертификат",
    document_number: "",
    status: "available",
    enrollment_id: "",
  });
  const [file, setFile] = useState(null);

  const [editingDocumentId, setEditingDocumentId] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    document_type: "",
    document_number: "",
    status: "available",
    enrollment_id: "",
  });
  const [editFile, setEditFile] = useState(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === form.user_id) || null,
    [form.user_id, users]
  );
  const selectedUserEnrollments = useMemo(
    () => enrollments.filter((enrollment) => enrollment.user_id === form.user_id),
    [enrollments, form.user_id]
  );


  function buildDocumentFilters(overrides = {}) {
    return {
      user_id: overrides.user_id ?? filterUserId,
      status: overrides.status ?? filterStatus,
      document_type: overrides.document_type ?? filterDocumentType,
      q: overrides.q ?? filterQuery,
    };
  }

  async function loadData(nextFilters = null) {
    try {
      setLoading(true);
      setError("");

      const filters = nextFilters ?? buildDocumentFilters();

      const [documentsResponse, usersResponse, enrollmentsResponse] = await Promise.all([
        getAdminDocuments(filters),
        getAdminUsers(),
        getAdminEnrollments({ limit: 300 }),
      ]);

      setDocuments(Array.isArray(documentsResponse) ? documentsResponse : []);
      setUsers(Array.isArray(usersResponse) ? usersResponse : []);
      setEnrollments(Array.isArray(enrollmentsResponse) ? enrollmentsResponse : []);
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось загрузить документы."}`.trim());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "user_id" ? { enrollment_id: "" } : {}),
    }));
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      user_id: "",
      title: "",
      document_type: "Сертификат",
      document_number: "",
      status: "available",
      enrollment_id: "",
    });
    setFile(null);

    const input = document.getElementById("admin-document-file");
    if (input) {
      input.value = "";
    }
  }

  function resetEditState() {
    setEditingDocumentId("");
    setEditForm({
      title: "",
      document_type: "",
      document_number: "",
      status: "available",
      enrollment_id: "",
    });
    setEditFile(null);

    const input = document.getElementById("admin-document-edit-file");
    if (input) {
      input.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.user_id) {
      setError("Выберите пользователя для документа.");
      return;
    }

    if (!form.title.trim()) {
      setError("Введите название документа.");
      return;
    }

    if (!form.document_type.trim()) {
      setError("Введите тип документа.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = new FormData();
      payload.append("user_id", form.user_id);
      payload.append("title", form.title.trim());
      payload.append("document_type", form.document_type.trim());
      payload.append("status", form.status);

      if (form.enrollment_id) {
        payload.append("enrollment_id", form.enrollment_id);
      }

      if (form.document_number.trim()) {
        payload.append("document_number", form.document_number.trim());
      }

      if (file) {
        payload.append("file", file);
      }

      const created = await createAdminDocument(payload);

      setSuccessMessage(`Документ создан: ${created.document_number}`);
      resetForm();
      await loadData(buildDocumentFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось создать документ."}`.trim());
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit(documentItem) {
    setError("");
    setSuccessMessage("");
    setEditingDocumentId(documentItem.id);
    setEditForm(buildEditForm(documentItem));
    setEditFile(null);

    const input = document.getElementById("admin-document-edit-file");
    if (input) {
      input.value = "";
    }
  }

  async function handleEditSubmit(event, documentId) {
    event.preventDefault();

    if (!editForm.title.trim()) {
      setError("Введите название документа.");
      return;
    }

    if (!editForm.document_type.trim()) {
      setError("Введите тип документа.");
      return;
    }

    try {
      setEditSavingId(documentId);
      setError("");
      setSuccessMessage("");

      const payload = new FormData();
      payload.append("title", editForm.title.trim());
      payload.append("document_type", editForm.document_type.trim());
      payload.append("document_number", editForm.document_number.trim());
      payload.append("status", editForm.status);
      payload.append("enrollment_id", editForm.enrollment_id);

      if (editFile) {
        payload.append("file", editFile);
      }

      const updated = await updateAdminDocument(documentId, payload);

      setSuccessMessage(`Документ обновлён: ${updated.document_number}`);
      resetEditState();
      await loadData(buildDocumentFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось обновить документ."}`.trim());
    } finally {
      setEditSavingId("");
    }
  }

  async function handleQuickStatusUpdate(documentItem, nextStatus) {
    if (nextStatus === "available" && !documentItem.file_available) {
      setError("Нельзя опубликовать документ без файла. Сначала загрузите файл в режиме редактирования.");
      return;
    }

    try {
      setStatusSavingKey(`${documentItem.id}:${nextStatus}`);
      setError("");
      setSuccessMessage("");

      const payload = new FormData();
      payload.append("status", nextStatus);

      const updated = await updateAdminDocument(documentItem.id, payload);

      setSuccessMessage(
        `Статус документа ${updated.document_number} изменён: ${getDocumentStatusLabel(updated.status)}`
      );
      await loadData(buildDocumentFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось изменить статус документа."}`.trim());
    } finally {
      setStatusSavingKey("");
    }
  }

  async function handleAdminDownload(documentItem) {
    if (!documentItem.file_available) {
      setError("Файл документа недоступен для скачивания.");
      return;
    }

    try {
      setDownloadSavingId(documentItem.id);
      setError("");
      setSuccessMessage("");

      await downloadAdminDocument(documentItem.id);
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось скачать документ."}`.trim());
    } finally {
      setDownloadSavingId("");
    }
  }

  async function handleDelete(documentItem) {
    const confirmed = window.confirm(
      `Удалить документ ${documentItem.document_number}? Действие нельзя отменить.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleteSavingId(documentItem.id);
      setError("");
      setSuccessMessage("");

      await deleteAdminDocument(documentItem.id);

      if (editingDocumentId === documentItem.id) {
        resetEditState();
      }

      setSuccessMessage(`Документ удалён: ${documentItem.document_number}`);
      await loadData(buildDocumentFilters());
    } catch (err) {
      setError(`${err.status || ""} ${err.message || "Не удалось удалить документ."}`.trim());
    } finally {
      setDeleteSavingId("");
    }
  }

  async function handleApplyFilter(event) {
    event.preventDefault();
    await loadData(buildDocumentFilters());
  }

  async function handleResetFilter() {
    setFilterUserId("");
    setFilterStatus("");
    setFilterDocumentType("");
    setFilterQuery("");
    await loadData({});
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200 md:p-10">
        <div className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Администрирование
        </div>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Документы пользователей
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Загрузка, редактирование и публикация сертификатов, удостоверений и других файлов.
          Черновик виден в личном кабинете слушателя, но скачать файл можно только после публикации документа
          со статусом «Доступен».
        </p>
      </section>

      {error && (
        <Alert title="Ошибка" tone="red">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert title="Готово" tone="green">
          {successMessage}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)]">
        <SectionCard title="Загрузить документ" subtitle="Файл будет сохранён в приватное хранилище">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Пользователь
              </span>
              <select
                value={form.user_id}
                onChange={(event) => updateField("user_id", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Выберите пользователя</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}{user.full_name ? ` — ${user.full_name}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedUser && (
              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-100">
                Документ будет назначен пользователю:{" "}
                <span className="font-semibold">{selectedUser.email}</span>
              </div>
            )}
            {selectedUser && (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Назначенная программа
                </span>
                <select
                  value={form.enrollment_id}
                  onChange={(event) => updateField("enrollment_id", event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Без привязки к назначению</option>
                  {selectedUserEnrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {getEnrollmentOptionLabel(enrollment)}
                    </option>
                  ))}
                </select>
                {selectedUserEnrollments.length === 0 && (
                  <span className="mt-2 block text-xs text-amber-700">
                    У выбранного пользователя пока нет назначенных программ.
                  </span>
                )}
              </label>
            )}

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Название документа
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Например: Сертификат о прохождении программы"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Тип документа
                </span>
                <input
                  type="text"
                  value={form.document_type}
                  onChange={(event) => updateField("document_type", event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Статус
                </span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {DOCUMENT_STATUSES.map((statusItem) => (
                    <option key={statusItem.value} value={statusItem.value}>
                      {statusItem.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Номер документа
              </span>
              <input
                type="text"
                value={form.document_number}
                onChange={(event) => updateField("document_number", event.target.value)}
                placeholder="Можно оставить пустым — номер сгенерируется автоматически"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Файл
              </span>
              <input
                id="admin-document-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
              <span className="mt-2 block text-xs text-slate-500">
                Допустимые форматы: PDF, DOC, DOCX, JPG, PNG.
              </span>
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Сохраняем..." : "Создать документ"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Очистить
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Список документов" subtitle="Документы из /api/v1/admin/documents">
          <form onSubmit={handleApplyFilter} className="mb-5 grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]">
            <input
              type="search"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Поиск: номер, код, название, e-mail, ФИО"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <select
              value={filterUserId}
              onChange={(event) => setFilterUserId(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Все пользователи</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}{user.full_name ? ` — ${user.full_name}` : ""}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Все статусы</option>
              {DOCUMENT_STATUSES.map((statusItem) => (
                <option key={statusItem.value} value={statusItem.value}>
                  {statusItem.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={filterDocumentType}
              onChange={(event) => setFilterDocumentType(event.target.value)}
              placeholder="Тип документа"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Применить
            </button>

            <button
              type="button"
              onClick={handleResetFilter}
              className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Сбросить
            </button>
          </form>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Загружаем документы...
            </div>
          ) : documents.length === 0 ? (
            <EmptyState onReset={handleResetFilter} />
          ) : (
            <div className="space-y-4">
              {documents.map((documentItem) => {
                const isEditing = editingDocumentId === documentItem.id;
                const isEditSaving = editSavingId === documentItem.id;
                const isDownloadSaving = downloadSavingId === documentItem.id;
                const isDeleteSaving = deleteSavingId === documentItem.id;
                const isPublishing = statusSavingKey === `${documentItem.id}:available`;
                const isDrafting = statusSavingKey === `${documentItem.id}:draft`;
                const isRevoking = statusSavingKey === `${documentItem.id}:revoked`;

                return (
                  <article
                    key={documentItem.id}
                    className="rounded-[2rem] bg-slate-50 p-5 ring-1 ring-slate-200"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getDocumentStatusTone(
                          documentItem.status
                        )}`}
                      >
                        {getDocumentStatusLabel(documentItem.status)}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                        {documentItem.document_type}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                        {documentItem.file_available ? "Файл загружен" : "Без файла"}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getLearnerVisibilityTone(
                          documentItem
                        )}`}
                      >
                        {getLearnerVisibilityLabel(documentItem)}
                      </span>
                    </div>

                    {!isEditing ? (
                      <>
                        <div className="mt-4">
                          <h2 className="text-xl font-bold text-slate-900">
                            {documentItem.title}
                          </h2>
                          <div className="mt-1 text-sm text-slate-500">
                            {documentItem.document_number}
                          </div>
                          <div className="mt-1 break-all text-xs font-semibold text-blue-700">
                            Код проверки: {documentItem.verification_code || "—"}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Пользователь
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {documentItem.user_email}
                            </div>
                            {documentItem.user_full_name && (
                              <div className="mt-1 text-slate-600">
                                {documentItem.user_full_name}
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Курс
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {documentItem.course_title || "-"}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Назначение
                            </div>
                            {documentItem.enrollment_id ? (
                              <div className="mt-2 space-y-1">
                                <div className="font-semibold text-slate-900">
                                  {getEnrollmentStatusLabel(documentItem.enrollment_status)}
                                </div>
                                <div className="text-slate-600">
                                  {documentItem.organization_name || "Организация не указана"}
                                </div>
                                <div className="text-slate-500">
                                  {documentItem.learning_group_name || "Группа не указана"}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 font-semibold text-slate-900">
                                Без привязки к назначению
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Создан
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(documentItem.created_at)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Обновлён
                            </div>
                            <div className="mt-2 font-semibold text-slate-900">
                              {formatDateTime(documentItem.updated_at)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(documentItem)}
                            disabled={isDeleteSaving}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Редактировать
                          </button>

                          <a
                            href={buildDocumentVerificationPath(documentItem.verification_code || documentItem.document_number)}
                            className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100"
                          >
                            Публичная проверка
                          </a>

                          <button
                            type="button"
                            onClick={() => handleAdminDownload(documentItem)}
                            disabled={!documentItem.file_available || isDownloadSaving || isDeleteSaving}
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDownloadSaving ? "Скачиваем..." : "Скачать"}
                          </button>

                          {documentItem.status !== "available" && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(documentItem, "available")}
                              disabled={!documentItem.file_available || isPublishing || isDeleteSaving}
                              className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isPublishing ? "Публикуем..." : "Опубликовать"}
                            </button>
                          )}

                          {documentItem.status === "available" && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(documentItem, "draft")}
                              disabled={isDrafting || isDeleteSaving}
                              className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDrafting ? "Снимаем..." : "В черновик"}
                            </button>
                          )}

                          {documentItem.status !== "revoked" && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate(documentItem, "revoked")}
                              disabled={isRevoking || isDeleteSaving}
                              className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isRevoking ? "Отзываем..." : "Отозвать"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(documentItem)}
                            disabled={isDeleteSaving}
                            className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleteSaving ? "Удаляем..." : "Удалить"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <form
                        onSubmit={(event) => handleEditSubmit(event, documentItem.id)}
                        className="mt-5 space-y-4 rounded-[2rem] bg-white p-5 ring-1 ring-blue-100"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Название
                            </span>
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(event) => updateEditField("title", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Тип документа
                            </span>
                            <input
                              type="text"
                              value={editForm.document_type}
                              onChange={(event) => updateEditField("document_type", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Статус
                            </span>
                            <select
                              value={editForm.status}
                              onChange={(event) => updateEditField("status", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            >
                              {DOCUMENT_STATUSES.map((statusItem) => (
                                <option key={statusItem.value} value={statusItem.value}>
                                  {statusItem.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Номер документа
                            </span>
                            <input
                              type="text"
                              value={editForm.document_number}
                              onChange={(event) => updateEditField("document_number", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Назначенная программа
                            </span>
                            <select
                              value={editForm.enrollment_id}
                              onChange={(event) => updateEditField("enrollment_id", event.target.value)}
                              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            >
                              <option value="">Без привязки к назначению</option>
                              {enrollments
                                .filter((enrollment) => enrollment.user_id === documentItem.user_id)
                                .map((enrollment) => (
                                  <option key={enrollment.id} value={enrollment.id}>
                                    {getEnrollmentOptionLabel(enrollment)}
                                  </option>
                                ))}
                            </select>
                          </label>

                          <label className="block md:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Заменить файл
                            </span>
                            <input
                              id="admin-document-edit-file"
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(event) => setEditFile(event.target.files?.[0] || null)}
                              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <span className="mt-2 block text-xs text-slate-500">
                              Чтобы слушатель мог скачать документ, загрузите файл и установите статус «Доступен».
                            </span>
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isEditSaving}
                            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isEditSaving ? "Сохраняем..." : "Сохранить"}
                          </button>
                          <button
                            type="button"
                            onClick={resetEditState}
                            disabled={isEditSaving}
                            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}