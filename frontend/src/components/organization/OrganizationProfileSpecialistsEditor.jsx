import { useEffect, useState } from "react";
import { formatApiError } from "../../utils/apiErrors";
import { buildOrganizationProfileSpecialistsFormData } from "../../utils/organizationCabinet";

function validateSpecialists(items) {
  const normalizedNames = items.map((item) =>
    item.name.trim().toLocaleLowerCase("ru")
  );

  if (normalizedNames.some((name) => !name)) {
    return "Заполните название типа специалиста в каждой строке.";
  }

  if (new Set(normalizedNames).size !== normalizedNames.length) {
    return "Типы специалистов не должны повторяться.";
  }

  for (const item of items) {
    const countText = `${item.count ?? ""}`.trim();

    if (!/^\d+$/.test(countText)) {
      return "Количество специалистов должно быть целым числом.";
    }

    const count = Number(countText);

    if (!Number.isSafeInteger(count) || count < 1 || count > 10000) {
      return "Количество специалистов должно быть от 1 до 10 000.";
    }
  }

  return "";
}

export function OrganizationProfileSpecialistsEditor({
  organization,
  onSave,
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(() =>
    buildOrganizationProfileSpecialistsFormData(organization)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFormData(buildOrganizationProfileSpecialistsFormData(organization));
    setError("");
    setMessage("");
  }, [organization]);

  function updateRow(index, field, value) {
    setFormData((current) => ({
      ...current,
      specialists: current.specialists.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
    setError("");
    setMessage("");
  }

  function addRow() {
    setFormData((current) => {
      if (current.specialists.length >= 100) {
        setError("Можно указать не более 100 типов специалистов.");
        return current;
      }

      return {
        ...current,
        specialists: [
          ...current.specialists,
          { name: "", description: "", count: "1" },
        ],
      };
    });
    setMessage("");
  }

  function removeRow(index) {
    setFormData((current) => ({
      ...current,
      specialists: current.specialists.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateSpecialists(formData.specialists);

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      specialists: formData.specialists.map((item) => ({
        name: item.name.trim(),
        description: item.description.trim(),
        count: Number(item.count),
      })),
    };

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await onSave(organization.id, payload);

      setFormData(buildOrganizationProfileSpecialistsFormData(updated));
      setEditing(false);
      setMessage("Сведения о специалистах сохранены.");
    } catch (err) {
      setError(
        formatApiError(err, "Не удалось сохранить сведения о специалистах.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      data-testid="organization-profile-specialists"
      className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-950">
            Специалисты организации
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Укажите типы специалистов и их количество без ФИО и других
            персональных данных.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((current) => !current);
            setFormData(
              buildOrganizationProfileSpecialistsFormData(organization)
            );
            setError("");
            setMessage("");
          }}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          {editing ? "Отменить" : "Редактировать специалистов"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
          {message}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-3">
            {formData.specialists.map((item, index) => (
              <div
                key={`specialist-${index}`}
                className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"
              >
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto]">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500">
                      Тип специалиста
                    </span>
                    <input
                      value={item.name}
                      onChange={(event) =>
                        updateRow(index, "name", event.target.value)
                      }
                      maxLength={255}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-50"
                      placeholder="Например: педагог-психолог"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500">
                      Количество
                    </span>
                    <input
                      type="number"
                      value={item.count}
                      onChange={(event) =>
                        updateRow(index, "count", event.target.value)
                      }
                      min={1}
                      max={10000}
                      step={1}
                      inputMode="numeric"
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-50"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="self-end rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50"
                  >
                    Удалить
                  </button>
                </div>

                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-slate-500">
                    Описание
                  </span>
                  <textarea
                    value={item.description}
                    onChange={(event) =>
                      updateRow(index, "description", event.target.value)
                    }
                    maxLength={2048}
                    rows={2}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-50"
                    placeholder="Краткое описание функций или квалификации"
                  />
                </label>
              </div>
            ))}

            {formData.specialists.length === 0 && (
              <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                Специалисты пока не указаны.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
          >
            Добавить тип специалиста
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? "Сохраняем..." : "Сохранить специалистов"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(
                  buildOrganizationProfileSpecialistsFormData(organization)
                );
                setEditing(false);
                setError("");
                setMessage("");
              }}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          {Array.isArray(organization.specialists) &&
          organization.specialists.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {organization.specialists.map((item) => (
                <div
                  key={item.id || `specialist-${item.sort_order}-${item.name}`}
                  className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-semibold text-slate-900">
                      {item.name}
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      Количество: {item.count}
                    </span>
                  </div>
                  {item.description && (
                    <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                      {item.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Специалисты пока не указаны.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
