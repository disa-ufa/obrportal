import { useEffect, useRef, useState } from "react";
import { confirmAdminMintrudSignature, getAdminMintrudProtocol, uploadAdminMintrudScan, downloadAdminMintrudScan, getAdminMintrudProtocolRegistryReconciliation, captureAuthSession, isCurrentAuthSession } from "../../api/client";
import { signaturePayload, confirmAndRead, uploadAndRead, validateScan, syncReasons, pendingScanAttempt, beginScanAttempt, clearScanAttempt, withScanAttemptLock, scanBlockReason } from "../../lib/mintrudSignature";
const ctl = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50";
const api = { confirm: confirmAdminMintrudSignature, read: getAdminMintrudProtocol };
const results = { satisfactory: "Удовлетворительно", unsatisfactory: "Неудовлетворительно" };
export function SignatureSyncSummary({ receipt, comparison }) {
  return <section className="mt-3 rounded-xl bg-slate-50 p-3 text-sm" aria-label="Перенос реквизитов Минтруда">
    <h4 className="font-bold">Перенос реквизитов Минтруда</h4>
    <p>Номер протокола · дата проверки знаний · результат проверки знаний</p>
    {receipt ? <><p>Заполнено: {receipt.changed_obligation_ids?.length || 0}. Уже совпадали: {receipt.unchanged_obligation_ids?.length ?? "нет отдельного отчёта"}.</p>
      {(receipt.blocked_obligations || []).map((item, i) => <p key={i} className="text-amber-900">{syncReasons[item.reason] || "Требуется ручная сверка"}</p>)}
      {!["UPDATED", "ALREADY_MATCHING_NO_WRITES", "REPLAY_NO_WRITES"].includes(receipt.status) && <p className="text-amber-900">Автоматический перенос требует повторной проверки. Подписание сохраняется независимо от переноса.</p>}
      {receipt.replayed && <p>Показан результат прежней операции; текущие данные проверяются отдельно.</p>}</> : <p>Результат автоматического переноса не подтверждён. Проверьте актуальную сверку.</p>}
    {comparison?.members?.map(m => <p key={m.enrollment_id}>{m.learner_name || "Участник"}: {m.sync_reason === "already_matching" ? "текущие реквизиты совпадают" : syncReasons[m.sync_reason] || ({ matches: "реквизиты совпадают", manual_conflict: "конфликт реквизитов", protected_history: "защищённая история", missing_target_fields: "есть незаполненные поля" }[m.verdict]) || "необходима сверка"}</p>)}
    <p className="mt-2 text-xs">Часть записей может требовать ручной проверки. Утверждение реестра и экспорт выполняются отдельно.</p>
  </section>;
}
export function MintrudSignaturePanel({ protocol, permissions = [], onChanged, transport = api, canWriteNow = () => false }) {
  return <SignaturePanelForProtocol key={protocol.id} {...{ protocol, permissions, onChanged, transport, canWriteNow }} />;
}
function SignaturePanelForProtocol({ protocol, permissions, onChanged, transport, canWriteNow }) {
  const [current, setCurrent] = useState(protocol), [open, setOpen] = useState(false);
  const [date, setDate] = useState(""), [checked, setChecked] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""), [problem, setProblem] = useState(false), [comparison, setComparison] = useState(null);
  const [conflict, setConflict] = useState(false), [unread, setUnread] = useState(false), [uploadBlocked, setUploadBlocked] = useState(() => pendingScanAttempt(protocol.id));
  const [selectedFile, setSelectedFile] = useState(null), [scanState, setScanState] = useState("idle");
  const [scanError, setScanError] = useState("");
  const fileInput = useRef(null), sessionOwner = useRef(captureAuthSession());
  const liveAccess = useRef(canWriteNow); liveAccess.current = canWriteNow;
  const pending = useRef(null), lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const owns = owner => alive.current && isCurrentAuthSession(owner);
  const read = permissions.includes("mintrud.read"), write = read && permissions.includes("mintrud.write");
  const key = `obrportal_signature_attempt_v1:${protocol.id}`;
  useEffect(() => {
    const sync = () => setUploadBlocked(pendingScanAttempt(protocol.id));
    window.addEventListener("storage", sync); window.addEventListener("focus", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", sync); };
  }, [protocol.id]);
  function blockReason() {
    return scanBlockReason({ sessionCurrent: isCurrentAuthSession(sessionOwner.current), write,
      authorized: liveAccess.current(), signed: current.is_signed, available: current.signed_scan_available,
      busy: lock.current || busy, pending: uploadBlocked || pendingScanAttempt(current.id), unread });
  }
  const blockedReason = blockReason();
  useEffect(() => { setCurrent(protocol); }, [protocol]);
  useEffect(() => {
    try { const value = JSON.parse(sessionStorage.getItem(key)); if (value?.confirmation_id && value.expected_updated_at && value.signed_on) { pending.current = value; setDate(value.signed_on); } } catch { /* Memory-only retry remains available. */ }
  }, [key]);
  function update(p) { setCurrent(p); onChanged?.(p); }
  async function compare(owner) {
    if (!owns(owner)) return;
    try { const result = await getAdminMintrudProtocolRegistryReconciliation(current.id); if (owns(owner)) setComparison(result); }
    catch { if (owns(owner)) { setMessage("Не удалось перечитать сверку. Результат переноса требует проверки."); setProblem(true); } }
  }
  async function submit(event) {
    event.preventDefault(); if (lock.current || !canWriteNow() || !write || current.status !== "recorded" || current.is_signed || !checked || !date || unread || conflict) return;
    lock.current = true; setBusy(true); setProblem(false);
    const owner = captureAuthSession();
    try {
      const payload = pending.current || signaturePayload(current, date, crypto.randomUUID()); pending.current = payload;
      try { sessionStorage.setItem(key, JSON.stringify(payload)); } catch { /* Keep the same in-memory attempt. */ }
      const outcome = await confirmAndRead(transport, current.id, payload);
      if (!owns(owner)) return;
      if (!outcome.protocol) { setUnread(true); setMessage("Ответ неизвестен. Сначала проверьте состояние протокола."); setProblem(true); return; }
      update(outcome.protocol); setUnread(false);
      if (outcome.protocol.is_signed) { setOpen(false); setMessage(outcome.uncertain ? "Подписание подтверждено повторным чтением. Проверьте перенос реквизитов." : "Подписание бумажного оригинала подтверждено."); await compare(owner); }
      else { setConflict(Boolean(outcome.conflict || (outcome.status && outcome.status < 500))); setProblem(true); setMessage(outcome.conflict ? "Запись изменена. Проверьте обновлённые сведения перед новой операцией." : "Подписание не подтверждено. Состояние перечитано; повтор использует прежний номер операции."); }
    } finally { lock.current = false; setBusy(false); }
  }
  async function refresh() {
    if (lock.current || !read) return; lock.current = true; setBusy(true);
    const owner = captureAuthSession();
    try { const p = await transport.read(current.id); if (!owns(owner)) return; update(p); setUnread(false); if (p.signed_scan_available && clearScanAttempt(current.id)) { setUploadBlocked(false); cancelSelection(); setScanState("success"); } if (p.is_signed) await compare(owner); if (!owns(owner)) return; setMessage(uploadBlocked && !p.signed_scan_available ? "Состояние получено. Сохранение скана остаётся неопределённым; повторная загрузка требует проверки хранилища." : "Актуальное состояние получено."); setProblem(uploadBlocked && !p.signed_scan_available); }
    catch { if (owns(owner)) { setUnread(true); setProblem(true); setMessage("Состояние недоступно. Повтор подписи заблокирован до успешного чтения."); } }
    finally { lock.current = false; setBusy(false); }
  }
  function selectFile(event) {
    const file = event.target.files?.[0];
    // Cancelling the native chooser preserves the previous explicit selection.
    if (!file) return;
    setSelectedFile(file); setScanState("validating"); setScanError("");
    const error = validateScan(file);
    setScanError(error); setScanState(error ? "rejected" : "selected");
  }
  function cancelSelection() {
    setSelectedFile(null); setScanError(""); setScanState("idle");
    if (fileInput.current) fileInput.current.value = "";
  }
  async function upload() {
    const reason = blockReason();
    if (reason) { setScanError(reason); return; }
    const error = validateScan(selectedFile);
    if (error) { setScanError(error); setScanState("rejected"); return; }
    lock.current = true; setBusy(true); setScanError(""); setScanState("validating");
    const owner = captureAuthSession();
    try {
      const result = await withScanAttemptLock(current.id, async () => {
        if (!owns(owner) || !liveAccess.current()) return { stale: true };
        // Never clear a previous marker on mount, selection, cancellation or a
        // negative GET. Recovery artifacts can exist without public metadata.
        if (!beginScanAttempt(current.id)) return { occupied: true };
        setUploadBlocked(true); setScanState("uploading");
        const outcome = await uploadAndRead({ upload: uploadAdminMintrudScan, read: transport.read }, current.id, selectedFile,
          () => owns(owner) && liveAccess.current(), phase => { if (owns(owner)) setScanState(phase); });
        if (outcome.stale) return outcome;
        const mayClear = outcome.rejected || outcome.protocol?.signed_scan_available;
        const cleared = mayClear ? clearScanAttempt(current.id) : false;
        setUploadBlocked(!cleared); setUnread(!outcome.protocol);
        if (outcome.protocol) update(outcome.protocol);
        if (outcome.protocol?.signed_scan_available) {
          cancelSelection(); setScanState("success"); setProblem(false);
          setMessage("Скан прикреплён; состояние подтверждено сервером.");
        } else if (outcome.rejected) {
          setScanState("rejected");
          setScanError(outcome.error.status === 413 ? "Файл слишком большой. Выберите файл до 10 MiB."
            : outcome.error.status === 415 ? "Формат файла отклонён сервером до сохранения. Выберите PDF, JPG или PNG."
            : "Содержимое файла отклонено сервером до сохранения. Выберите корректный файл.");
        } else {
          setScanState("uncertain");
          setScanError(outcome.error?.status === 409 ? "Конфликт загрузки: скан или восстановительные артефакты уже существуют. Перезапись запрещена."
            : "Загрузка не подтверждена. Нужна проверка хранения; повторная загрузка заблокирована.");
        }
        return outcome;
      });
      if (alive.current && (result?.stale || result?.occupied || result?.unavailable)) {
        setUploadBlocked(pendingScanAttempt(current.id)); setScanState("uncertain");
        setScanError(result.stale ? "Авторизация изменилась или права ещё проверяются. Результат загрузки не подтверждён."
          : result.unavailable ? "Браузер не поддерживает безопасную блокировку загрузки между вкладками. Отправка запрещена."
          : "Другая вкладка загружает скан либо предыдущая попытка не подтверждена. Повтор запрещён.");
      }
    } catch {
      if (alive.current) { setUploadBlocked(pendingScanAttempt(current.id)); setScanState("uncertain"); setScanError("Не удалось подтвердить результат операции. Проверьте состояние; повторная загрузка запрещена при незавершённой попытке."); }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function download() {
    if (lock.current || !read) return; lock.current = true; setBusy(true);
    try { await downloadAdminMintrudScan(current.id); } catch { setProblem(true); setMessage("Не удалось скачать скан. Проверьте доступ и хранилище."); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!read) return <p className="mt-2 text-xs">Доступ к подписанию и сканам не подтверждён.</p>;
  return <section aria-label="Подписание бумажного протокола" aria-busy={busy} className="mt-3 rounded-xl border border-blue-200 p-3">
    <p className="font-semibold">{current.is_signed ? `Бумажный оригинал подписан: ${current.signed_on}` : current.status === "recorded" ? "Результаты зафиксированы. Подписание ещё не подтверждено." : "Сначала зафиксируйте результаты комиссии."}</p>
    {message && <p role={problem ? "alert" : "status"} className="my-2 text-sm">{message}</p>}
    {uploadBlocked && !current.signed_scan_available && !message && <p role="status" className="my-2 text-sm">Предыдущая загрузка не подтверждена. Проверьте состояние протокола; отсутствие скана в записи само по себе не разрешает повторную загрузку.</p>}
    <div className="mt-2 flex flex-wrap gap-2">
      {write && current.status === "recorded" && !current.is_signed && <button className={ctl} disabled={busy || unread} onClick={() => setOpen(v => !v)} type="button">Подтвердить подписание</button>}
      <button className={ctl} disabled={busy} type="button" onClick={refresh}>Проверить состояние протокола</button>
    </div>
    {open && !current.is_signed && <form onSubmit={submit} className="mt-3 space-y-3">
      <p>Протокол № {current.protocol_number} от {current.protocol_date}</p>
      <p>Председатель: {current.commission_chair || "Не указан"}. Комиссия: {(current.commission_members || []).join(", ") || "Не указана"}</p>
      <ul>{(current.participants || []).map(p => <li key={p.enrollment_id}>{p.learner_name}: {p.knowledge_check_date || "Дата не указана"} — {results[p.knowledge_check_result] || "Результат не указан"}</li>)}</ul>
      <label className="grid gap-1">Дата подписания<input required type="date" className={ctl} value={date} disabled={busy || Boolean(pending.current)} onChange={e => setDate(e.target.value)} /></label>
      <label className="flex items-start gap-2"><input type="checkbox" checked={checked} disabled={busy} onChange={e => setChecked(e.target.checked)} />Подтверждаю фактическое подписание бумажного оригинала. Это подтверждение не создаёт электронную подпись. Скан необязателен.</label>
      <button className={ctl} disabled={busy || !checked || !date || unread || conflict} type="submit">{busy ? "Сохранение…" : "Подтвердить бумажный оригинал"}</button>
      {conflict && <button className={ctl} type="button" disabled={busy || unread} onClick={() => { pending.current = null; sessionStorage.removeItem(key); setConflict(false); setChecked(false); setDate(""); }}>Начать новую операцию с актуальными сведениями</button>}
    </form>}
    {current.is_signed && <>
      <SignatureSyncSummary receipt={current.auto_sync} comparison={comparison} />
      <p className="mt-3 text-sm">{current.signed_scan_available ? `Скан прикреплён · ${current.signed_scan_size} байт · ${current.signed_scan_uploaded_at || "Дата недоступна"}` : "Скан не прикреплён — подписание действительно без скана."}</p>
      {current.signed_scan_available && <button className={ctl} disabled={busy} type="button" onClick={download}>Скачать скан</button>}
    </>}
    <section className="mt-3 space-y-2 text-sm" aria-label="Скан подписанного оригинала" data-scan-state={scanState}>
      <h4 className="font-semibold">Скан подписанного оригинала</h4>
      {blockedReason && <p role="status">{blockedReason}</p>}
      {!current.signed_scan_available && <>
        <p>Выбор файла не запускает загрузку. PDF, JPG, PNG до 10 MiB. Сервер дополнительно проверяет содержимое.</p>
        <label className="grid gap-1">Выбрать файл<input ref={fileInput} aria-label="Выбрать скан" type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy || Boolean(blockedReason)} onChange={selectFile} /></label>
        {selectedFile && <p data-testid="scan-selection">{selectedFile.name} · {selectedFile.size} байт · {selectedFile.type || "Тип не указан"}</p>}
        <div className="flex gap-2"><button className={ctl} type="button" disabled={Boolean(blockedReason) || !selectedFile || Boolean(validateScan(selectedFile))} onClick={upload}>Прикрепить скан</button>
          {selectedFile && <button className={ctl} type="button" disabled={busy} onClick={cancelSelection}>Отменить выбор</button>}</div>
      </>}
      <p role="status">{({ idle: "Файл не выбран", selected: "Файл выбран. Для отправки нажмите «Прикрепить скан».", validating: "Проверка файла и доступа…", uploading: "Загрузка скана…", verifying: "Проверка сохранения на сервере…", success: "Скан прикреплён", rejected: "Файл отклонён", uncertain: "Результат загрузки не подтверждён" })[scanState]}</p>
      {scanError && <p role="alert">{scanError}</p>}
    </section>
  </section>;
}
