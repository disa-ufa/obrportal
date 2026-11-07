// M4.UI.3 — print a fresh, read-only server snapshot of a saved DRAFT.
// Never promote draft data to a recorded/signed document or an EISOT submission.
const htmlEscape = input => String(input ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[ch]);
const isPresent = input => input !== null && input !== undefined && String(input).trim() !== "";
const printValue = input => isPresent(input) ? htmlEscape(input) : "—";
const monthsGenitive = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function dateParts(raw) {
  const match = String(raw ?? "").match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (!match) return null;
  const [, year, month, day] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return null;
  return { year, month, day, monthNumber, dayNumber };
}

const dateDigits = raw => {
  const parts = dateParts(raw);
  return parts ? `${parts.day}.${parts.month}.${parts.year}` : printValue(raw);
};
const dateWords = raw => {
  const parts = dateParts(raw);
  return parts
    ? `${parts.dayNumber} ${monthsGenitive[parts.monthNumber - 1]} ${parts.year} г.`
    : isPresent(raw) ? printValue(raw) : "—";
};
const resultLabel = result => ({
  satisfactory: "Сдал",
  unsatisfactory: "Не сдал",
})[result] || "—";

const renderCommission = (chair, members) => {
  const memberList = Array.isArray(members) ? members.filter(isPresent) : [];
  return `<div class="commission-block">
    <div class="commission-row"><span class="role">Председатель комиссии:</span><span>${printValue(chair)}</span></div>
    ${memberList.length
      ? memberList.map((person, i) => `<div class="commission-row"><span class="role">${i === 0 ? "Члены комиссии:" : ""}</span><span>${printValue(person)}</span></div>`).join("\n")
      : `<div class="commission-row"><span class="role">Члены комиссии:</span><span>—</span></div>`}
  </div>`;
};

const renderSignatures = (chair, members) => {
  const people = [
    { label: "Председатель комиссии", name: chair },
    ...(Array.isArray(members) ? members.filter(isPresent).map(name => ({ label: "Член комиссии", name })) : []),
  ];
  return people.map(({ label, name }) => `<div class="signature-row">
    <span class="signature-role">${label}</span>
    <span class="signature-line" aria-hidden="true"></span>
    <span class="signature-name">${printValue(name)}</span>
  </div>`).join("\n");
};

export function buildProtocolDraftPrintHtml(draft) {
  if (!draft || draft.document_kind !== "DRAFT_PREVIEW_ONLY" || draft.status !== "draft") {
    throw new Error("Для печати требуется подтверждённый сервером снимок сохранённого черновика.");
  }
  if (!Array.isArray(draft.participants) || draft.participants.length < 1 || draft.participants.length > 100) {
    throw new Error("Некорректный состав проекта протокола.");
  }

  const organization = printValue(draft.training_provider_name);
  const title = `Проект протокола № ${String(draft.protocol_number ?? "")}`;
  const members = Array.isArray(draft.commission_members) ? draft.commission_members : [];
  const trainingHours = isPresent(draft.program_hours)
    ? `${printValue(draft.program_hours)} ч.`
    : "—";

  // Group, certificate numbers and reasons for assessment are NOT provided by
  // this API. Deliberately do not infer them from a registry record number.
  const rows = draft.participants.map((p, index) => `<tr>
    <td class="number">${index + 1}</td>
    <td class="fio">${printValue(p.learner_name)}</td>
    <td>${printValue(p.profession_or_position)}</td>
    <td>${printValue(p.workplace)}</td>
    <td class="result-cell">
      <span>${htmlEscape(resultLabel(p.knowledge_check_result))}</span>
      <span class="extra">№ удостоверения: —</span>
      <span class="extra">Дата проверки: ${dateDigits(p.knowledge_check_date)}</span>
    </td>
    <td>—</td>
  </tr>`).join("\n");

  const missing = [
    !isPresent(draft.training_provider_name) && "наименование организации",
    !isPresent(draft.commission_order_number) && "номер приказа о комиссии",
    !isPresent(draft.commission_order_date) && "дата приказа о комиссии",
    !isPresent(draft.commission_chair) && "председатель комиссии",
    !isPresent(draft.program_title) && "название программы",
    !isPresent(draft.program_hours) && "количество учебных часов",
    ...draft.participants.flatMap(p => [
      !isPresent(p.profession_or_position) && `должность участника ${p.learner_name || "(Ф. И. О. не указано)"}`,
      !isPresent(p.workplace) && `место работы участника ${p.learner_name || "(Ф. И. О. не указано)"}`,
      !isPresent(p.knowledge_check_result) && `результат участника ${p.learner_name || "(Ф. И. О. не указано)"}`,
      !isPresent(p.knowledge_check_date) && `дата проверки участника ${p.learner_name || "(Ф. И. О. не указано)"}`,
    ]),
  ].filter(Boolean);

  const note = missing.length
    ? `<p class="incomplete"><strong>Требуют заполнения или проверки:</strong> ${missing.map(htmlEscape).join("; ")}.</p>`
    : "";
  const noteForMissingApi = `Номер группы, причина проверки и номер удостоверения отсутствуют в текущем API печати; прочерки не являются сведениями о выдаче удостоверений.`;

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${htmlEscape(title)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm 11mm; }
  * { box-sizing: border-box; }
  html { background: #e8ebef; }
  body { max-width: 1120px; margin: 16px auto; padding: 12mm; background: white;
    color: #111; font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.2; }
  .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
    margin: 0 0 14px; padding: 10px 12px; background: #eef2ff;
    font: 13px/1.4 Arial, sans-serif; }
  .toolbar button { border: 1px solid #1d4ed8; color: white; background: #1d4ed8;
    border-radius: 5px; padding: 9px 13px; cursor: pointer; }
  .draft-mark { border: 1.5px solid #8a2525; color: #8a2525; padding: 5px;
    margin-bottom: 11px; text-align: center; letter-spacing: 0.07em; font: bold 12px Arial, sans-serif; }
  .protocol-heading { text-align: center; }
  h1 { margin: 6px 0 3px; font-size: 15pt; font-weight: bold; letter-spacing: 0.12em; }
  .heading-line { font-size: 11.5pt; }
  .organization { font-weight: bold; margin: 2px 0 5px; }
  .date-line { text-align: right; font-weight: bold; margin: 7px 0 8px; }
  p { margin: 5px 0; }
  .commission-block { margin: 4px 0 6px; }
  .commission-row { display: grid; grid-template-columns: 32mm 1fr; gap: 3mm; margin: 1px 0; }
  .commission-row .role { font-weight: bold; }
  .course-statement { font-weight: bold; margin: 9px 0 7px; }
  table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 6px 0 0; font-size: 10.5pt; }
  col.number { width: 4.5%; } col.fio { width: 23%; } col.position { width: 14%; }
  col.workplace { width: 25.5%; } col.result { width: 18%; } col.reason { width: 15%; }
  th, td { border: 1px solid #111; padding: 5px 5px; vertical-align: middle;
    overflow-wrap: anywhere; word-break: normal; hyphens: auto; }
  th { text-align: center; font-weight: normal; background: #f8f8f8; }
  td.number { text-align: center; }
  td.result-cell { text-align: center; }
  .extra { display: block; margin-top: 3px; font-size: 9pt; }
  tbody tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  .signature-block { margin-top: 15px; break-inside: avoid; page-break-inside: avoid; }
  .signature-row { display: grid; grid-template-columns: 36mm 40mm minmax(0,1fr);
    align-items: end; gap: 7mm; padding-top: 9px; }
  .signature-role { font-weight: bold; }
  .signature-line { border-bottom: 1px solid #111; height: 10px; }
  .signature-name { font-size: 10.5pt; }
  .incomplete { margin-top: 12px; border-left: 3px solid #9b4b00;
    padding: 4px 8px; font-size: 9pt; }
  .footer { margin-top: 12px; padding-top: 7px; border-top: 1px solid #aaa;
    font-size: 9pt; }
  .footer p { margin-top: 3px; }
  @media print {
    html { background: white; }
    body { max-width: none; margin: 0; padding: 0; }
    .toolbar { display: none !important; }
    .draft-mark { color: #111; border-color: #111; }
    th { background: white; }
    .protocol-heading, .commission-block, .course-statement { break-after: avoid; }
    .signature-block { break-inside: avoid; }
    .footer { break-inside: avoid; }
  }
</style></head><body>
<div class="toolbar"><button type="button" id="print-button">Печать / Сохранить как PDF</button>
  <span>Печатается только сохранённый черновик; изменения в открытом редакторе не включаются.</span></div>

<header class="protocol-heading">
  <h1>ПРОТОКОЛ № ${printValue(draft.protocol_number)}</h1>
  <div class="heading-line">заседания комиссии по проверке знаний требований охраны труда</div>
  <div class="organization">${organization}</div>
</header>
<div class="date-line">от ${dateWords(draft.protocol_date)}</div>
<p>В соответствии с приказом по ${organization} № ${printValue(draft.commission_order_number)}
  от ${dateWords(draft.commission_order_date)} комиссия в составе:</p>
${renderCommission(draft.commission_chair, members)}
<p class="course-statement">провела проверку знаний требований охраны труда
  по курсу: «${printValue(draft.program_title)}» (обучение в объёме ${trainingHours}).</p>
<table aria-label="Участники протокола">
<colgroup><col class="number"/><col class="fio"/><col class="position"/>
  <col class="workplace"/><col class="result"/><col class="reason"/></colgroup>
<thead><tr>
  <th scope="col">№<br/>п/п</th>
  <th scope="col">Фамилия, имя, отчество</th>
  <th scope="col">Должность</th>
  <th scope="col">Наименование предприятия, подразделения</th>
  <th scope="col">Результат проверки знаний (сдал / не сдал), № выданного удостоверения</th>
  <th scope="col">Причина проверки знаний (очередная / внеочередная)</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="signature-block">
  ${renderSignatures(draft.commission_chair, members)}
</div>
${isPresent(draft.notes) ? `<p><strong>Примечание к проекту:</strong> ${printValue(draft.notes)}</p>` : ""}

<footer class="footer">
  <p><strong>Внимание:</strong> этот документ — неподписанный проект. Он не подтверждает проведение комиссии,
    не является удостоверением и не означает передачу сведений в Минтруд или ЕИСОТ.</p>
  <p>${htmlEscape(noteForMissingApi)}</p>
</footer>
<script>document.getElementById('print-button').addEventListener('click', function() { window.print(); });</script>
</body></html>`;
}

export function openProtocolDraftPrint(popup, draft) {
  const page = buildProtocolDraftPrintHtml(draft);
  popup.document.open();
  popup.document.write(page);
  popup.document.close();
  popup.focus();
}
