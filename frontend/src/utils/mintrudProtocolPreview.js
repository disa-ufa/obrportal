export const PREVIEW_CATEGORIES = ['ready_for_approval', 'approved_current', 'needs_data', 'applicability_review', 'conflict', 'already_exported', 'protected_history', 'not_eligible'];
export const CATEGORY_LABELS = {
  ready_for_approval: 'Готов к утверждению', approved_current: 'Утверждение актуально', needs_data: 'Требуются данные', applicability_review: 'Проверить применимость', conflict: 'Конфликт данных', already_exported: 'Ранее выгружен', protected_history: 'Защищённая история', not_eligible: 'Следующая стадия недоступна',
};
export function validateProtocolComposition(data, id, preview = false) {
  if (data?.protocol?.id !== id || data.complete !== true || data.read_only !== true || data.not_authorization_for_export !== true || !/^[a-f0-9]{64}$/.test(data.input_revision || '') || !Array.isArray(data.members) || data.members.length !== data.participant_count || data.members.length > 100) throw new Error('Сервер не подтвердил полный состав протокола.');
  if (new Set(data.members.map(row => row.member_id)).size !== data.members.length) throw new Error('Повторная связь участника.');
  if (preview && (!data.checked_at || data.summary?.total !== data.members.length || data.members.some(row => !PREVIEW_CATEGORIES.includes(row.category) || !Array.isArray(row.issues)) || PREVIEW_CATEGORIES.some(category => data.counts?.[category] !== data.members.filter(row => row.category === category).length))) throw new Error('Неполный результат проверки.');
  return data;
}
export function isProtocolError(row) {
  return !['ready_for_approval', 'approved_current'].includes(row.category);
}
export function protocolLocation() {
  const query = new URLSearchParams(window.location.search);
  return { mode: query.get('mintrudView') === 'protocols' ? 'protocols' : 'learners', id: query.get('protocolId') || '', q: query.get('protocolQuery') || '', course: query.get('protocolCourse') || '', status: ['draft', 'recorded'].includes(query.get('protocolStatus')) ? query.get('protocolStatus') : '', offset: Math.max(0, Number(query.get('protocolOffset')) || 0) };
}
export function navigateProtocol(values) {
  const url = new URL(window.location.href);
  for (const [name, key] of Object.entries({ mode: 'mintrudView', id: 'protocolId', q: 'protocolQuery', course: 'protocolCourse', status: 'protocolStatus', offset: 'protocolOffset' })) {
    if (name in values) { url.searchParams.delete(key); if (values[name]) url.searchParams.set(key, String(values[name])); }
  }
  window.history.pushState({}, '', url);
  window.dispatchEvent(new Event('obrportal-registry-navigation'));
}
