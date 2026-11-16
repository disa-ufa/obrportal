import { useState } from 'react';
import { registryWorkflow, sampleSummary, taskGroups } from '../../../utils/registryWorkflowPresentation';
const button='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-blue-600 disabled:opacity-50';
export function RegistryNavigation({view,registry,onNavigate}) {
  return <nav aria-label="Разделы Госреестров" className="my-3 flex flex-wrap gap-2">{[['overview','Обзор'],['frdo','ФРДО'],['mintrud','Минтруд'],['batches','Партии']].map(([key,label])=><button type="button" key={key} className={`${button} aria-[current=page]:bg-blue-50 aria-[current=page]:border-blue-700 ${(key===view || key===registry && view==='work') ? 'border-blue-700 bg-blue-50 text-blue-900' : ''}`} aria-current={(key===view || key===registry && view==='work')?'page':undefined} onClick={()=>onNavigate(key)}>{label}</button>)}</nav>;
}
export function RegistryOverview({rows,registry,scope='work',filters='',loading,error,onGroup}) {
  const counts=sampleSummary(rows,{registry,scope});
  const name=registry==='frdo'?'ФРДО':'Минтруд';
  const scopeName=scope==='review'?'определение необходимости передачи':scope==='history'?'передача не требуется':'в работе';
  return <section aria-label="Рабочая сводка" className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
    <h2 className="text-lg font-bold">Обзор · {name}</h2>
    <p className="text-sm text-slate-600">Только {name}{registry==='frdo'?` · ${scopeName}`:''}. По загруженным записям, до 100 за запрос.{filters ? ` Отбор: ${filters}.` : ' Все курсы, без поиска и отбора по состоянию.'} Другой реестр не подсчитан.</p>
    {loading?<p role="status">Загрузка сводки…</p>:error?<p role="alert">Сводка недоступна. Откройте реестр и повторите загрузку.</p>:rows.length===0?<p role="status">В выбранной выборке {name} записи не получены. Это не общий итог по реестрам. Проверьте отбор или выберите другой реестр.</p>:<><p className="font-semibold">В выборке: {rows.length} записей</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(taskGroups).filter(([key])=>counts[key]>0).map(([key,label])=><button type="button" className={`${button} text-left`} key={key} onClick={()=>onGroup(key)}>{label}<strong className="ml-3 text-xl">{counts[key]}</strong></button>)}</div></>}
  </section>;
}
export function RegistryNextAction({row,options,onAction,busy}) {
  const view=registryWorkflow(row,options);
  return <div data-testid="registry-next-action"><button type="button" className={button} title={view.reason || undefined} disabled={busy} onClick={()=>onAction(view.action)}>{view.label}</button>{view.readOnly && <p className="mt-1 text-xs text-slate-500">Только просмотр</p>}</div>;
}
export function RegistryDetails({children,id,title='Подробности и другие действия'}) {
  const [open,setOpen]=useState(false);
  return <details id={id} onToggle={event=>setOpen(event.currentTarget.open)} className="mt-3"><summary className="cursor-pointer rounded-lg py-2 font-semibold focus-visible:outline-blue-600">{title}</summary>{open&&children}</details>;
}
export function RegistryEmptyState({error,filtered,scope}) {
  return <p role="status">{error?'Список недоступен из-за ошибки загрузки. Проверьте доступ и обновите данные.':filtered?'В текущей загруженной выборке нет записей по выбранным фильтрам. Сбросьте отбор или выберите другой курс.':scope==='review'?'В загруженной выборке нет записей для определения необходимости передачи.':scope==='history'?'В загруженной выборке нет сохранённых решений «Передача не требуется».':'В этой выборке записи не получены. Проверьте курс, необходимость передачи и фильтры. Это не подтверждает отсутствие записей во всём реестре.'}</p>;
}
