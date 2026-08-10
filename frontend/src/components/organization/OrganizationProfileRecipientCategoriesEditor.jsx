import { useEffect, useState } from "react";
import { formatApiError } from "../../utils/apiErrors";
import { buildOrganizationProfileRecipientCategoriesFormData } from "../../utils/organizationCabinet";

function validateRecipientCategories(items) {
  if (items.length > 100) {
    return "Можно указать не более 100 категорий получателей услуг.";
  }

  const normalizedNames = items.map((item) =>
    item.name.trim().toLocaleLowerCase("ru")
  );

  if (normalizedNames.some((name) => !name)) {
    return "Заполните название категории получателей в каждой строке.";
  }

  if (new Set(normalizedNames).size !== normalizedNames.length) {
    return "Категории получателей услуг не должны повторяться.";
  }

  return "";
}

export function OrganizationProfileRecipientCategoriesEditor({ organization, onSave }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(() =>
    buildOrganizationProfileRecipientCategoriesFormData(organization)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFormData(buildOrganizationProfileRecipientCategoriesFormData(organization));
    setError("");
    setMessage("");
  }, [organization]);

  function updateRow(index, field, value) {
    setFormData((current) => ({
      ...current,
      recipient_categories: current.recipient_categories.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
    setError("");
    setMessage("");
  }

  function addRow() {
    setFormData((current) => {
      if (current.recipient_categories.length >= 100) {
        setError("Можно указать не более 100 категорий получателей услуг.");
        return current;
      }
      return {
        ...current,
        recipient_categories: [
          ...current.recipient_categories,
          { name: "", description: "" },
        ],
      };
    });
    setMessage("");
  }

  function removeRow(index) {
    setFormData((current) => ({
      ...current,
      recipient_categories: current.recipient_categories.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateRecipientCategories(formData.recipient_categories);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      recipient_categories: formData.recipient_categories.map((item) => ({
        name: item.name.trim(),
        description: item.description.trim(),
      })),
    };

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await onSave(organization.id, payload);
      setFormData(buildOrganizationProfileRecipientCategoriesFormData(updated));
      setEditing(false);
      setMessage("Категории получателей услуг сохранены.");
    } catch (err) {
      setError(formatApiError(err, "Не удалось сохранить категории получателей услуг."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      data-testid="organization-profile-recipient-categories"
      className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-950">Категории получателей услуг</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Укажите группы получателей услуг. Не добавляйте персональные данные конкретных получателей.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((current) => !current);
            setFormData(buildOrganizationProfileRecipientCategoriesFormData(organization));
            setError("");
            setMessage("");
          }}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          {editing ? "Отменить" : "Редактировать категории"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">{error}</div>
      )}
      {message && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">{message}</div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-3">
            {formData.recipient_categories.map((item, index) => (
              <div key={`recipient-category-${index}`} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-500">Категория получателей</span>
                    <input
                      value={item.name}
                      onChange={(event) => updateRow(index, "name", event.target.value)}
                      maxLength={255}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-50"
                      placeholder="Например: дети с инвалидностью"
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
                  <span className="text-xs font-semibold text-slate-500">Описание</span>
                  <textarea
                    value={item.description}
                    onChange={(event) => updateRow(index, "description", event.target.value)}
                    maxLength={2048}
                    rows={2}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-50"
                    placeholder="Кратко опишите эту группу получателей"
                  />
                </label>
              </div>
            ))}

            {formData.recipient_categories.length === 0 && (
              <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                Категории получателей пока не указаны.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
          >
            Добавить категорию
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? "Сохраняем..." : "Сохранить категории"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(buildOrganizationProfileRecipientCategoriesFormData(organization));
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
          {Array.isArray(organization.recipient_categories) && organization.recipient_categories.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {organization.recipient_categories.map((item) => (
                <div
                  key={item.id || `recipient-category-${item.sort_order}-${item.name}`}
                  className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                >
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  {item.description && (
                    <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{item.description}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">Категории получателей пока не указаны.</div>
          )}
        </div>
      )}
    </div>
  );
}
