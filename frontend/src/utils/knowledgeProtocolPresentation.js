// Presentation only. Server readiness and mutation endpoints remain authoritative.
export const protocolSteps = ["Состав", "Комиссия", "Результаты", "Фиксация", "Подписание", "Минтруд"];
export const protocolResultLabel = value => ({ satisfactory: "Удовлетворительно", unsatisfactory: "Неудовлетворительно" }[value] || "Не указан");
export const protocolDateLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value.split("-").reverse().join(".") : "Не указана";

export function protocolPresentation(protocol) {
  const p = protocol || {};
  const participants = p.participants || [];
  const signed = p.status === "recorded" && p.is_signed === true;
  const scan = p.signed_scan_available === true ? "Скан прикреплён" : "Скан не прикреплён";
  if (signed) return { key: "signed", label: "Подписан", step: 5, next: "Сверить с Минтрудом", reason: "Подписание подтверждено сервером. Перенос реквизитов, утверждение и отправка в ЕИСОТ проверяются отдельно.", scan };
  if (p.status === "recorded") return { key: "recorded", label: "Ожидает подписания", step: 4, next: "Открыть подписание", reason: "Результаты зафиксированы. Подтвердите подписание только после фактического подписания бумажного оригинала.", scan };
  if (p.status !== "draft") return { key: "unknown", label: "Состояние требует проверки", step: null, next: "Обновить состояние", reason: "Сервер не подтвердил известное состояние протокола. Операции определяются после повторного чтения.", scan };
  let step = 3;
  let reason = "Подписание недоступно до фиксации. Сначала выполните серверную проверку сохранённых сведений.";
  if (!participants.length || !p.protocol_number || !p.protocol_date) {
    step = 0; reason = "Укажите номер, дату и состав участников. Подписание недоступно до фиксации результатов.";
  } else if (!p.commission_chair || !p.commission_order_number || !p.commission_order_date || new Set([p.commission_chair, ...(p.commission_members || [])].filter(Boolean).map(x => x.trim().toLocaleLowerCase("ru-RU")).filter(Boolean)).size < 3) {
    step = 1; reason = "Заполните приказ, председателя и состав комиссии: минимум три разных человека с учётом председателя. Подписание недоступно до фиксации результатов.";
  } else if (participants.some(m => !m.knowledge_check_date || !["satisfactory", "unsatisfactory"].includes(m.knowledge_check_result))) {
    step = 2; reason = "Внесите фактическую дату и результат проверки каждого участника вручную. Онлайн-тест не является решением комиссии. Подписание недоступно до фиксации.";
  }
  return { key: "draft", label: "Черновик", step, next: step < 3 ? `Заполнить этап «${protocolSteps[step]}»` : "Проверить перед фиксацией", reason, scan };
}

export function protocolMatches(protocol, query, state, courseTitle = "") {
  const text = [protocol.protocol_number, courseTitle, ...(protocol.participants || []).map(p => p.learner_name)].join(" ").toLocaleLowerCase("ru-RU");
  return (!state || protocolPresentation(protocol).key === state) && text.includes(query.trim().toLocaleLowerCase("ru-RU"));
}
