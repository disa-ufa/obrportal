import { useEffect, useState } from "react";
import { getAdminCourses, getAdminMintrudProtocol, listAdminMintrudProtocolDrafts } from "../api/client";
import { useMintrudPermissions } from "../hooks/useMintrudPermissions";
import { MintrudProtocolDraftsPanel } from "../components/admin/MintrudProtocolDraftsPanel";
import { buildAdminKnowledgeProtocolPath, getAdminKnowledgeProtocolRouteParams } from "../utils/adminRoutes";
import { protocolDateLabel, protocolMatches, protocolPresentation } from "../utils/knowledgeProtocolPresentation";

const root = "/admin/knowledge-protocols";
const control = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
function coursesFrom(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["items", "courses", "results", "data"]) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

export function AdminKnowledgeProtocolsPage({ pathname }) {
  const { permissions, sessionKey } = useMintrudPermissions();
  const route = getAdminKnowledgeProtocolRouteParams(pathname);
  if (!permissions.includes("mintrud.read")) return <p role="status">Доступ к протоколам не подтверждён.</p>;
  return <ProtocolWorkspace key={`${sessionKey}:${pathname}`} route={route} permissions={permissions} />;
}

function ProtocolWorkspace({ route, permissions }) {
  const [protocols, setProtocols] = useState([]), [protocol, setProtocol] = useState(null);
  const [courses, setCourses] = useState([]), [catalogError, setCatalogError] = useState(false);
  const [courseId, setCourseId] = useState(""), [query, setQuery] = useState(""), [state, setState] = useState("");
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  const mode = route?.mode || "list";
  const canWrite = permissions.includes("mintrud.write");
  useEffect(() => {
    let alive = true;
    setCatalogError(false);
    getAdminCourses().then(payload => { if (alive) setCourses(coursesFrom(payload)); }).catch(() => { if (alive) setCatalogError(true); });
    return () => { alive = false; };
  }, [revision]);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setProtocols([]); setProtocol(null);
    const request = mode === "detail" ? getAdminMintrudProtocol(route.id) : mode === "list" ? listAdminMintrudProtocolDrafts(courseId) : Promise.resolve(null);
    request.then(payload => {
      if (!alive) return;
      if (mode === "detail") setProtocol(payload);
      else if (mode === "list") {
        if (!Array.isArray(payload)) throw Error("Не удалось прочитать список протоколов.");
        setProtocols(payload);
      }
    }).catch(exc => { if (alive) setError(exc?.status === 404 ? "Протокол не найден. Возможно, ссылка устарела." : "Не удалось загрузить протоколы. Проверьте доступ и повторите загрузку."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [mode, route?.id, courseId, revision]);
  const courseTitle = id => courses.find(c => String(c.id ?? c.course_id) === String(id))?.title || courses.find(c => String(c.id ?? c.course_id) === String(id))?.name || `Курс ${id || "не указан"}`;
  return <div className="space-y-4" data-testid="knowledge-protocols-page">
    <nav className="flex flex-wrap gap-4 text-sm text-blue-800" aria-label="Навигация протоколов">
      {mode !== "list" && <a href={root}>← Все протоколы</a>}<a href="/admin/registries">Госреестры</a><a href="/mintrud/protocols">Прежний экран протоколов</a>
    </nav>
    {mode !== "detail" && <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{mode === "new" ? "Новый протокол" : "Протоколы проверки знаний"}</h1><p className="mt-1 text-sm text-slate-600">Состав · комиссия · результаты · фиксация · подписание · Минтруд</p></div>{mode === "list" && canWrite && <a className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white" href={`${root}/new`}>Новый протокол</a>}</div>}
    {catalogError && <p role="status" className="text-sm text-amber-800">Каталог курсов недоступен. Названия показаны по идентификаторам; обновите страницу для выбора курса.</p>}
    {mode !== "detail" && <div className="flex flex-wrap gap-3">
      <label className="grid gap-1 text-sm">Курс<select aria-label="Курс" className={control} value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">{mode === "new" ? "Выберите курс" : "Все курсы"}</option>{courses.map(c => <option key={c.id ?? c.course_id} value={c.id ?? c.course_id}>{c.title || c.name || c.id}</option>)}</select></label>
      {mode === "list" && <><label className="grid gap-1 text-sm">Поиск<input type="search" className={control} placeholder="Номер, курс или участник" value={query} onChange={e => setQuery(e.target.value)} /></label><label className="grid gap-1 text-sm">Состояние<select aria-label="Состояние" className={control} value={state} onChange={e => setState(e.target.value)}><option value="">Все состояния</option><option value="draft">Черновик</option><option value="recorded">Ожидает подписания</option><option value="signed">Подписан</option><option value="unknown">Требует проверки</option></select></label></>}
      <button type="button" disabled={loading} className={`${control} self-end`} onClick={() => setRevision(v => v + 1)}>Обновить</button>
    </div>}
    {loading && <p role="status">Загрузка протоколов…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" className={control} onClick={() => setRevision(v => v + 1)}>Повторить загрузку</button></div>}
    {!loading && !error && mode === "list" && <ProtocolList protocols={protocols} query={query} state={state} courseTitle={courseTitle} />}
    {!loading && !error && mode === "detail" && protocol && <><p className="text-sm text-slate-600">{courseTitle(protocol.course_id)}</p><MintrudProtocolDraftsPanel key={protocol.id} mode="detail" protocolId={protocol.id} courseId={protocol.course_id} /></>}
    {mode === "new" && (canWrite ? courseId ? <MintrudProtocolDraftsPanel key={courseId} mode="create" courseId={courseId} onCreated={p => window.location.assign(buildAdminKnowledgeProtocolPath(p.id))} /> : <p>Выберите курс, затем участников, номер и дату протокола.</p> : <p role="status">Создание недоступно: требуется право записи Минтруда.</p>)}
  </div>;
}

export function ProtocolList({ protocols, query = "", state = "", courseTitle = id => id }) {
  const visible = protocols.filter(p => protocolMatches(p, query, state, courseTitle(p.course_id)));
  return <section className="space-y-3" aria-label="Список протоколов">
    <p className="text-sm text-slate-600">Показано {visible.length} из {protocols.length} загруженных. Загружаются до 100 последних протоколов; поиск и состояние применяются к ним. Для более ранних документов выберите курс или используйте прямую ссылку.</p>
    {!visible.length ? <p role="status">{protocols.length ? "По заданным условиям протоколы не найдены." : "Сохранённых протоколов пока нет."}</p> : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Протоколы проверки знаний</caption><thead className="bg-slate-50"><tr>{["Номер", "Дата", "Курс", "Участники", "Состояние", "Скан", "Действие"].map(title => <th scope="col" className="p-3" key={title}>{title}</th>)}</tr></thead><tbody>{visible.map(p => {
      const view = protocolPresentation(p);
      return <tr key={p.id} className="border-t border-slate-200"><td className="p-3 font-semibold">№ {p.protocol_number}</td><td className="p-3 whitespace-nowrap">{protocolDateLabel(p.protocol_date)}</td><td className="p-3">{courseTitle(p.course_id)}</td><td className="p-3">{p.participant_count ?? p.participants?.length ?? 0}</td><td className="p-3">{view.label}</td><td className="p-3">{view.scan}</td><td className="p-3"><a className="font-semibold text-blue-700 underline" href={buildAdminKnowledgeProtocolPath(p.id)} aria-label={`Открыть протокол № ${p.protocol_number}`}>Открыть</a></td></tr>;
    })}</tbody></table></div>}
  </section>;
}
