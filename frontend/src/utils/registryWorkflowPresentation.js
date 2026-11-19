// Presentation only. Every mutation still requires its existing server guard.
export const registryStatuses = {
  not_required: ['Передача не требуется', 'Для записи сохранено состояние «Передача не требуется».'],
  pending_data: ['Требуется проверка данных', 'Готовность ещё не подтверждена по текущим сведениям.'],
  ready: ['Данные проверены', 'Перед утверждением сервер повторно проверит актуальные сведения.'],
  needs_approval: ['Ожидает утверждения', 'Требуется проверка и подтверждение сведений.'],
  approved: ['Утверждено для выгрузки', 'Включение в партию зависит от актуальности снимка и применимости.'],
  exported: ['Файл подготовлен', 'Формирование файла не означает отправку или принятие реестром.'],
  submitted: ['Отправлено во внешний реестр', 'Отправка отмечена сотрудником. Результат ещё нужно сверить.'],
  accepted: ['Принято реестром', 'Результат обработки зафиксирован. История доступна в подробностях.'],
  rejected: ['Отклонено реестром', 'Откройте замечания и проверьте допустимый порядок исправления.'],
  correction_required: ['Требуется исправление', 'Уточните замечания внешнего реестра перед исправлением.'],
};
export const taskGroups = {
  check: 'Требуют проверки данных', approval: 'Ожидают утверждения', export: 'Утверждены — проверить перед выгрузкой',
  send: 'Файл подготовлен — отправка не подтверждена', result: 'Ожидают результатов', fix: 'Требуют исправления', done: 'Завершённые и прочие',
};
export function registryWorkflow(row = {}, { registry = row.registry, scope = 'work', write, protocol } = {}) {
  const known = registryStatuses[row.status];
  const [title, description] = known || ['Состояние требует проверки', 'Недостаточно сведений для определения следующего действия.'];
  const issues = (Array.isArray(row.readiness_errors) ? row.readiness_errors : []).map(x => typeof x === 'string' ? x : x.message || x.code || 'Есть замечание готовности');
  const group = ({pending_data:'check',ready:'approval',needs_approval:'approval',approved:'export',exported:'send',submitted:'result',rejected:'fix',correction_required:'fix'})[row.status] || 'done';
  const readOnly = write === false || (registry === 'frdo' && scope !== 'work');
  let action = 'details', label = 'Открыть подробности', reason = '';
  if (readOnly) reason = write === false ? 'Нет подтверждённого права записи. Доступен просмотр.' : 'В этой выборке доступен только просмотр.';
  else if (!known) reason = description;
  else if (registry === 'frdo' && !['required'].includes(row.applicability_decision)) {
    reason = row.applicability_decision === 'not_required' ? 'Передача не требуется по сохранённому решению.' : 'Применимость не подтверждена в данных записи. Решение проверяет сервер.';
    // Work is a server projection of required decisions; it is NOT a grant.
    if (scope === 'work' && ['pending_data','ready','needs_approval'].includes(row.status)) { action='validate'; label='Проверить готовность'; }
  } else if (issues.length && ['pending_data','ready','needs_approval','approved'].includes(row.status)) {
    const target = readinessTarget(row, registry);
    action = target.action; label = target.label;
    reason = target.reason || '';
  }
  else if (registry === 'mintrud' && !protocol && ['ready','needs_approval'].includes(row.status)) { action='validate'; label='Проверить готовность'; reason='Состояние протокола не загружено. Проверьте связанные протоколы и актуальную готовность на сервере.'; }
  else if (protocol && (!protocol.is_signed || protocol.status !== 'recorded') && ['ready','needs_approval'].includes(row.status)) reason='Проверьте фактическое состояние и подписание протокола комиссии.';
  else if (row.status === 'pending_data') { action='validate'; label='Проверить готовность'; }
  else if (['ready','needs_approval'].includes(row.status)) {
    // Undefined permission is not an authorization grant.
    action=write === true ? 'approve' : 'validate'; label=write === true ? 'Проверить и утвердить' : 'Проверить готовность';
    if (write !== true) reason='API не сообщает собственное право утверждения для этого реестра. Доступность операции проверяется сервером.';
  } else if (row.status === 'approved') {
    if (registry === 'frdo' && row.regulatory_program_type !== 'vocational_training') reason='Для этой программы форма партии ФРДО не подтверждена.';
    else { action='batch'; label='Перейти к формированию партии'; }
  }
  else if (['exported','submitted'].includes(row.status)) { action='details'; label='Посмотреть историю записи'; reason='Связь с доступной партией не подтверждена.'; }
  else if (['rejected','correction_required'].includes(row.status)) { action='history'; label='Посмотреть замечания'; }
  return {title,description,group,action,label,reason,issues,readOnly};
}
export function sampleSummary(rows, options) {
  const counts=Object.fromEntries(Object.keys(taskGroups).map(key=>[key,0]));
  for(const row of rows) counts[registryWorkflow(row,options).group]++;
  return counts;
}

// Only known issue codes select an editor. Unknown causes stay in details.
export function readinessTarget(row, registry = row.registry) {
  const codes = (row.readiness_errors || []).map(x => typeof x === 'string' ? x : x.code || '');
  if (registry === 'mintrud' && codes.some(x => /^mintrud\.(protocol_number|knowledge_check_)/.test(x)))
    return {action:'protocol', label:'Открыть протокол комиссии'};
  if (row.user_id && codes.some(x => x.startsWith('learner_profile.')))
    return {action:'profile', label:'Заполнить профиль слушателя'};
  if (registry === 'mintrud' && codes.some(x => /^mintrud\.(employer_|profession_or_position|reporting_scenario|context_missing)/.test(x)))
    return {action:'context', label:codes.some(x => x.startsWith('mintrud.employer_')) ? 'Заполнить работодателя' : 'Заполнить данные Минтруда'};
  if (registry === 'frdo' && row.regulatory_program_type === 'vocational_training' && codes.some(x => x.startsWith('frdo.')))
    return {action:'context', label:'Заполнить данные ФРДО'};
  return {action:'details', label:'Посмотреть замечания', reason:'Нужна проверка источника данных.'};
}
export function registryDocumentLabel(row) {
  return ({certificate:'Свидетельство', diploma:'Диплом', удостоверение:'Удостоверение', protocol:'Протокол'})[row.document_type] || (row.document_number || row.document_id ? 'Документ об обучении' : 'Документ не указан');
}
