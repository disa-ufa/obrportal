import { protocolDisplayStatus } from "../../utils/registryPresentation";

const empty = value => value === null || value === undefined || String(value).trim() === "";
const resultLabel = value => ({ satisfactory: "Удовлетворительно", unsatisfactory: "Неудовлетворительно" }[value] || value);

function CheckFields({ values }) {
  return <dl className="mt-2 grid gap-2 text-xs md:grid-cols-3">
    <div><dt>Номер протокола</dt><dd>{empty(values.protocol_number) ? "Не заполнено" : values.protocol_number}</dd></div>
    <div><dt>Дата проверки знаний</dt><dd>{empty(values.knowledge_check_date) ? "Не заполнено" : String(values.knowledge_check_date).slice(0, 10).split("-").reverse().join(".")}</dd></div>
    <div><dt>Результат проверки знаний</dt><dd>{empty(values.knowledge_check_result) ? "Не заполнено" : resultLabel(values.knowledge_check_result)}</dd></div>
  </dl>;
}

export function SavedMintrudFields({ context = {} }) {
  return <section data-testid="mintrud-saved-fields" className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
    <h3 className="text-sm font-bold">Сохранённые реквизиты Минтруда</h3>
    <CheckFields values={context} />
  </section>;
}

export function MintrudProtocolDetails({ protocols, onOpenProtocol }) {
  return <section data-testid="mintrud-protocol-details" className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
    <h3 className="text-sm font-bold">Сведения из протокола комиссии</h3>
    {protocols.length === 0 ? <p className="text-xs">Связанные протоколы пока не найдены.</p> : null}
    {protocols.map(protocol => <div key={protocol.id} className="mt-3 border-t border-blue-200 pt-2">
      <h4 className="text-sm font-bold">Протокол комиссии № {protocol.protocol_number || "Не заполнено"}</h4>
      <p className="text-sm font-semibold">{protocolDisplayStatus(protocol)}</p>
      <CheckFields values={Object.fromEntries(Object.entries(protocol.fields || {}).map(([key, field]) => [key, field?.source]))} />
      {protocol.status === "draft" ? <>
        <p className="mt-2 text-xs">Значения предварительные и не являются данными реестра. Черновик не подтверждает результаты комиссии; кнопка «Сохранить» не переносит его реквизиты.</p>
        <ol className="mt-2 list-decimal pl-5 text-xs">
          <li>Заполните фактические результаты проверки знаний.</li>
          <li>Проверьте готовность протокола.</li>
          <li>Зафиксируйте результаты комиссии после фактического проведения проверки.</li>
          <li>Сверьте протокол с реестром Минтруда.</li>
          <li>Подтвердите подписание бумажного оригинала и проверьте автоматический перенос реквизитов.</li>
          <li>Повторно проверьте готовность записи реестра.</li>
        </ol>
      </> : !protocol.sync_provenance?.applied ? <p className="mt-2 text-xs">Фиксация комиссии сама по себе не подтверждает подписание. Подтвердите фактическое подписание бумажного оригинала: сервер автоматически заполнит разрешённые пустые реквизиты. Затем проверьте результат переноса.</p> : null}
      {protocol.sync_provenance?.ever_synced && !protocol.sync_provenance?.applied ? <p className="text-xs">Ранее выполнялась синхронизация, но соответствие текущих данных не подтверждено.</p> : null}
      <button type="button" className="mt-2 rounded-lg border border-blue-400 bg-white px-3 py-1.5 text-xs font-semibold"
        onClick={() => onOpenProtocol?.(protocol)}>{protocol.status === "draft" ? "Открыть протокол для проверки и фиксации" : "Открыть протокол и сверку с реестром"}</button>
    </div>)}
  </section>;
}
