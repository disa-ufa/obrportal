import { useEffect, useState } from "react";
import { formatApiError } from "../../utils/apiErrors";
import { buildOrganizationProfileOfferingsFormData } from "../../utils/organizationCabinet";


const COLLECTIONS = [
  {
    key: "activity_directions",
    label: "Направления деятельности",
    addLabel: "Добавить направление",
    emptyText: "Направления пока не указаны.",
    placeholder: "Например: дополнительное образование",
  },
  {
    key: "services",
    label: "Услуги",
    addLabel: "Добавить услугу",
    emptyText: "Услуги пока не указаны.",
    placeholder: "Например: консультация",
  },
];


function validateOfferingCollection(items, label) {
  const normalizedNames = items.map((item) =>
    item.name.trim().toLocaleLowerCase("ru")
  );

  if (normalizedNames.some((name) => !name)) {
    return `Заполните названия во всех строках раздела «${label}».`;
  }

  if (new Set(normalizedNames).size !== normalizedNames.length) {
    return `Названия в разделе «${label}» не должны повторяться.`;
  }

  return "";
}


export function OrganizationProfileOfferingsEditor({
  organization,
  onSave,
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(() =>
    buildOrganizationProfileOfferingsFormData(organization)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFormData(buildOrganizationProfileOfferingsFormData(organization));
    setError("");
    setMessage("");
  }, [organization]);

  function updateRow(collectionName, index, field, value) {
    setFormData((current) => ({
      ...current,
      [collectionName]: current[collectionName].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
    setError("");
    setMessage("");
  }

  function addRow(collectionName) {
    setFormData((current) => {
      if (current[collectionName].length >= 100) {
        setError("Можно указать не более 100 элементов в каждом списке.");
        return current;
      }

      return {
        ...current,
        [collectionName]: [
          ...current[collectionName],
          { name: "", description: "" },
        ],
      };
    });
    setMessage("");
  }

  function removeRow(collectionName, index) {
    setFormData((current) => ({
      ...current,
      [collectionName]: current[collectionName].filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    for (const collection of COLLECTIONS) {
      const validationError = validateOfferingCollection(
        formData[collection.key],
        collection.label
      );

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await onSave(organization.id, formData);

      setFormData(buildOrganizationProfileOfferingsFormData(updated));
      setEditing(false);
      setMessage("Услуги и направления сохранены.");
    } catch (err) {
      setError(
        formatApiError(err, "Не удалось сохранить услуги и направления.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      data-testid="organization-profile-offerings"
      className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-950">
            Услуги и направления деятельности
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Основные направления работы и услуги организации.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((current) => !current);
            setFormData(buildOrganizationProfileOfferingsFormData(organization));
            setError("");
            setMessage("");
          }}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          {editing ? "Отменить" : "Редактировать услуги"}
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
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {COLLECTIONS.map((collection) => (
            <fieldset key={collection.key}>
              <legend className="text-sm font-semibold text-slate-800">
                {collection.label}
              </legend>

              <div className="mt-3 space-y-3">
                {formData[collection.key].map((item, index) => (
                  <div
                    key={`${collection.key}-${index}`}
                    className="rounded-2xl bg-white p-3 ring-1 ring-slate-200"
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-500">
                          Название
                        </span>
                        <input
                          value={item.name}
                          onChange={(event) =>
                            updateRow(
                              collection.key,
                              index,
                              "name",
                              event.target.value
                            )
                          }
                          maxLength={255}
                          className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-50"
                          placeholder={collection.placeholder}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeRow(collection.key, index)}
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
                          updateRow(
                            collection.key,
                            index,
                            "description",
                            event.target.value
                          )
                        }
                        maxLength={2048}
                        rows={2}
                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-50"
                        placeholder="Краткое описание"
                      />
                    </label>
                  </div>
                ))}

                {formData[collection.key].length === 0 && (
                  <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                    Список пока пуст.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => addRow(collection.key)}
                className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
              >
                {collection.addLabel}
              </button>
            </fieldset>
          ))}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
            >
              {saving ? "Сохраняем..." : "Сохранить услуги и направления"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(
                  buildOrganizationProfileOfferingsFormData(organization)
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
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {COLLECTIONS.map((collection) => {
            const items = Array.isArray(organization[collection.key])
              ? organization[collection.key]
              : [];

            return (
              <div
                key={collection.key}
                className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {collection.label}
                </div>

                {items.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {items.map((item) => (
                      <div
                        key={
                          item.id ||
                          `${collection.key}-${item.sort_order}-${item.name}`
                        }
                        className="rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <div className="font-semibold text-slate-900">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                            {item.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">
                    {collection.emptyText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
