// P3.3A: read-only completeness check of a *saved*, server-returned protocol draft.
// It does not authorize EISOT export, confirm the commission, or sign a document.
const filled = (v) => typeof v === "string" && v.trim().length > 0;

const validDate = (v) => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export function checkProtocolDraftCompleteness(saved) {
  if (!saved || saved.document_kind !== "DRAFT_PREVIEW_ONLY" || saved.status !== "draft") {
    throw new Error("Проверка возможна только для серверного снимка сохранённого черновика.");
  }
  const issues = [];
  const add = (code, message) => issues.push({ code, message });

  if (!filled(saved.protocol_number)) add("protocol_number", "Укажите номер протокола.");
  if (!validDate(saved.protocol_date)) add("protocol_date", "Укажите корректную дату протокола.");
  if (!filled(saved.training_provider_name)) add("training_provider", "Укажите организацию, проводившую обучение.");
  if (!filled(saved.commission_order_number)) add("order_number", "Укажите номер приказа о создании комиссии.");
  if (!validDate(saved.commission_order_date)) add("order_date", "Укажите дату приказа о создании комиссии.");
  if (!filled(saved.commission_chair)) add("commission_chair", "Укажите Ф.И.О. председателя комиссии.");

  const members = Array.isArray(saved.commission_members) ? saved.commission_members : [];
  const uniquePeople = new Set([saved.commission_chair, ...members].filter(filled).map(x => x.trim().toLocaleLowerCase("ru-RU")));
  if (uniquePeople.size < 3) add("commission_size", "Проверьте состав комиссии: требуется не менее трёх различных человек, включая председателя.");
  if (!filled(saved.program_title)) add("program_title", "Укажите наименование программы обучения.");
  if (!(typeof saved.program_hours === "number" && Number.isFinite(saved.program_hours) && saved.program_hours > 0)) {
    add("program_hours", "Укажите положительную продолжительность программы в часах.");
  }

  const participants = Array.isArray(saved.participants) ? saved.participants : [];
  if (participants.length === 0 || participants.length > 100) {
    add("participant_count", "Состав участников отсутствует или превышает допустимый размер проекта.");
  }
  participants.forEach((p, i) => {
    const label = filled(p.learner_name) ? p.learner_name.trim() : `Участник № ${i + 1}`;
    if (!filled(p.learner_name)) add(`member_${i}_name`, `${label}: отсутствует Ф.И.О.`);
    if (!filled(p.profession_or_position)) add(`member_${i}_position`, `${label}: отсутствует должность / профессия (проверьте данные Минтруда).`);
    if (!filled(p.workplace)) add(`member_${i}_workplace`, `${label}: отсутствует место работы (проверьте данные Минтруда).`);
    if (!["satisfactory", "unsatisfactory"].includes(p.knowledge_check_result)) {
      add(`member_${i}_result`, `${label}: не внесён фактический результат комиссии.`);
    }
    if (!validDate(p.knowledge_check_date)) {
      add(`member_${i}_date`, `${label}: не указана корректная дата фактической проверки.`);
    } else if (validDate(saved.protocol_date) && p.knowledge_check_date > saved.protocol_date) {
      add(`member_${i}_future_check`, `${label}: дата проверки позже даты протокола — проверьте фактические даты.`);
    }
  });
  return {
    fieldsComplete: issues.length === 0,
    issues,
    advisories: [
      "Проверьте полное официальное наименование обучающей организации, документы комиссии и достоверность введённых результатов.",
      "Регистрационные номера ЕИСОТ или надлежаще подписанная выписка, а также подписи оформляются отдельно после регистрации. Их отсутствие не блокирует эту предварительную проверку перед передачей сведений.",
      "Онлайн-тестирование не считается автоматическим решением комиссии. Данные в Минтруд из проекта не переносятся.",
    ],
  };
}
