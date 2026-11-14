import { KnowledgeProtocolOverview } from "./KnowledgeProtocolOverview";
import { MintrudParticipantCards } from "./MintrudParticipantCards";
import { MintrudSignaturePanel } from "./MintrudSignaturePanel";
import { useMintrudPermissions } from "../../hooks/useMintrudPermissions";
import { useEffect, useMemo, useRef, useState } from "react";
import { openProtocolDraftPrint } from "../../lib/printMintrudProtocolDraft";
import { checkProtocolDraftCompleteness } from "../../lib/checkMintrudProtocolReadiness";
import {
  captureAuthSession, isCurrentAuthSession,
  getAdminMintrudProtocol,
  createAdminMintrudProtocolDraft,
  getAdminMintrudProtocolCandidates,
  listAdminMintrudProtocolDrafts,
  getAdminMintrudProtocolDraft,
  updateAdminMintrudProtocolDraft,
  getAdminMintrudProtocolDraftPrintPreview,
  getAdminMintrudProtocolRecordingReadiness,
  recordAdminMintrudProtocolCommissionCheck,
  getAdminMintrudProtocolRegistryReconciliation,
  syncAdminMintrudProtocolRegistryFields,
} from "../../api/client";

const ctl = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";

export function MintrudProtocolDraftsPanel(props) {
  const { permissions, sessionKey, canWriteNow } = useMintrudPermissions();
  if (!permissions.includes("mintrud.read")) return <p role="status">Доступ к протоколам не подтверждён.</p>;
  return <ProtocolDraftsForSession key={sessionKey} {...props} permissions={permissions} canWriteNow={canWriteNow} />;
}
function ProtocolDraftsForSession({ courseId, organizationId, groupId, focusProtocol, permissions, canWriteNow, mode = "legacy", protocolId, onCreated }) {
  const canWrite = permissions.includes("mintrud.write");
  const [expanded, setExpanded] = useState(mode !== "legacy");
  const [candidates, setCandidates] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [number, setNumber] = useState("");
  const [protocolDate, setProtocolDate] = useState("");
  const [chair, setChair] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schemaReady, setSchemaReady] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [edit, setEdit] = useState(null);
  const [editingSaving, setEditingSaving] = useState(false);
  const [readinessById, setReadinessById] = useState({});
  const [checkingId, setCheckingId] = useState("");
  const [confirmRecordingById, setConfirmRecordingById] = useState({});
  const [recordingId, setRecordingId] = useState("");
  const [recordingRequestById, setRecordingRequestById] = useState({});
  const [reconciliationById, setReconciliationById] = useState({});
  const [reconcilingId, setReconcilingId] = useState("");
  const [syncSelectedById, setSyncSelectedById] = useState({});
  const [syncConfirmedById, setSyncConfirmedById] = useState({});
  const [syncingId, setSyncingId] = useState("");
  const [syncRequestById, setSyncRequestById] = useState({});
  const [syncOutcomeById, setSyncOutcomeById] = useState({});

  const readGeneration = useRef(0);

  async function reload() {
    const generation = ++readGeneration.current;
    const owner = captureAuthSession();
    const current = () => generation === readGeneration.current && isCurrentAuthSession(owner);
    if (!courseId) return;
    setLoading(true);
    setError("");
    try {
      const filters = { course_id: courseId, limit: 100 };
      if (organizationId) filters.organization_id = organizationId;
      if (groupId) filters.learning_group_id = groupId;
      const [people, existing, detail] = await Promise.all([
        canWrite ? getAdminMintrudProtocolCandidates(filters) : Promise.resolve([]),
        listAdminMintrudProtocolDrafts(courseId),
        mode === "detail" ? getAdminMintrudProtocol(protocolId) : Promise.resolve(null),
      ]);
      if (!current()) return;
      // Direct links must work even when this protocol is outside the list's 100-row limit.
      if (detail && Array.isArray(existing)) {
        const index = existing.findIndex(p => p.id === detail.id);
        if (index < 0) existing.push(detail); else existing[index] = detail;
      }
      setCandidates(Array.isArray(people) ? people : []);
      const saved = Array.isArray(existing) ? existing : [];
      if (focusProtocol?.id && focusProtocol.course_id === courseId && !saved.some(row => row.id === focusProtocol.id)) {
        const focused = await getAdminMintrudProtocolDraft(focusProtocol.id);
        if (focused?.id === focusProtocol.id && focused.course_id === courseId) saved.unshift(focused);
      }
      if (!current()) return;
      setDrafts(saved);
      setSchemaReady(true);
      // Saved snapshots can change; do not show a stale readiness report.
      setReadinessById({});
      setReconciliationById({});
      setConfirmRecordingById({});
      setSyncSelectedById({});
      setSyncConfirmedById({});
      setSyncOutcomeById({});
    } catch (exc) {
      if (!current()) return;
      setSchemaReady(false);
      if (mode !== "legacy") setDrafts([]);
      setError(exc?.message || "Не удалось получить проекты протоколов. Проверьте схему и доступ к API.");
    } finally {
      if (current()) setLoading(false);
    }
  }

  useEffect(() => {
    setSelected([]);
    setNotice("");
    setCandidates([]);
    setDrafts([]);
    setEditingId("");
    setEdit(null);
    setReadinessById({});
    setReconciliationById({});
    setConfirmRecordingById({});
    setSyncSelectedById({});
    setSyncConfirmedById({});
    setSyncOutcomeById({});
    if (expanded && courseId) reload();
    return () => { readGeneration.current += 1; };
  }, [expanded, courseId, organizationId, groupId, focusProtocol]);

  // A learner-card link opens the right course and the saved protocol list.
  useEffect(() => {
    if (focusProtocol?.id) setExpanded(true);
  }, [focusProtocol]);

  const existingIds = useMemo(
    () => new Set(drafts.flatMap(d => (d.participants || []).map(p => p.enrollment_id))),
    [drafts],
  );
  const selectable = useMemo(
    () => candidates.filter(p => p.enrollment_id && !existingIds.has(p.enrollment_id)),
    [candidates, existingIds],
  );

  const editingDraft = useMemo(() => drafts.find(d => d.id === editingId), [drafts, editingId]);
  const editorPeople = useMemo(() => {
    if (!editingDraft) return [];
    const unavailable = new Set(drafts.filter(d => d.id !== editingId).flatMap(d => (d.participants || []).map(m => m.enrollment_id)));
    const byId = new Map();
    for (const c of candidates) {
      if (c.enrollment_id && !unavailable.has(c.enrollment_id)) byId.set(c.enrollment_id, c);
    }
    for (const m of editingDraft.participants || []) {
      if (!byId.has(m.enrollment_id)) byId.set(m.enrollment_id, m);
    }
    return [...byId.values()].sort((a,b) => (a.learner_name || "").localeCompare(b.learner_name || "", "ru"));
  }, [candidates, drafts, editingId, editingDraft]);

  function beginEdit(d) {
    if (!canWriteNow()) return;
    setError("");
    setNotice("");
    setEditingId(d.id);
    setEdit({
      expectedUpdatedAt: d.updated_at,
      protocolNumber: d.protocol_number || "",
      protocolDate: d.protocol_date || "",
      chair: d.commission_chair || "",
      orderNumber: d.commission_order_number || "",
      orderDate: d.commission_order_date || "",
      membersText: (d.commission_members || []).join("\n"),
      notes: d.notes || "",
      selected: (d.participants || []).map(m => m.enrollment_id),
      results: Object.fromEntries((d.participants || []).map(m => [m.enrollment_id, {
        date: m.knowledge_check_date || "",
        result: m.knowledge_check_result || "",
      }])),
    });
  }

  useEffect(() => {
    if (!focusProtocol?.id || !expanded || !schemaReady ||
        String(focusProtocol.course_id) !== String(courseId)) return;
    const found = drafts.find(item => item.id === focusProtocol.id);
    if (!found) return;
    if (found.status === "draft") beginEdit(found);
    window.requestAnimationFrame(() => {
      document.getElementById(`mintrud-linked-protocol-${found.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [focusProtocol, expanded, schemaReady, drafts, courseId]);

  function setEditField(field, value) {
    setEdit(prev => prev && ({ ...prev, [field]: value }));
  }

  function setEditMember(enrollmentId, checked) {
    setEdit(prev => prev && ({
      ...prev,
      selected: checked
        ? [...prev.selected, enrollmentId]
        : prev.selected.filter(x => x !== enrollmentId),
      results: checked && !prev.results[enrollmentId]
        ? { ...prev.results, [enrollmentId]: { date: "", result: "" } }
        : prev.results,
    }));
  }

  function setManualResult(enrollmentId, key, value) {
    setEdit(prev => prev && ({
      ...prev,
      results: {
        ...prev.results,
        [enrollmentId]: { ...(prev.results[enrollmentId] || { date: "", result: "" }), [key]: value },
      },
    }));
  }

  async function saveEdit() {
    if (!canWriteNow()) return;
    setError(""); setNotice("");
    if (!editingId || !edit || !edit.selected.length || !edit.protocolNumber.trim() || !edit.protocolDate) {
      setError("Укажите номер, дату и хотя бы одного участника проекта.");
      return;
    }
    const incomplete = edit.selected.some(id => {
      const r = edit.results[id] || { date: "", result: "" };
      return Boolean(r.date) !== Boolean(r.result);
    });
    if (incomplete) {
      setError("Предварительный результат и дату проверки указывают вместе или оба поля оставляют пустыми.");
      return;
    }
    setEditingSaving(true);
    try {
      const result = await updateAdminMintrudProtocolDraft(editingId, {
        expected_updated_at: edit.expectedUpdatedAt,
        protocol_number: edit.protocolNumber.trim(),
        protocol_date: edit.protocolDate,
        enrollment_ids: edit.selected,
        commission_order_number: edit.orderNumber.trim() || null,
        commission_order_date: edit.orderDate || null,
        commission_chair: edit.chair.trim() || null,
        commission_members: edit.membersText.split("\n").map(x => x.trim()).filter(Boolean),
        notes: edit.notes.trim() || null,
        participant_results: edit.selected.map(id => ({
          enrollment_id: id,
          knowledge_check_date: edit.results[id]?.date || null,
          knowledge_check_result: edit.results[id]?.result || null,
        })),
      });
      await reload();
      beginEdit(result);
      setNotice(`Проект № ${result.protocol_number} обновлён: ${result.participant_count} участников. Статус — черновик, без подтверждения комиссии и выгрузки.`);
      // Move to readiness only after the server saved the draft.
      // Never trigger readiness, recording, signing or export.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const readinessButton = [...document.querySelectorAll("button")].find(
            button => button.textContent?.trim() === "Проверить перед фиксацией"
          );
          const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth";
          if (readinessButton) {
            readinessButton.scrollIntoView({
              behavior,
              block: "center",
            });
          } else {
            window.scrollTo({ top: 0, behavior });
          }
        });
      });
    } catch (exc) {
      setError(exc?.message || "Не удалось изменить проект. При конфликте обновите список.");
    } finally {
      setEditingSaving(false);
    }
  }

  async function checkSavedDraft(draftId) {
    setCheckingId(draftId);
    // The check reads only the persisted draft; pending editor changes are excluded.
    try {
      const saved = await getAdminMintrudProtocolDraftPrintPreview(draftId);
      const report = checkProtocolDraftCompleteness(saved);
      // Only backend report may enable recording; legacy client check is advisory.
      const authoritative = await getAdminMintrudProtocolRecordingReadiness(draftId);
      setReadinessById(prev => ({ ...prev, [draftId]: { report: authoritative, preliminaryMismatch: report.fieldsComplete !== authoritative.fieldsComplete } }));
    } catch (exc) {
      setReadinessById(prev => ({
        ...prev,
        [draftId]: { error: exc?.message || "Не удалось проверить сохранённый проект." },
      }));
    } finally {
      setCheckingId("");
    }
  }

  async function checkRegistryComparison(draftId) {
    setReconcilingId(draftId);
    setReconciliationById(prev => ({ ...prev, [draftId]: null }));
    try {
      // Always compare what is saved on the server, not unsaved editor changes.
      const report = await getAdminMintrudProtocolRegistryReconciliation(draftId);
      setReconciliationById(prev => ({ ...prev, [draftId]: { report } }));
      setSyncSelectedById(prev => ({ ...prev, [draftId]: report.sync_eligible_obligation_ids || [] }));
      setSyncConfirmedById(prev => ({ ...prev, [draftId]: false }));
      setSyncRequestById(prev => ({ ...prev, [draftId]: "" }));
    } catch (exc) {
      setReconciliationById(prev => ({ ...prev, [draftId]: { error: exc?.message || "Не удалось выполнить сверку." } }));
    } finally {
      setReconcilingId("");
    }
  }

  async function applySelectedRegistrySync(draftId) {
    const report = reconciliationById[draftId]?.report;
    const chosen = syncSelectedById[draftId] || [];
    if (!canWriteNow() || !report || !report.is_signed || !permissions.includes("mintrud.write") || !chosen.length || !syncConfirmedById[draftId]) return;
    setSyncingId(draftId);
    setSyncOutcomeById(prev => ({ ...prev, [draftId]: null }));
    setError(""); setNotice("");
    const key = syncRequestById[draftId] || window.crypto.randomUUID();
    setSyncRequestById(prev => ({ ...prev, [draftId]: key }));
    try {
      const result = await syncAdminMintrudProtocolRegistryFields(draftId, {
        request_id: key,
        expected_plan_token: report.sync_plan_token,
        obligation_ids: chosen,
        confirmed_sync: true,
      });
      const checked = result.readiness_results || [];
      const ready = checked.filter(item => item.is_ready).length;
      const message = result.replayed
        ? "Повторный запрос распознан: изменений не выполнено."
        : `Синхронизация: заполнено записей — ${(result.changed_obligation_ids || []).length}. Проверено — ${checked.length}, готово к отдельному утверждению — ${ready}. Утверждений и выгрузок не выполнено.`;
      setSyncOutcomeById(prev => ({ ...prev, [draftId]: { success: message, readiness: checked } }));
      setNotice(message);
      // Always force a new read, do not reuse a plan after writing.
      await checkRegistryComparison(draftId);
    } catch (exc) {
      const message = exc?.message || "Синхронизация отклонена. Повторите сверку.";
      setSyncOutcomeById(prev => ({ ...prev, [draftId]: { error: message } }));
      setError(message);
    } finally {
      setSyncingId("");
    }
  }

  const comparisonLabels = {
    protected_history: "Есть история утверждений или выгрузок — только ручная сверка",
    blocked_inconsistent_links: "Связь с реестром некорректна — автоматическая запись запрещена",
    manual_conflict: "Реквизиты расходятся — требуется проверка",
    draft_only: "Протокол остаётся черновиком — синхронизация невозможна",
    source_incomplete: "В зафиксированной записи отсутствуют исходные сведения",
    missing_target_fields: "В реестре есть незаполненные поля — для будущей обработки",
    matches: "Реквизиты совпадают; это не разрешение на повторную выгрузку",
  };
  const comparisonFieldLabels = {
    protocol_number: "Номер протокола",
    knowledge_check_date: "Дата проверки",
    knowledge_check_result: "Результат проверки",
  };
  const resultLabels = {
    satisfactory: "Удовлетворительно",
    unsatisfactory: "Неудовлетворительно",
  };
  function fieldDisplay(value) {
    if (value === null || value === undefined || value === "") return "—";
    return resultLabels[value] || String(value);
  }

  async function recordSavedDraft(d) {
    if (!canWriteNow()) return;
    if (d.status !== "draft" || !confirmRecordingById[d.id]) return;
    setError(""); setNotice("");
    setRecordingId(d.id);
    const id = recordingRequestById[d.id] || window.crypto.randomUUID();
    setRecordingRequestById(prev => ({ ...prev, [d.id]: id }));
    try {
      const saved = await recordAdminMintrudProtocolCommissionCheck(d.id, {
        expected_updated_at: d.updated_at,
        confirmation_id: id,
        confirmed_actual_check: true,
      });
      await reload();
      setEditingId(""); setEdit(null);
      setNotice(`Результаты комиссии по протоколу № ${saved.protocol_number} зафиксированы. Это НЕ подпись и НЕ отправка в ЕИСОТ.`);
    } catch (exc) {
      setError(exc?.message || "Сервер отказал в фиксации. Обновите проверку готовности.");
    } finally {
      setRecordingId("");
    }
  }

  async function printSavedDraft(draftId) {
    setError("");
    setNotice("");
    // Open immediately within the user's click to avoid popup blocking.
    const page = window.open("", "_blank", "width=1080,height=760");
    if (!page) {
      setError("Браузер заблокировал окно. Разрешите всплывающие окна для localhost:5173.");
      return;
    }
    page.opener = null;
    page.document.title = "Подготовка печатной формы";
    page.document.body.textContent = "Получение сохранённого проекта протокола…";
    try {
      const saved = await getAdminMintrudProtocolDraftPrintPreview(draftId);
      openProtocolDraftPrint(page, saved);
    } catch (exc) {
      page.close();
      setError(exc?.message || "Не удалось получить сохранённый проект для печати.");
    }
  }

  async function save() {
    if (!canWriteNow()) return;
    setError("");
    setNotice("");
    if (!schemaReady || !courseId || !selected.length || !number.trim() || !protocolDate) {
      setError("Выберите слушателей, введите номер и дату проекта протокола.");
      return;
    }
    setSaving(true);
    try {
      const result = await createAdminMintrudProtocolDraft({
        course_id: courseId,
        protocol_number: number.trim(),
        protocol_date: protocolDate,
        enrollment_ids: selected,
        commission_chair: chair.trim() || null,
      });
      setNotice(`Проект № ${result.protocol_number} создан. Участников: ${result.participant_count}. Проверка комиссией НЕ подтверждена.`);
      setSelected([]);
      setNumber("");
      setProtocolDate("");
      setChair("");
      await reload();
      onCreated?.(result);
    } catch (exc) {
      setError(exc?.message || "Не удалось сохранить проект протокола");
    } finally {
      setSaving(false);
    }
  }

  const displayedDrafts = mode === "create" ? [] : mode === "detail" ? drafts.filter(d => d.id === protocolId) : drafts;
  function openStep(d, step) {
    if (step === null) { reload(); return; }
    if (step < 3 && d.status === "draft" && canWrite && editingId !== d.id) beginEdit(d);
    if (step === 3 && d.status === "draft") checkSavedDraft(d.id);
    if (step === 5) checkRegistryComparison(d.id);
    window.requestAnimationFrame(() => {
      const target = step < 3 && d.status === "draft" && canWrite ? "protocol-editor" : step === 4 ? "protocol-signature" : step === 5 ? "protocol-registry" : step === 3 ? "protocol-readiness" : "protocol-participants";
      const node = document.getElementById(target);
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
      node?.focus({ preventScroll: true });
    });
  }

  return (
    <section data-testid="mintrud-protocol-drafts" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      {mode === "legacy" && <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Проекты протоколов комиссии</h2>
          <p className="mt-1 text-xs text-slate-600">Проект — не подтверждение заседания комиссии и не основание автоматической выгрузки в ЕИСОТ.</p>
        </div>
        <button type="button" className={ctl} onClick={() => setExpanded(v => !v)}>{expanded ? "Скрыть" : canWrite ? "Создать проект" : "Просмотреть проекты"}</button>
      </div>}
      {expanded && (
        <div className="mt-4 space-y-3">
          {!courseId && <p className="text-sm text-amber-800">Сначала выберите конкретный курс в фильтре выше. Для протокола допускается несколько слушателей одного курса, но из разных учебных групп.</p>}
          {courseId && (
            <>
              <div className="flex items-center gap-3"><button type="button" className={ctl} disabled={loading || saving} onClick={reload}>{mode === "detail" ? "Обновить протокол" : "Обновить список"}</button>{mode !== "detail" && <span className="text-xs text-slate-600">Доступно на странице: {selectable.length} (максимум 100)</span>}</div>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
              {loading && <p role="status">Загрузка протокола…</p>}
              {schemaReady && canWrite && mode !== "detail" && (
                <>
                  <label className="grid gap-1 text-sm">Поиск слушателя<input className={ctl} value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} /></label>
                  <p className="text-sm">Выбрано: {selected.length}. {selectable.filter(p => selected.includes(p.enrollment_id)).map(p => p.learner_name).join(", ")}</p>
                  <div className="max-h-60 space-y-1 overflow-auto rounded-xl border border-slate-200 p-3">
                    {selectable.length === 0 ? <p className="text-sm text-slate-600">Нет доступных слушателей. Убедитесь, что обучение завершено и записи не включены в другой проект.</p> : selectable.filter(person => !candidateSearch.trim() || (person.learner_name || "").toLocaleLowerCase("ru").includes(candidateSearch.trim().toLocaleLowerCase("ru"))).map(person => (
                      <label className="flex items-start gap-2 py-1 text-sm" key={person.enrollment_id}>
                        <input type="checkbox" className="mt-1" checked={selected.includes(person.enrollment_id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, person.enrollment_id] : prev.filter(x => x !== person.enrollment_id))}/>
                        <span>{person.learner_name || "Слушатель"} <span className="text-xs text-slate-500">(курс завершён: {person.completed_at ? new Date(person.completed_at).toLocaleDateString("ru-RU") : "не указано"})</span></span>
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="grid gap-1 text-xs font-semibold">Номер проекта протокола<input className={ctl} maxLength={128} value={number} onChange={e => setNumber(e.target.value)} placeholder="Например, 15/2026"/></label>
                    <label className="grid gap-1 text-xs font-semibold">Дата протокола (указать вручную)<input className={ctl} type="date" value={protocolDate} onChange={e => setProtocolDate(e.target.value)}/></label>
                    <label className="grid gap-1 text-xs font-semibold">Председатель (черновик)<input className={ctl} maxLength={255} value={chair} onChange={e => setChair(e.target.value)}/></label>
                  </div>
                  <button type="button" disabled={saving || !selected.length || !number.trim() || !protocolDate} onClick={save} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Сохранить проект на {selected.length} участников</button>
                </>
              )}
              {mode === "legacy" && <h3 className="text-sm font-semibold">Ранее сохранённые проекты</h3>}
              {mode === "legacy" && drafts.length === 0 ? <p className="text-xs text-slate-600">Проектов пока нет.</p> : displayedDrafts.map(d => (
                <div id={`mintrud-linked-protocol-${d.id}`} key={d.id} className="scroll-mt-36 rounded-xl border border-slate-200 p-3 text-sm">
                  {mode === "detail" && <KnowledgeProtocolOverview protocol={d} canWrite={canWrite} onStep={step => openStep(d, step)} />}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {mode === "legacy" && <span>№ {d.protocol_number} от {d.protocol_date} · {d.participant_count} участников · статус: {d.is_signed ? "бумажный оригинал подписан" : d.status === "recorded" ? "результаты зафиксированы" : "проект (не подписан)"}</span>}
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className={ctl} disabled={checkingId === d.id || d.status !== "draft"} onClick={() => checkSavedDraft(d.id)}>
                        {checkingId === d.id ? "Проверка…" : "Проверить готовность"}
                      </button>
                      <button type="button" className={ctl} disabled={reconcilingId === d.id} onClick={() => checkRegistryComparison(d.id)} title="Только чтение: данные протокола, ручные реквизиты, история утверждений, попыток и партий Минтруда">
                        {reconcilingId === d.id ? "Сверка…" : "Сверить с Минтрудом"}
                      </button>
                      <button type="button" className={ctl} disabled={!["draft", "recorded"].includes(d.status)} onClick={() => printSavedDraft(d.id)} title="Печатная форма сохранённого проекта; не является подписанным протоколом">{d.status === "draft" ? "Печать проекта" : "Печать протокола"}</button>
                      {canWrite && <button type="button" className={ctl} disabled={d.status !== "draft"} onClick={() => editingId === d.id ? (setEditingId(""), setEdit(null)) : beginEdit(d)}>
                        {editingId === d.id ? "Закрыть редактор" : "Редактировать проект"}
                      </button>}
                    </div>
                  </div>
                  <div id={mode === "detail" ? "protocol-signature" : undefined} tabIndex={-1} className="scroll-mt-8">
                  {mode === "detail" && <h2 className="mt-4 font-bold">Подписание и скан</h2>}
                  <MintrudSignaturePanel key={d.id} protocol={d} permissions={permissions} canWriteNow={canWriteNow} onChanged={p => setDrafts(items => items.map(item => item.id === p.id ? p : item))} />
                  </div>
                  <div id={mode === "detail" ? "protocol-participants" : undefined} tabIndex={-1} className="scroll-mt-8">
                    {mode === "detail" && <section className="mt-4 text-sm"><h2 className="font-bold">Комиссия</h2><p>Приказ: {d.commission_order_number || "Не указан"} · {d.commission_order_date || "Дата не указана"}</p><p>Председатель: {d.commission_chair || "Не указан"}</p><p>Члены комиссии: {(d.commission_members || []).join(", ") || "Не указаны"}</p></section>}
                    <MintrudParticipantCards protocol={d} permissions={permissions} compact={mode === "detail"} />
                  </div>
                  <div id={mode === "detail" ? "protocol-registry" : undefined} tabIndex={-1} className="scroll-mt-8">
                  {mode === "detail" && <p className="mt-4 text-sm">Минтруд: <a className="text-blue-700 underline" href="/admin/registries">перейти к Госреестрам</a>. XML ЕИСОТ и XLSX ФРДО оформляются в разделе Госреестров.</p>}
                  {reconciliationById[d.id] && (
                    <div data-testid="mintrud-protocol-reconciliation" className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-3 text-xs">
                      {reconciliationById[d.id].error ? (
                        <p role="alert" className="text-red-700">{reconciliationById[d.id].error}</p>
                      ) : (
                        <>
                          <p className="font-semibold text-slate-900">Предварительная сверка с Минтрудом — только чтение</p>
                          <p className="text-slate-700">{reconciliationById[d.id].report.protocol_status === "recorded"
                            ? "Источник — зафиксированный снимок результатов комиссии. Разрешено только отдельное подтверждённое заполнение пустых полей; утверждение и выгрузка не выполняются."
                            : "Протокол ещё черновой. Сведения сравниваются только для выявления расхождений; источник для синхронизации не подтверждён."}</p>
                          {editingId === d.id && <p className="text-amber-800">Несохранённые изменения редактора в сверку не входят.</p>}
                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="min-w-full text-left text-xs">
                              <thead className="bg-slate-100"><tr><th className="p-2">Слушатель</th><th className="p-2">Итог сверки</th><th className="p-2">Номер протокола</th><th className="p-2">Дата проверки</th><th className="p-2">Результат</th></tr></thead>
                              <tbody>{reconciliationById[d.id].report.members.map(person => (
                                <tr key={person.enrollment_id} className="border-t border-slate-100 align-top">
                                  <td className="p-2 font-medium">{person.learner_name}</td>
                                  <td className="p-2 text-amber-900">
                                    {comparisonLabels[person.verdict] || person.verdict}
                                    {person.history_reasons.length > 0 && <p className="mt-1 text-red-700">Есть история реестра: {person.history_reasons.join(", ")}</p>}
                                    {person.structural_issues.length > 0 && <p className="mt-1 text-red-700">Нарушены связи: {person.structural_issues.join(", ")}</p>}
                                  </td>
                                  {["protocol_number", "knowledge_check_date", "knowledge_check_result"].map(key => (
                                    <td key={key} className="p-2">
                                      <p className="text-slate-500">Из протокола: {fieldDisplay(person.fields[key].source)}</p>
                                      <p>В Минтруде: {fieldDisplay(person.fields[key].existing)}</p>
                                      {person.fields[key].verdict === "conflict" && <p className="font-semibold text-red-700">Расхождение</p>}
                                      {person.fields[key].verdict === "target_empty" && <p className="text-amber-700">Не заполнено</p>}
                                    </td>
                                  ))}
                                </tr>
                              ))}</tbody>
                            </table>
                          </div>
                          {reconciliationById[d.id].report.is_signed && permissions.includes("mintrud.write") && (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                              <p className="font-semibold text-slate-900">Заполнение пустых реквизитов Минтруда из зафиксированного протокола</p>
                              {syncOutcomeById[d.id]?.error && <p role="alert" className="text-red-700">{syncOutcomeById[d.id].error}</p>}
                              {syncOutcomeById[d.id]?.success && <p role="status" className="text-emerald-700">{syncOutcomeById[d.id].success}</p>}
                              {(syncOutcomeById[d.id]?.readiness || []).length > 0 && (
                                <div data-testid="mintrud-auto-readiness" className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                                  <p className="font-semibold">Автоматическая серверная проверка после синхронизации</p>
                                  {syncOutcomeById[d.id].readiness.map(item => {
                                    const person = reconciliationById[d.id]?.report?.members?.find(m => m.obligation_id === item.obligation_id);
                                    return (
                                      <div key={item.obligation_id} className="border-t border-slate-200 pt-2">
                                        <p className={item.is_ready ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
                                          {person?.learner_name || `Запись ${item.obligation_id}`} — {item.is_ready
                                            ? "готово к отдельному утверждению"
                                            : `требуются данные Минтруда (${item.issues.length})`}
                                        </p>
                                        {item.issues.length > 0 && (
                                          <ul className="ml-5 list-disc text-slate-700 space-y-1">
                                            {item.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}
                                          </ul>
                                        )}
                                      </div>
                                    );
                                  })}
                                  <p className="text-slate-600">Это проверка готовности, а не утверждение записи. Никакая XML-партия или отправка в ЕИСОТ не создавалась.</p>
                                </div>
                              )}
                              <p className="text-slate-600">Разрешено только для записей со статусом pending_data без утверждений, выгрузок и противоречий. Номер, дата и результат берутся из неизменяемого снимка протокола; другие поля не изменяются.</p>
                              {reconciliationById[d.id].report.members.map(person => (
                                <label key={person.obligation_id} className="flex items-start gap-2 py-1">
                                  <input type="checkbox" className="mt-0.5" disabled={!person.sync_allowed || person.sync_reason === "already_matching" || Boolean(syncingId)}
                                    checked={(syncSelectedById[d.id] || []).includes(person.obligation_id)}
                                    onChange={event => setSyncSelectedById(prev => ({...prev, [d.id]: event.target.checked
                                      ? [...(prev[d.id] || []), person.obligation_id]
                                      : (prev[d.id] || []).filter(x => x !== person.obligation_id)}))}/>
                                  <span>{person.learner_name} — {person.sync_allowed
                                    ? (person.sync_reason === "already_matching" ? "уже совпадает, запись не требуется" : "можно заполнить пустые реквизиты")
                                    : "заблокировано: " + person.sync_reason}</span>
                                </label>
                              ))}
                              <label className="flex items-start gap-2 border-t pt-2 font-medium text-slate-800">
                                <input type="checkbox" className="mt-0.5" checked={Boolean(syncConfirmedById[d.id])} disabled={Boolean(syncingId)}
                                  onChange={event => setSyncConfirmedById(prev => ({ ...prev, [d.id]: event.target.checked }))}/>
                                Я проверил выбранных участников и разрешаю записать только пустые реквизиты Минтруда. Это не утверждение записей и не выгрузка XML.
                              </label>
                              <button type="button" className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                disabled={!syncConfirmedById[d.id] || !(syncSelectedById[d.id] || []).length || Boolean(syncingId) || Boolean(recordingId) || Boolean(editingId)}
                                onClick={() => applySelectedRegistrySync(d.id)}>
                                {syncingId === d.id ? "Синхронизация…" : `Заполнить выбранные записи (${(syncSelectedById[d.id] || []).length})`}
                              </button>
                            </div>
                          )}
                          <p className="font-semibold text-slate-700">Сверка не меняет данные и не даёт разрешения на автоматическое утверждение, формирование XML или отправку в ЕИСОТ.</p>
                        </>
                      )}
                    </div>
                  )}
                  </div>
                  <div id={mode === "detail" ? "protocol-readiness" : undefined} tabIndex={-1} className="scroll-mt-8">
                  {mode === "detail" && <h2 className="mt-4 font-bold">Фиксация результатов</h2>}
                  {mode === "detail" && !readinessById[d.id] && <p className="text-sm">{d.status === "draft" ? "Выполните проверку перед фиксацией. Точные причины блокировки определяет сервер." : "Результаты уже зафиксированы; повторная фиксация недоступна."}</p>}
                  {readinessById[d.id] && (
                    <div data-testid="mintrud-protocol-readiness" role="status" className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      {readinessById[d.id].error ? (
                        <p className="text-red-700">{readinessById[d.id].error}</p>
                      ) : (
                        <>
                          <p className={readinessById[d.id].report.fieldsComplete ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
                            {readinessById[d.id].report.fieldsComplete
                              ? "Серверная проверка пройдена. Требуется явное подтверждение фактически проведённой комиссии."
                              : `Нужно заполнить или проверить: ${readinessById[d.id].report.issues.length} пункт(ов).`}
                          </p>
                          {readinessById[d.id].preliminaryMismatch && <p className="font-medium text-amber-800">Серверная проверка отличается от предварительной проверки браузера. Решение о фиксации принимает только сервер.</p>}
                          {editingId === d.id && <p className="text-amber-800">Несохранённые изменения редактора в проверку не входят. Сначала сохраните проект и проверьте его повторно.</p>}
                          {readinessById[d.id].report.issues.length > 0 && (
                            <ul className="list-disc space-y-1 pl-5">
                              {readinessById[d.id].report.issues.map(issue => (
                                <li key={issue.code} className="text-slate-800"><span>{issue.message}</span>
                                  {canWrite && d.status === "draft" && /^(protocol_number|protocol_date|protocol_future|order_number|order_date|order_date_after|chair|commission_size|result:|date:|later_than_protocol:|future_check:|check_before_completion:)/.test(issue.code) && <button type="button" className="ml-2 underline" onClick={() => {
                                    if (editingId !== d.id) beginEdit(d);
                                    requestAnimationFrame(() => document.getElementById("protocol-editor")?.scrollIntoView({ block: "start" }));
                                  }}>Исправить в редакторе</button>}
                                  {/^(position:|workplace:|scenario:)/.test(issue.code) && <a className="ml-2 underline" href={`/admin/registries?registry=mintrud&mintrudView=protocols&protocolId=${encodeURIComponent(d.id)}#participant=${encodeURIComponent(d.id)}:${encodeURIComponent(issue.code.split(":")[1])}`} >Открыть данные Минтруда</a>}
                                </li>
                              ))}
                            </ul>
                          )}
                          {readinessById[d.id].report.advisories.map(note => (
                            <p key={note} className="text-slate-600">{note}</p>
                          ))}
                          {canWrite && readinessById[d.id].report.fieldsComplete && d.status === "draft" && (
                            <div className="space-y-2 border-t border-slate-200 pt-3">
                              <label className="flex items-start gap-2 text-xs font-medium text-slate-800">
                                <input type="checkbox" checked={Boolean(confirmRecordingById[d.id])} onChange={event => setConfirmRecordingById(prev => ({ ...prev, [d.id]: event.target.checked }))}/>
                                Я подтверждаю, что комиссия фактически провела проверку, а указанные результаты и даты соответствуют реальным документам. Это НЕ подписание и НЕ отправка в Минтруд.
                              </label>
                              <button type="button" className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                disabled={!confirmRecordingById[d.id] || Boolean(recordingId) || Boolean(editingId)}
                                onClick={() => recordSavedDraft(d)}>
                                {recordingId === d.id ? "Фиксация…" : "Зафиксировать фактические результаты комиссии"}
                              </button>
                            </div>
                          )}
                          <p className="font-medium text-slate-700">Проверка и фиксация не разрешают XML, не подписывают протокол и не вносят данные в реестр Минтруда.</p>
                        </>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              ))}
              {canWrite && editingDraft && edit && (
                <div id={mode === "detail" ? "protocol-editor" : undefined} tabIndex={-1} data-testid="mintrud-protocol-draft-editor" className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Редактирование проекта № {editingDraft.protocol_number}</h3>
                    <p className="mt-1 text-xs text-amber-800">Все сведения ниже остаются черновыми. Ввод результата не подтверждает решение комиссии, не подписывает протокол и не передаёт данные в Минтруд.</p>
                    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
                    {notice && <p role="status" className="mt-2 text-sm text-emerald-800">{notice}</p>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="grid gap-1 text-xs font-semibold">Номер<input className={ctl} maxLength={128} value={edit.protocolNumber} onChange={e => setEditField("protocolNumber", e.target.value)} /></label>
                    <label className="grid gap-1 text-xs font-semibold">Дата протокола<input className={ctl} type="date" value={edit.protocolDate} onChange={e => setEditField("protocolDate", e.target.value)} /></label>
                    <label className="grid gap-1 text-xs font-semibold">Председатель<input className={ctl} maxLength={255} value={edit.chair} onChange={e => setEditField("chair", e.target.value)} /></label>
                    <label className="grid gap-1 text-xs font-semibold">Приказ о комиссии — номер<input className={ctl} maxLength={128} value={edit.orderNumber} onChange={e => setEditField("orderNumber", e.target.value)} /></label>
                    <label className="grid gap-1 text-xs font-semibold">Приказ о комиссии — дата<input className={ctl} type="date" value={edit.orderDate} onChange={e => setEditField("orderDate", e.target.value)} /></label>
                    <label className="grid gap-1 text-xs font-semibold">Члены комиссии (по одному в строке)<textarea className={ctl} rows={3} value={edit.membersText} onChange={e => setEditField("membersText", e.target.value)} /></label>
                  </div>
                  <label className="grid gap-1 text-xs font-semibold">Примечание<textarea className={ctl} rows={2} maxLength={2000} value={edit.notes} onChange={e => setEditField("notes", e.target.value)} /></label>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-800">Состав проекта — выбрано {edit.selected.length}</p>
                    <div className="max-h-48 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
                      {editorPeople.map(person => (
                        <label key={person.enrollment_id} className="flex items-start gap-2 py-1 text-sm">
                          <input type="checkbox" className="mt-1" checked={edit.selected.includes(person.enrollment_id)} onChange={e => setEditMember(person.enrollment_id, e.target.checked)} />
                          <span>{person.learner_name || "Слушатель"}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-50"><tr><th className="p-2">Участник</th><th className="p-2">Результат (ввод вручную, не подтверждён)</th><th className="p-2">Фактическая дата проверки</th></tr></thead>
                      <tbody>
                        {edit.selected.map(id => {
                          const person = editorPeople.find(p => p.enrollment_id === id);
                          const r = edit.results[id] || { result: "", date: "" };
                          return (
                            <tr key={id} className="border-t border-slate-100">
                              <td className="p-2">{person?.learner_name || "Слушатель"}</td>
                              <td className="p-2">
                                <select className={ctl} value={r.result} onChange={e => setManualResult(id, "result", e.target.value)}>
                                  <option value="">Не указан</option>
                                  <option value="satisfactory">Удовлетворительно</option>
                                  <option value="unsatisfactory">Неудовлетворительно</option>
                                </select>
                              </td>
                              <td className="p-2"><input className={ctl} type="date" value={r.date} onChange={e => setManualResult(id, "date", e.target.value)} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" disabled={editingSaving || !edit.selected.length} onClick={saveEdit} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{editingSaving ? "Сохранение…" : "Сохранить изменения проекта"}</button>
                    <button type="button" className={ctl} onClick={() => beginEdit(editingDraft)} disabled={editingSaving}>Отменить несохранённые изменения</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
