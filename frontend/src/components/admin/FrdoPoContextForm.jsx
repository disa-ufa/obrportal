import {
  useEffect,
  useState,
} from "react";

import {
  getAdminFrdoPoClassifierCatalog,
  searchAdminFrdoPoProfessions,
} from "../../api/client";


const BUTTON =
  "inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50";

const BLUE =
  `${BUTTON} bg-blue-600 text-white hover:bg-blue-500`;

const SECONDARY =
  `${BUTTON} bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50`;

const INPUT =
  "min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";


const TEXT = {
  title:
    "\u0414\u0430\u043d\u043d\u044b\u0435 \u0424\u0418\u0421 \u0424\u0420\u0414\u041e \u0434\u043b\u044f \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
  description:
    "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u043e\u0432 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u044e\u0442\u0441\u044f \u0438\u0437 \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u0451\u043d\u043d\u043e\u0433\u043e \u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e \u0448\u0430\u0431\u043b\u043e\u043d\u0430 \u0424\u0420\u0414\u041e. \u041f\u0440\u043e\u0438\u0437\u0432\u043e\u043b\u044c\u043d\u044b\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u043c \u043d\u0435 \u043f\u0440\u0438\u043d\u0438\u043c\u0430\u044e\u0442\u0441\u044f.",
  choose:
    "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435",
  documentStatus:
    "\u0421\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  lossConfirmation:
    "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0443\u0442\u0440\u0430\u0442\u044b",
  exchangeConfirmation:
    "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u043e\u0431\u043c\u0435\u043d\u0430",
  destructionConfirmation:
    "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u0435\u043d\u0438\u044f",
  studyForm:
    "\u0424\u043e\u0440\u043c\u0430 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
  fundingSource:
    "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0444\u0438\u043d\u0430\u043d\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f",
  educationDeliveryForm:
    "\u0424\u043e\u0440\u043c\u0430 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u044f \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u044f",
  poDocumentType:
    "\u0412\u0438\u0434 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u041f\u041e",
  poProgramType:
    "\u0412\u0438\u0434 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u041f\u041e",
  poProfession:
    "\u041f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u044f",
  poQualification:
    "\u041a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0439 \u0440\u0430\u0437\u0440\u044f\u0434 / \u043a\u043b\u0430\u0441\u0441",
  professionHint:
    "\u041d\u0430\u0447\u043d\u0438\u0442\u0435 \u0432\u0432\u043e\u0434\u0438\u0442\u044c \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0438 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u044e \u0438\u0437 \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u0430.",
  loadingCatalog:
    "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u0438 \u0424\u0420\u0414\u041e...",
  loadingProfessions:
    "\u0418\u0449\u0435\u043c \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438...",
  originalDocumentTitle:
    "\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442",
  originalDocumentHint:
    "\u0414\u043b\u044f \u0434\u0443\u0431\u043b\u0438\u043a\u0430 \u0437\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0432\u0441\u0435 \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u043e \u043f\u0435\u0440\u0432\u043e\u043d\u0430\u0447\u0430\u043b\u044c\u043d\u043e \u0432\u044b\u0434\u0430\u043d\u043d\u043e\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0435.",
  originalDocumentType:
    "\u0412\u0438\u0434 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  originalSeries:
    "\u0421\u0435\u0440\u0438\u044f \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  originalNumber:
    "\u041d\u043e\u043c\u0435\u0440 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  originalRegistrationNumber:
    "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  originalIssueDate:
    "\u0414\u0430\u0442\u0430 \u0432\u044b\u0434\u0430\u0447\u0438 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u0433\u043e \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
  originalLastName:
    "\u0424\u0430\u043c\u0438\u043b\u0438\u044f \u0432 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0435",
  originalFirstName:
    "\u0418\u043c\u044f \u0432 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0435",
  originalMiddleName:
    "\u041e\u0442\u0447\u0435\u0441\u0442\u0432\u043e \u0432 \u0438\u0441\u0445\u043e\u0434\u043d\u043e\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0435",
  originalMiddleNameHint:
    "\u0415\u0441\u043b\u0438 \u043e\u0442\u0447\u0435\u0441\u0442\u0432\u0430 \u043d\u0435\u0442, \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u00ab\u041d\u0435\u0442\u00bb.",
  save:
    "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  cancel:
    "\u041e\u0442\u043c\u0435\u043d\u0430",
};


const FRDO_DOCUMENT_STATUS_DUPLICATE =
  "\u0414\u0443\u0431\u043b\u0438\u043a\u0430\u0442";


const SELECT_FIELDS = [
  {
    key: "document_status",
    classifier: "document_status",
    label: TEXT.documentStatus,
  },
  {
    key: "loss_confirmation",
    classifier: "loss_confirmation",
    label: TEXT.lossConfirmation,
  },
  {
    key: "exchange_confirmation",
    classifier: "exchange_confirmation",
    label: TEXT.exchangeConfirmation,
  },
  {
    key: "destruction_confirmation",
    classifier: "destruction_confirmation",
    label: TEXT.destructionConfirmation,
  },
  {
    key: "study_form",
    classifier: "study_form",
    label: TEXT.studyForm,
  },
  {
    key: "funding_source",
    classifier: "funding_source",
    label: TEXT.fundingSource,
  },
  {
    key: "education_delivery_form",
    classifier: "education_delivery_form",
    label: TEXT.educationDeliveryForm,
  },
  {
    key: "po_document_type",
    classifier: "document_type",
    label: TEXT.poDocumentType,
  },
  {
    key: "po_program_type",
    classifier: "po_program_type",
    label: TEXT.poProgramType,
  },
  {
    key: "po_qualification",
    classifier: "po_qualification",
    label: TEXT.poQualification,
  },
];


function formatError(error) {
  const detail = error?.payload?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((item) => (
        item?.msg
        || item?.message
        || `${item}`
      ))
      .join("; ");
  }

  const message = `${error?.message || ""}`.trim();

  return (
    message
    || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435 \u0424\u0420\u0414\u041e."
  );
}


export function FrdoPoContextForm({
  obligation,
  busy,
  onSave,
  onCancel,
}) {
  const context =
    obligation.frdo_context || {};

  const originalDocument =
    context.original_document_snapshot_json || {};

  const [form, setForm] = useState({
    document_status:
      context.document_status || "",
    loss_confirmation:
      context.loss_confirmation || "",
    exchange_confirmation:
      context.exchange_confirmation || "",
    destruction_confirmation:
      context.destruction_confirmation || "",
    study_form:
      context.study_form || "",
    funding_source:
      context.funding_source || "",
    education_delivery_form:
      context.education_delivery_form || "",
    po_document_type:
      context.po_document_type || "",
    po_program_type:
      context.po_program_type || "",
    po_profession:
      context.po_profession || "",
    po_qualification:
      context.po_qualification || "",
  });

  const [
    originalDocumentForm,
    setOriginalDocumentForm,
  ] = useState({
    document_type:
      originalDocument.document_type || "",
    document_series:
      originalDocument.document_series || "",
    document_number:
      originalDocument.document_number || "",
    registration_number:
      originalDocument.registration_number || "",
    issue_date:
      originalDocument.issue_date || "",
    recipient_last_name:
      originalDocument.recipient_last_name || "",
    recipient_first_name:
      originalDocument.recipient_first_name || "",
    recipient_middle_name:
      originalDocument.recipient_middle_name || "",
  });

  const [
    catalog,
    setCatalog,
  ] = useState(null);

  const [
    catalogLoading,
    setCatalogLoading,
  ] = useState(true);

  const [
    catalogError,
    setCatalogError,
  ] = useState("");

  const [
    professionOptions,
    setProfessionOptions,
  ] = useState([]);

  const [
    professionLoading,
    setProfessionLoading,
  ] = useState(false);

  const [
    professionError,
    setProfessionError,
  ] = useState("");

  const professionListId =
    `frdo-po-profession-options-${obligation.id}`;

  useEffect(() => {
    let active = true;

    setCatalogLoading(true);
    setCatalogError("");

    getAdminFrdoPoClassifierCatalog()
      .then((result) => {
        if (!active) {
          return;
        }

        setCatalog(
          result || {
            classifiers: {},
          }
        );
      })
      .catch((error) => {
        if (active) {
          setCatalogError(
            formatError(error)
          );
        }
      })
      .finally(() => {
        if (active) {
          setCatalogLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(
      () => {
        setProfessionLoading(true);
        setProfessionError("");

        searchAdminFrdoPoProfessions(
          form.po_profession,
          50
        )
          .then((result) => {
            if (!active) {
              return;
            }

            setProfessionOptions(
              Array.isArray(result?.values)
                ? result.values
                : []
            );
          })
          .catch((error) => {
            if (active) {
              setProfessionOptions([]);
              setProfessionError(
                formatError(error)
              );
            }
          })
          .finally(() => {
            if (active) {
              setProfessionLoading(false);
            }
          });
      },
      250
    );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    form.po_profession,
  ]);

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function classifierValues(name) {
    const values =
      catalog?.classifiers?.[name];

    return Array.isArray(values)
      ? values
      : [];
  }

  function updateOriginalDocument(
    key,
    value
  ) {
    setOriginalDocumentForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  const isDuplicate =
    form.document_status
    === FRDO_DOCUMENT_STATUS_DUPLICATE;

  async function submit(event) {
    event.preventDefault();

    const payload = Object.fromEntries(
      Object.entries(form).map(
        ([key, value]) => [
          key,
          `${value || ""}`.trim() || null,
        ]
      )
    );

    payload.original_document_snapshot_json = (
      isDuplicate
        ? Object.fromEntries(
            Object.entries(
              originalDocumentForm
            ).map(
              ([key, value]) => [
                key,
                `${value || ""}`.trim() || null,
              ]
            )
          )
        : null
    );

    await onSave(payload);
  }

  return (
    <form
      data-testid="admin-registries-frdo-po-context-form"
      onSubmit={submit}
      className="mt-4 rounded-2xl bg-slate-50 p-4"
    >
      <div>
        <div className="text-sm font-bold text-slate-900">
          {TEXT.title}
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {TEXT.description}
        </p>

        {catalog?.mapping_version ? (
          <div className="mt-2 text-[11px] text-slate-400">
            FRDO mapping: {catalog.mapping_version}
            {" \u00b7 "}
            {catalog.profession_count || 0}
            {" "}
            {"\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0439"}
          </div>
        ) : null}
      </div>

      {catalogLoading ? (
        <div
          data-testid="admin-registries-frdo-po-catalog-loading"
          className="mt-4 rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200"
        >
          {TEXT.loadingCatalog}
        </div>
      ) : null}

      {catalogError ? (
        <div
          data-testid="admin-registries-frdo-po-catalog-error"
          className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-100"
        >
          {catalogError}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {SELECT_FIELDS.map((field) => (
          <label
            key={field.key}
            className="grid gap-1.5 text-xs font-semibold text-slate-700"
          >
            <span>
              {field.label}
            </span>

            <select
              className={INPUT}
              value={form[field.key]}
              disabled={
                busy
                || catalogLoading
                || Boolean(catalogError)
              }
              onChange={(event) =>
                update(
                  field.key,
                  event.target.value
                )
              }
            >
              <option value="">
                {TEXT.choose}
              </option>

              {classifierValues(
                field.classifier
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))}

        <label className="grid gap-1.5 text-xs font-semibold text-slate-700 md:col-span-2">
          <span>
            {TEXT.poProfession}
          </span>

          <input
            className={INPUT}
            value={form.po_profession}
            list={professionListId}
            disabled={busy}
            autoComplete="off"
            onChange={(event) =>
              update(
                "po_profession",
                event.target.value
              )
            }
          />

          <datalist id={professionListId}>
            {professionOptions.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                />
              )
            )}
          </datalist>

          <span className="font-normal text-slate-500">
            {professionLoading
              ? TEXT.loadingProfessions
              : TEXT.professionHint}
          </span>

          {professionError ? (
            <span className="font-normal text-red-700">
              {professionError}
            </span>
          ) : null}
        </label>
      </div>

      {isDuplicate ? (
        <div
          data-testid="admin-registries-frdo-po-original-document"
          className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
        >
          <div className="text-sm font-bold text-slate-900">
            {TEXT.originalDocumentTitle}
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {TEXT.originalDocumentHint}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {TEXT.originalDocumentType}
              </span>

              <select
                className={INPUT}
                value={originalDocumentForm.document_type}
                disabled={
                  busy
                  || catalogLoading
                  || Boolean(catalogError)
                }
                onChange={(event) =>
                  updateOriginalDocument(
                    "document_type",
                    event.target.value
                  )
                }
              >
                <option value="">
                  {TEXT.choose}
                </option>

                {classifierValues(
                  "document_type"
                ).map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {TEXT.originalSeries}
              </span>

              <input
                className={INPUT}
                maxLength={20}
                value={originalDocumentForm.document_series}
                disabled={busy}
                onChange={(event) =>
                  updateOriginalDocument(
                    "document_series",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {TEXT.originalNumber}
              </span>

              <input
                className={INPUT}
                maxLength={20}
                inputMode="numeric"
                value={originalDocumentForm.document_number}
                disabled={busy}
                onChange={(event) =>
                  updateOriginalDocument(
                    "document_number",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {TEXT.originalRegistrationNumber}
              </span>

              <input
                className={INPUT}
                maxLength={20}
                value={originalDocumentForm.registration_number}
                disabled={busy}
                onChange={(event) =>
                  updateOriginalDocument(
                    "registration_number",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {TEXT.originalIssueDate}
              </span>

              <input
                type="date"
                className={INPUT}
                value={originalDocumentForm.issue_date}
                disabled={busy}
                onChange={(event) =>
                  updateOriginalDocument(
                    "issue_date",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {TEXT.originalLastName}
              </span>

              <input
                className={INPUT}
                maxLength={50}
                value={originalDocumentForm.recipient_last_name}
                disabled={busy}
                onChange={(event) =>
                  updateOriginalDocument(
                    "recipient_last_name",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {TEXT.originalFirstName}
              </span>

              <input
                className={INPUT}
                maxLength={50}
                value={originalDocumentForm.recipient_first_name}
                disabled={busy}
                onChange={(event) =>
                  updateOriginalDocument(
                    "recipient_first_name",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              <span>
                {TEXT.originalMiddleName}
              </span>

              <input
                className={INPUT}
                maxLength={50}
                value={originalDocumentForm.recipient_middle_name}
                disabled={busy}
                onChange={(event) =>
                  updateOriginalDocument(
                    "recipient_middle_name",
                    event.target.value
                  )
                }
              />

              <span className="font-normal text-slate-500">
                {TEXT.originalMiddleNameHint}
              </span>
            </label>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className={BLUE}
          disabled={
            busy
            || catalogLoading
            || Boolean(catalogError)
          }
        >
          {TEXT.save}
        </button>

        <button
          type="button"
          className={SECONDARY}
          onClick={onCancel}
          disabled={busy}
        >
          {TEXT.cancel}
        </button>
      </div>
    </form>
  );
}
