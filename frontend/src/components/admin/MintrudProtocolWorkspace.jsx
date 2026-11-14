import { useEffect, useRef, useState } from 'react';
import { captureAuthSession, isCurrentAuthSession, getAdminMintrudProtocolCatalog, getAdminMintrudProtocolComposition, getAdminMintrudProtocolExportPreview } from '../../api/client';
import { CATEGORY_LABELS, isProtocolError, navigateProtocol, validateProtocolComposition } from '../../utils/mintrudProtocolPreview';
import { parseMintrudParticipantLink } from '../../lib/mintrudRegistryParticipantLink.js';
import { resolveMintrudWorkspaceParticipant } from '../../lib/mintrudProtocolWorkspaceDeepLink.js';
const ctl = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
const good = ['ready_for_approval', 'approved_current'];

export function MintrudProtocolWorkspace({ route, courses, onManage, renderEditor, formatIssue }) {
  const [catalog, setCatalog] = useState(null);
  const [detail, setDetail] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [editor, setEditor] = useState(null);
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  const active = useRef(null);
  const consumedParticipantLink = useRef('');
  const [query, setQuery] = useState(route.q);

  useEffect(() => {
    const ticket = ++sequence.current;
    const owner = captureAuthSession();
    const controller = new AbortController();
    active.current = controller;
    let expired = false;
    const current = () => sequence.current === ticket && isCurrentAuthSession(owner) && !controller.signal.aborted;
    setCatalog(null); setDetail(null); setPreview(null); setEditor(null); setError(''); setOnlyErrors(false); setBusy(true); setQuery(route.q);
    const timer = setTimeout(() => { expired = true; controller.abort(); if (sequence.current === ticket) { setBusy(false); setError('Время ожидания истекло. Повторите чтение.'); } }, 15000);
    const read = route.id ? getAdminMintrudProtocolComposition(route.id, { signal: controller.signal }) : getAdminMintrudProtocolCatalog({q: route.q, course_id: route.course, status: route.status, offset: route.offset, limit: 25}, {signal: controller.signal});
    read.then(data => {
      if (!current()) return;
      if (route.id) {
        const confirmed = validateProtocolComposition(data, route.id);
        setDetail(confirmed);

        let link = null;
        try {
          link = parseMintrudParticipantLink(window.location.hash);
        } catch {
          link = null;
        }

        if (
          link &&
          link.protocolId.toLowerCase() === String(route.id).toLowerCase()
        ) {
          const key = `${link.protocolId.toLowerCase()}:${link.enrollmentId.toLowerCase()}`;

          if (consumedParticipantLink.current !== key) {
            const member = resolveMintrudWorkspaceParticipant(
              route.id,
              window.location.hash,
              confirmed
            );

            if (member) {
              consumedParticipantLink.current = key;
              setEditor({ row: member, target: 'context' });
            } else {
              setError('????? ????????? ? ?????????? ?? ????????????. ?????????????? ???????? ?????????.');
            }
          }
        }
      }
      else if (Array.isArray(data?.items) && Number.isInteger(data.total) && data.total >= data.items.length && data.offset === route.offset) setCatalog(data);
      else throw new Error('Сервер не подтвердил границы списка.');
    }).catch(exc => { if (!expired && current()) setError(exc.message || 'Чтение недоступно.'); }).finally(() => { clearTimeout(timer); if (current()) setBusy(false); });
    const invalidate = () => { sequence.current++; controller.abort(); active.current?.abort(); setDetail(null); setPreview(null); setCatalog(null); setBusy(false); setError('Данные или сессия изменились. Обновите чтение.'); };
    const onInputsChange = () => { setPreview(null); setRevision(value => value + 1); };
    window.addEventListener('obrportal-auth-change', invalidate); window.addEventListener('storage', invalidate);
    window.addEventListener('obrportal-mintrud-inputs-change', onInputsChange);
    return () => { sequence.current++; controller.abort(); active.current?.abort(); clearTimeout(timer); window.removeEventListener('obrportal-auth-change', invalidate); window.removeEventListener('storage', invalidate); window.removeEventListener('obrportal-mintrud-inputs-change', onInputsChange); };
  }, [route.id, route.q, route.course, route.status, route.offset, revision]);

  // A result is a point-in-time diagnostic. Expire it and detect remote input changes.
  useEffect(() => {
    if (!preview) return;
    const owner = captureAuthSession();
    const controller = new AbortController();
    let stopped = false;
    const expire = setTimeout(() => { stopped = true; controller.abort(); setPreview(null); setError('Срок актуальности проверки истёк. Выполните новый GET.'); }, 60000);
    const poll = setInterval(async () => {
      try {
        const next = await getAdminMintrudProtocolComposition(route.id, {signal: controller.signal});
        if (stopped || !isCurrentAuthSession(owner)) return;
        validateProtocolComposition(next, route.id);
        if (next.input_revision !== preview.input_revision) { setPreview(null); setDetail(next); setError('Входные данные изменились. Повторите проверку.'); }
      } catch { if (!stopped) { setPreview(null); setError('Актуальность входных данных не подтверждена. Повторите чтение.'); } }
    }, 15000);
    return () => { stopped = true; controller.abort(); clearTimeout(expire); clearInterval(poll); };
  }, [preview, route.id]);

  const check = async () => {
    if (!detail || busy) return;
    const ticket = ++sequence.current, owner = captureAuthSession(), controller = new AbortController();
    active.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    setBusy(true); setPreview(null); setError(''); setEditor(null);
    try {
      const next = await getAdminMintrudProtocolExportPreview(route.id, {signal: controller.signal});
      if (sequence.current !== ticket || !isCurrentAuthSession(owner)) return;
      validateProtocolComposition(next, route.id, true); setDetail(next); setPreview(next);
    } catch (exc) { if (sequence.current === ticket && isCurrentAuthSession(owner)) setError(controller.signal.aborted ? 'Время ожидания истекло. Повторите проверку.' : exc.message || 'Проверка недоступна.'); }
    finally { clearTimeout(timer); if (sequence.current === ticket && isCurrentAuthSession(owner)) setBusy(false); }
  };
  const rows = (preview || detail)?.members || [];
  return <section className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200" data-testid="mintrud-protocol-workspace">
    <h2 className="text-xl font-bold">Минтруд · По протоколам</h2>
    <p>Полный сохранённый состав. Проверка ничего не утверждает, не синхронизирует и не отправляет. Решение комиссии не заменяется онлайн-тестом; recorded не является электронной подписью.</p>
    <button className={ctl} onClick={() => { setPreview(null); setRevision(value => value + 1); }}>Обновить чтение</button>
    {busy && <p role="status">Загрузка…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
    {!route.id && <>
      <form className="flex flex-wrap gap-2" onSubmit={event => {event.preventDefault(); navigateProtocol({q: query, offset: 0});}}>
        <label>Номер или программа <input className={ctl} value={query} onChange={event => setQuery(event.target.value)} maxLength={128}/></label>
        <label>Курс <select className={ctl} value={route.course} onChange={event => navigateProtocol({course: event.target.value, offset: 0})}><option value="">Все курсы</option>{courses.map(course => <option key={course.id} value={course.id}>{course.label}</option>)}</select></label>
        <label>Статус <select className={ctl} value={route.status} onChange={event => navigateProtocol({status: event.target.value, offset: 0})}><option value="">Все статусы</option><option value="draft">draft</option><option value="recorded">recorded</option></select></label><button className={ctl}>Найти</button>
      </form>
      {catalog && <><p>Всего по серверу: {catalog.total}. Показано {catalog.items.length}, начиная с {catalog.offset + 1}.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Номер', 'Дата', 'Программа', 'Участники', 'Статус', 'Проверка', 'История'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{catalog.items.map(protocol => <tr key={protocol.id}><td className="p-2"><button className="text-blue-700 underline" onClick={() => navigateProtocol({id: protocol.id})}>{protocol.protocol_number}</button></td><td>{protocol.protocol_date}</td><td>{protocol.course_title}</td><td>{protocol.participant_count}</td><td>{protocol.status}</td><td>Не проверено</td><td>{protocol.has_export_history ? 'Есть подтверждённая партия' : 'Связанные партии не обнаружены'}</td></tr>)}</tbody></table></div><button className={ctl} disabled={busy || route.offset === 0} onClick={() => navigateProtocol({offset: Math.max(0, route.offset - 25)})}>Назад по списку</button> <button className={ctl} disabled={busy || !catalog.has_more} onClick={() => navigateProtocol({offset: route.offset + 25})}>Далее по списку</button></>}
    </>}
    {route.id && <><button className={ctl} onClick={() => navigateProtocol({id: ''})}>К списку протоколов</button>{detail && <>
      <h3 className="text-lg font-bold">Протокол {detail.protocol.protocol_number} · {detail.protocol.protocol_date} · {detail.protocol.status}</h3><p>{detail.protocol.course_title} · Полный состав: {detail.participant_count}</p>
      <button className={ctl} onClick={() => onManage(detail.protocol)}>Проект, комиссия и защищённая синхронизация</button>{' '}<button className={ctl} disabled={busy} onClick={check}>Проверить всех участников</button>
      {preview ? <div data-testid="protocol-preview-summary"><p>Проверено: {new Date(preview.checked_at).toLocaleString('ru-RU')}. Диагностика действует до изменения данных, не более минуты.</p><p>Всего: {preview.summary.total} · Готовы к утверждению: {preview.summary.ready_for_approval} · Утверждены и актуальны: {preview.summary.approved_current} · Требуют исправления: {preview.summary.needs_data} · Заблокированы: {preview.summary.blocked} · Ранее выгружены: {preview.summary.already_exported}</p></div> : <p>Актуальная готовность не проверена.</p>}
      <label><input type="checkbox" checked={onlyErrors} disabled={!preview} onChange={event => setOnlyErrors(event.target.checked)}/> Только с ошибками</label>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Участник', 'Результат комиссии', 'Данные Минтруда', 'Готовность', 'История'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{rows.filter(row => !onlyErrors || !preview || isProtocolError(row)).map(row => <tr key={row.member_id} className="border-t border-slate-200 align-top"><td className="p-2"><span>{row.learner_name}</span><small className="block">Обучение: {row.enrollment_id}<br/>Обязательство: {row.obligation_id}</small><button className="text-blue-700 underline" disabled={!row.user_id} onClick={() => {setPreview(null);setEditor({row, target:'profile'});}}>Карточка слушателя</button></td><td>{row.knowledge_check_date || 'Нет даты'}<br/>{row.knowledge_check_result === 'satisfactory' ? 'Удовлетворительно' : row.knowledge_check_result === 'unsatisfactory' ? 'Неудовлетворительно' : 'Нет результата'}<br/>{detail.protocol.status === 'draft' && 'Решение ещё не зафиксировано'}</td><td>{row.mintrud_context?.profession_or_position || 'Должность не указана'}<br/>{row.mintrud_context?.employer_name || 'Работодатель не указан'}<br/><button className="text-blue-700 underline" onClick={() => {setPreview(null);setEditor({row,target:'context'});}}>Редактор данных Минтруда</button></td><td className={good.includes(row.category) ? 'text-green-800' : ''}>{preview ? CATEGORY_LABELS[row.category] : 'Не проверено'}{preview && row.issues.map((issue,index) => <p key={`${issue.code}-${index}`}>{formatIssue(issue)}{' '}<button className="text-blue-700 underline" onClick={() => {setPreview(null);setEditor({row,target:issue.target});}}>Открыть данные</button></p>)}</td><td>Попыток: {row.history?.attempt_count ?? '—'}<br/>Позиций партий: {row.history?.batch_item_count ?? '—'}<br/>{row.registry_status}</td></tr>)}</tbody></table></div>
      {editor && renderEditor(editor, () => {setEditor(null);setRevision(value => value + 1);})}
    </>}</>}
  </section>;
}
