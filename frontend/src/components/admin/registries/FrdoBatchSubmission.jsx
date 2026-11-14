import { useEffect, useState } from "react";
import { canConfirmFrdoSubmission, confirmedFrdoSubmission } from "../../../utils/frdoSubmissionFence";

const BUTTON = "rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = BUTTON + " bg-slate-900 text-white hover:bg-slate-700";
const SECONDARY = BUTTON + " bg-white text-slate-700 ring-1 ring-slate-300";
const INPUT = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";

export default function FrdoBatchSubmission({ batch, submission, readOnly = true }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const pending = Boolean(submission.pending[batch.id]);
  const state = submission.states[batch.id];
  const checking = state === "checking";
  const unknown = pending || state === "unknown";
  const confirmed = state === "confirmed" || confirmedFrdoSubmission(batch.id, batch);
  const eligible = !readOnly && !confirmed && canConfirmFrdoSubmission(batch);
  const blocked = checking || unknown;

  useEffect(() => { setOpen(false); setReference(""); }, [batch.id, readOnly, confirmed]);
  async function confirm(event) {
    event.preventDefault();
    if (!eligible || blocked) return;
    await submission.confirm(batch, reference);
  }

  return <section aria-label="Подтверждение отправки ФРДО" className="mt-4 rounded-xl border p-4">
    <h3 className="font-bold">Подтверждение отправки ФРДО</h3>
    <p className="mt-2 text-sm">Подтвердите только фактически выполненную вами загрузку файла во ФРДО. Портал фиксирует факт отправки и не передаёт сведения во внешний реестр автоматически.</p>
    <div role="status" className="mt-2 text-sm">
      {checking ? "Проверяем результат подтверждения" : unknown ? "Результат операции неизвестен. Повторное подтверждение заблокировано" : confirmed ? "Подтверждение получено" : "Отправка ещё не подтверждена"}
      {submission.errors[batch.id] && <p>{submission.errors[batch.id]}</p>}
    </div>
    {pending && <button type="button" className={SECONDARY} disabled={checking} onClick={() => submission.check(batch.id)}>Проверить подтверждение отправки</button>}
    {eligible && <button type="button" className={PRIMARY} disabled={blocked || open} onClick={() => { setReference(""); setOpen(true); }}>Зафиксировать отправку</button>}
    {eligible && open && <form onSubmit={confirm} className="mt-3 grid gap-2" data-testid="frdo-selected-submission-form">
      <label className="text-xs">Внешний номер отправки (необязательно)
        <input className={INPUT} maxLength={255} value={reference} onChange={event => setReference(event.target.value)} disabled={blocked} />
      </label>
      <div className="flex gap-2">
        <button className={PRIMARY} disabled={blocked} type="submit">Подтвердить фактическую отправку</button>
        <button type="button" className={SECONDARY} onClick={() => setOpen(false)}>Отмена</button>
      </div>
    </form>}
    {readOnly && <p className="mt-2 text-sm">Режим только для просмотра. Подтверждение отправки недоступно.</p>}
  </section>;
}
