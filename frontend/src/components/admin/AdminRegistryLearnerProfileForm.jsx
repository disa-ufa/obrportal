import { useEffect, useState } from "react";
import {
  getAdminLearnerProfile,
  updateAdminLearnerProfile,
} from "../../api/client";

const FIELDS = [
  ["last_name", "Фамилия", "text"],
  ["first_name", "Имя", "text"],
  ["middle_name", "Отчество", "text"],
  ["birth_date", "Дата рождения", "date"],
  ["sex", "Пол", "select"],
  ["citizenship_country_code", "Код гражданства (ОКСМ, 3 цифры)", "text"],
  ["snils", "СНИЛС слушателя", "text"],
];

const empty = Object.fromEntries(FIELDS.map(([name]) => [name, ""]));
const textClass = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm";

function normalized(values) {
  return Object.fromEntries(FIELDS.map(([name]) => [
    name, String(values?.[name] ?? ""),
  ]));
}

export function AdminRegistryLearnerProfileForm({ userId, onCancel, onSaved }) {
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    getAdminLearnerProfile(userId).then((profile) => {
      if (!current) return;
      const values = normalized(profile);
      setOriginal(values);
      setForm(values);
    }).catch(() => {
      if (current) setError("Не удалось открыть профиль. Повторите попытку.");
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [userId]);

  async function save(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const changes = Object.fromEntries(FIELDS
      .filter(([name]) => form[name].trim() !== original?.[name]?.trim())
      .map(([name]) => [name, form[name].trim() || null]));
    if (Object.keys(changes).length === 0) {
      setSuccess("Изменений нет.");
      return;
    }
    setBusy(true);
    try {
      const updated = await updateAdminLearnerProfile(userId, changes);
      const values = normalized(updated);
      setOriginal(values);
      setForm(values);
      setSuccess("Данные сохранены. Готовность реестров обновлена, если она зависит от изменённых полей. При необходимости нажмите «Проверить».");
      await onSaved?.();
    } catch {
      setError("Не удалось сохранить данные. Повторите попытку.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      data-testid="admin-registries-learner-profile-form"
      onSubmit={save}
      className="mt-4 rounded-2xl border border-slate-200 bg-blue-50 p-4"
    >
      <h3 className="text-sm font-bold text-slate-900">Персональные данные слушателя</h3>
      <p className="mt-1 text-xs text-slate-600">
        СНИЛС и персональные сведения сохраняются в профиле слушателя. ИНН работодателя заполняется отдельно в данных Минтруда ниже.
      </p>
      {loading ? <p className="mt-3 text-sm">Загрузка профиля…</p> : null}
      {!loading && original ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {FIELDS.map(([name, label, type]) => (
            <label key={name} className="grid gap-1 text-xs font-semibold text-slate-700">
              <span>{label}</span>
              {type === "select" ? (
                <select
                  className={textClass}
                  value={form[name]}
                  disabled={busy}
                  onChange={(e) => setForm((v) => ({ ...v, [name]: e.target.value }))}
                >
                  <option value="">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              ) : (
                <input
                  type={type}
                  className={textClass}
                  value={form[name]}
                  placeholder={name === "snils" ? "___-___-___ __" : undefined}
                  inputMode={name === "snils" || name === "citizenship_country_code" ? "numeric" : undefined}
                  disabled={busy}
                  onChange={(e) => setForm((v) => ({ ...v, [name]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p role="status" className="mt-3 text-sm text-green-800">{success}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={loading || busy || !original}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Сохранение…" : "Сохранить данные слушателя"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
          Закрыть
        </button>
      </div>
    </form>
  );
}
