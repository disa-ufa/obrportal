import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getAccountCompletionReadiness,
  getAccountEnrollmentEmployment,
  updateAccountEnrollmentEmployment,
} from "../../api/client";
import { formatApiError } from "../../utils/apiErrors";
import { SectionCard } from "../ui/SectionCard";

const fields = [
  { key: "profession_or_position", label: "Должность или профессия", limit: 255 },
  { key: "employer_name", label: "Наименование работодателя", limit: 512 },
  { key: "employer_inn", label: "ИНН российского работодателя", limit: 12 },
];

function toForm(details) {
  return Object.fromEntries(fields.map(({ key }) => [key, details[key] ?? ""]));
}

export function LearnerCourseEmployment({ enrollmentId }) {
  const [details, setDetails] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getAccountEnrollmentEmployment(enrollmentId), getAccountCompletionReadiness(enrollmentId)])
      .then(([employment, review]) => {
        if (!active) return;
        setDetails(employment);
        setForm(toForm(employment));
        setReadiness(review);
      })
      .catch((cause) => {
        if (active) setError(formatApiError(cause, "Не удалось загрузить данные для оформления обучения."));
      });
    return () => { active = false; };
  }, [enrollmentId, loadVersion]);

  const fieldsToShow = fields.filter(({ key }) => {
    if (!details) return false;
    if (details[key]) return true;
    return details.requirement === "employer_required"
      || (key === "profession_or_position" && details.requirement !== "not_required");
  });
  const changed = fieldsToShow.filter(({ key }) => form[key].trim() !== (details[key] ?? ""));
  const issues = [...(readiness?.missing_fields ?? []), ...(readiness?.invalid_fields ?? [])];

  async function save(event) {
    event.preventDefault();
    if (!details?.can_edit || saving || changed.length === 0) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await updateAccountEnrollmentEmployment(
        enrollmentId, Object.fromEntries(changed.map(({ key }) => [key, form[key].trim() || null]))
      );
      setDetails(saved);
      setForm(toForm(saved));
      setNotice("Сведения сохранены.");
      setReadiness(null);
      try {
        setReadiness(await getAccountCompletionReadiness(enrollmentId));
      } catch {
        setError("Сведения сохранены. Обновите состояние заполнения.");
      }
    } catch (cause) {
      setError(formatApiError(cause, "Не удалось сохранить сведения."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Данные для оформления обучения">
      {error && <p role="alert" className="mb-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mb-3 text-sm text-green-800">{notice}</p>}
      {!readiness && !error && !saving && <p role="status" className="text-sm text-slate-600">Загрузка данных…</p>}
      {error && !readiness && (
        <button type="button" className="text-sm font-bold text-blue-700 underline" onClick={() => {
          setError("");
          setLoadVersion((version) => version + 1);
        }}>Обновить</button>
      )}
      {readiness?.is_ready && <p role="status" className="mb-3 text-sm text-green-800">Данные заполнены.</p>}
      {details?.requirement === "not_required" && <p className="mb-3 text-sm text-slate-600">Сведения о работодателе для этого курса не требуются.</p>}
      {details && !details.can_edit && <p className="mb-3 text-sm text-slate-600">Сохранённые сведения защищены от изменений.</p>}
      {issues.length > 0 && (
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {issues.map(({ code, message }) => <li key={code}>{message}</li>)}
        </ul>
      )}
      {issues.some(({ field }) => field.startsWith("learner_profile.")) && (
        <Link to="/account" className="mb-4 inline-block text-sm font-bold text-blue-700 underline"
          onClick={() => {
            try { sessionStorage.setItem("obrportal_account_section", "profile"); } catch { /* optional preference */ }
          }}>Редактировать профиль слушателя</Link>
      )}
      {fieldsToShow.length > 0 && (
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={!details.can_edit || saving} className="grid min-w-0 gap-4 md:grid-cols-2">
            {fieldsToShow.map(({ key, label, limit }) => (
              <label key={key} className="min-w-0 space-y-1 text-sm font-semibold text-slate-800">
                <span>{label}</span>
                <input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal disabled:bg-slate-50"
                  value={form[key]} maxLength={limit} inputMode={key === "employer_inn" ? "numeric" : undefined}
                  onChange={(event) => {
                    setForm({ ...form, [key]: event.target.value });
                    setNotice("");
                  }}
                />
              </label>
            ))}
          </fieldset>
          {details.source === "learner" && <p className="text-sm text-slate-600">Сведения указаны слушателем.</p>}
          {details.can_edit && <button type="submit" disabled={saving || changed.length === 0}
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Сохранение…" : "Сохранить сведения"}
          </button>}
        </form>
      )}
    </SectionCard>
  );
}
