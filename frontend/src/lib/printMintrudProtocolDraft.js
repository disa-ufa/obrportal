// Print only a fresh, server-read saved draft. No approval, signing, DB write or export.
const htmlEscape = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
const value = (v) => htmlEscape(v === undefined || v === null || v === "" ? "Не указано" : v);
const dateRu = (v) => {
  if (!v) return "Не указана";
  const match = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value(v);
};
const resultLabel = (v) => ({
  satisfactory: "Удовлетворительно",
  unsatisfactory: "Неудовлетворительно",
})[v] || "Не указан";

export function buildProtocolDraftPrintHtml(draft) {
  if (!draft || draft.document_kind !== "DRAFT_PREVIEW_ONLY" || draft.status !== "draft") {
    throw new Error("Для печати требуется подтверждённый сервером снимок сохранённого черновика.");
  }
  if (!Array.isArray(draft.participants) || !draft.participants.length || draft.participants.length > 100) {
    throw new Error("Некорректный состав проекта протокола.");
  }
  const rows = draft.participants.map((p, i) => `<tr>
      <td class="num">${i + 1}</td>
      <td>${value(p.learner_name)}</td>
      <td>${value(p.profession_or_position)}</td>
      <td>${value(p.workplace)}</td>
      <td>${htmlEscape(resultLabel(p.knowledge_check_result))}</td>
      <td>${dateRu(p.knowledge_check_date)}</td>
      <td>${value(p.registry_record_number)}</td>
      <td class="signature">________________</td>
    </tr>`).join("\n");
  const members = Array.isArray(draft.commission_members) ? draft.commission_members : [];
  const signatures = [draft.commission_chair, ...members].map((person, index) => `
    <p>${index === 0 ? "Председатель комиссии" : "Член комиссии"}: ${value(person)} &nbsp; __________________ / подпись /</p>`).join("");
  const gaps = [
    !draft.training_provider_name && "полное наименование организации",
    !draft.commission_order_number && "номер приказа о комиссии",
    !draft.commission_order_date && "дата приказа о комиссии",
    !draft.commission_chair && "председатель комиссии",
    !draft.program_title && "название программы",
    !draft.program_hours && "продолжительность программы",
    ...draft.participants.flatMap(p => [
      !p.profession_or_position && `должность: ${p.learner_name || "слушатель"}`,
      !p.workplace && `место работы: ${p.learner_name || "слушатель"}`,
      !p.knowledge_check_result && `результат комиссии: ${p.learner_name || "слушатель"}`,
      !p.knowledge_check_date && `дата проверки комиссией: ${p.learner_name || "слушатель"}`,
    ]),
  ].filter(Boolean);
  const missing = gaps.length
    ? `<p class="warning"><b>Требуют проверки/заполнения:</b> ${gaps.map(htmlEscape).join("; ")}.</p>`
    : `<p class="warning"><b>Внимание:</b> проект всё равно требует фактического оформления и подписей.</p>`;
  const title = `Проект протокола № ${String(draft.protocol_number || "")}`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${htmlEscape(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 13mm; }
      * { box-sizing: border-box; }
      body { font: 12px/1.38 "Times New Roman", serif; color: #141414; margin: 0 auto; max-width: 1100px; padding: 22px; }
      .toolbar { display: flex; gap: 12px; margin-bottom: 20px; padding: 10px; background: #eef2ff; font: 14px Arial, sans-serif; }
      button { border: 1px solid #1d4ed8; color: #1d4ed8; border-radius: 6px; background: #fff; padding: 8px 15px; cursor: pointer; }
      h1 { margin: 12px 0 5px; font-size: 19px; text-align: center; }
      .center { text-align: center; }
      .draft { text-align: center; letter-spacing: 0.15em; color: #a12727; border: 2px solid #a12727; padding: 8px; font: bold 15px Arial, sans-serif; }
      .meta { margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 13px; font-size: 10.5px; }
      th, td { border: 1px solid #555; padding: 6px 5px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
      th { background: #f1f1f1; }
      tr { break-inside: avoid; }
      .num { width: 25px; text-align: center; }
      .signature { width: 75px; }
      .warning { font-size: 11px; border-left: 3px solid #c16d00; padding: 6px; }
      .foot { font-size: 11px; margin-top: 16px; border-top: 1px solid #bbb; padding-top: 9px; }
      .signatures { margin-top: 18px; break-inside: avoid; }
      @media print {
        body { padding: 0; max-width: none; }
        .toolbar { display: none; }
        .draft { color: #000; border-color: #000; }
      }
    </style></head><body>
    <div class="toolbar"><button id="print-button">Печать / Сохранить как PDF</button>
      <span>Печатается только сохранённый черновик, не изменения из открытого редактора.</span></div>
    <div class="draft">ПРОЕКТ — НЕ ПОДПИСАН — НЕ ЯВЛЯЕТСЯ ПОДТВЕРЖДЕНИЕМ ПРОВЕРКИ ЗНАНИЙ</div>
    <h1>ПРОТОКОЛ № ${value(draft.protocol_number)}</h1>
    <div class="center">проверки знания требований охраны труда — проект от ${dateRu(draft.protocol_date)}</div>
    <p class="meta"><b>Организация, проводящая обучение:</b> ${value(draft.training_provider_name)}</p>
    <p class="meta"><b>Приказ о создании комиссии:</b> № ${value(draft.commission_order_number)} от ${dateRu(draft.commission_order_date)}</p>
    <p class="meta"><b>Председатель комиссии:</b> ${value(draft.commission_chair)}</p>
    <p class="meta"><b>Члены комиссии:</b> ${members.length ? members.map(htmlEscape).join("; ") : "Не указаны"}</p>
    <p class="meta"><b>Программа:</b> ${value(draft.program_title)}; <b>продолжительность:</b> ${draft.program_hours ? value(draft.program_hours) + " ч." : "Не указана"}</p>
    <table><thead><tr><th>№</th><th>Ф.И.О. слушателя</th><th>Должность</th><th>Место работы</th><th>Результат</th><th>Дата проверки</th><th>Номер записи в реестре</th><th>Подпись работника</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <p class="meta"><b>Регистрационный номер:</b> после появления данных в реестре указывается в протоколе либо прикладывается соответствующая подписанная выписка из реестра в соответствии с действующими правилами.</p>
    <div class="signatures"><b>Подписи членов комиссии (заполняются после фактической проверки):</b>${signatures || "<p>Комиссия не указана</p>"}</div>
    ${draft.notes ? `<p><b>Примечание к проекту:</b> ${value(draft.notes)}</p>` : ""}
    ${missing}
    <div class="foot">Этот документ сформирован из неподписанного проекта OBRPORTAL. Он не удостоверяет факт проверки знаний, не подписан и не означает передачу данных в ЕИСОТ. Номер реестровой записи не подставляется автоматически до отдельного подтверждённого получения.</div>
    <script>document.getElementById('print-button').addEventListener('click', function(){ window.print(); });</script>
    </body></html>`;
}

export function openProtocolDraftPrint(popup, draft) {
  const page = buildProtocolDraftPrintHtml(draft);
  popup.document.open();
  popup.document.write(page);
  popup.document.close();
  popup.focus();
}
