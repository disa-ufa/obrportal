import { useCallback, useEffect, useMemo, useState } from "react";

import {
  approveAdminFrdoObligation,
  approveAdminMintrudObligation,
  downloadAdminFrdoSubmissionAttempt,
  downloadAdminMintrudSubmissionAttempt,
  getAdminFrdoObligations,
  getAdminFrdoSubmissionAttempts,
  getAdminMintrudObligations,
  getAdminMintrudSubmissionAttempts,
  markAdminFrdoSubmissionAttemptSubmitted,
  markAdminMintrudSubmissionAttemptSubmitted,
  recordAdminFrdoSubmissionAttemptResult,
  recordAdminMintrudSubmissionAttemptResult,
  updateAdminMintrudObligationContext,
  validateAdminFrdoObligation,
  validateAdminMintrudObligation,
} from "../api/client";
import { StatusBadge } from "../components/ui/StatusBadge";


const T = {
  title: "\u0413\u043e\u0441\u0440\u0435\u0435\u0441\u0442\u0440\u044b",
  subtitle: "\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432 \u0424\u0418\u0421 \u0424\u0420\u0414\u041e \u0438 \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430.",
  frdo: "\u0424\u0418\u0421 \u0424\u0420\u0414\u041e",
  mintrud: "\u041c\u0438\u043d\u0442\u0440\u0443\u0434",
  refresh: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
  loading: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c...",
  search: "\u041f\u043e\u0438\u0441\u043a",
  allStatuses: "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044b",
  apply: "\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c",
  reset: "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c",
  validate: "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c",
  approve: "\u0423\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c",
  attempts: "\u041f\u043e\u043f\u044b\u0442\u043a\u0438",
  context: "\u0414\u0430\u043d\u043d\u044b\u0435 \u041c\u0438\u043d\u0442\u0440\u0443\u0434\u0430",
  save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
  cancel: "\u041e\u0442\u043c\u0435\u043d\u0430",
  download: "\u0421\u043a\u0430\u0447\u0430\u0442\u044c",
  submitted: "\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0443",
  result: "\u0424\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442",
  noRows: "\u0417\u0430\u043f\u0438\u0441\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
  warning: "\u0413\u0435\u043d\u0435\u0440\u0430\u0446\u0438\u044f XML/\u0444\u0430\u0439\u043b\u0430 \u043f\u043e\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430: \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u0430\u044f \u043e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u0430\u044f \u0441\u0445\u0435\u043c\u0430.",
};


const STATUS_LABELS = {
  pending_data: "\u041d\u0443\u0436\u043d\u044b \u0434\u0430\u043d\u043d\u044b\u0435",
  ready: "\u0413\u043e\u0442\u043e\u0432\u043e",
  needs_approval: "\u041d\u0443\u0436\u043d\u043e \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435",
  approved: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e",
  exported: "\u0424\u0430\u0439\u043b \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d",
  submitted: "\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e",
  accepted: "\u041f\u0440\u0438\u043d\u044f\u0442\u043e",
  rejected: "\u041e\u0442\u043a\u043b\u043e\u043d\u0435\u043d\u043e",
  correction_required: "\u041d\u0443\u0436\u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

const BUTTON =
  "inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY =
  `${BUTTON} bg-slate-900 text-white hover:bg-slate-700`;

const BLUE =
  `${BUTTON} bg-blue-600 text-white hover:bg-blue-500`;

const SECONDARY =
  `${BUTTON} bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50`;

const INPUT =
  "min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";


function statusTone(status) {
  if (status === "accepted" || status === "ready") {
    return "green";
  }

  if (
    status === "rejected"
    || status === "correction_required"
  ) {
    return "red";
  }

  if (
    status === "pending_data"
    || status === "needs_approval"
  ) {
    return "amber";
  }

  if (
    status === "approved"
    || status === "exported"
    || status === "submitted"
  ) {
    return "blue";
  }

  return "gray";
}


function statusLabel(status) {
  return STATUS_LABELS[status] || status || "\u2014";
}


function formatApiError(error) {
  const detail = error?.payload?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || JSON.stringify(item))
      .join("; ");
  }

  return error?.message || "Request failed";
}


function MintrudContextForm({
  obligation,
  busy,
  onSave,
  onCancel,
}) {
  const context = obligation.mintrud_context || {};

  const [form, setForm] = useState({
    reporting_scenario: context.reporting_scenario || "",
    profession_or_position: context.profession_or_position || "",
    employer_name: context.employer_name || "",
    employer_inn: context.employer_inn || "",
    knowledge_check_result: context.knowledge_check_result || "",
    knowledge_check_date: context.knowledge_check_date || "",
    protocol_number: context.protocol_number || "",
  });

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        value.trim() || null,
      ])
    );

    await onSave(payload);
  }

  return (
    <form
      data-testid="admin-registries-mintrud-context-form"
      onSubmit={submit}
      className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2"
    >
      <select
        className={INPUT}
        value={form.reporting_scenario}
        onChange={(event) => update("reporting_scenario", event.target.value)}
      >
        <option value="">reporting_scenario</option>
        <option value="external_training_provider">external_training_provider</option>
        <option value="employer_self_training">employer_self_training</option>
      </select>

      <input
        className={INPUT}
        value={form.profession_or_position}
        placeholder="profession_or_position"
        onChange={(event) => update("profession_or_position", event.target.value)}
      />

      <input
        className={INPUT}
        value={form.employer_name}
        placeholder="employer_name"
        onChange={(event) => update("employer_name", event.target.value)}
      />

      <input
        className={INPUT}
        value={form.employer_inn}
        placeholder="employer_inn"
        onChange={(event) => update("employer_inn", event.target.value)}
      />

      <select
        className={INPUT}
        value={form.knowledge_check_result}
        onChange={(event) => update("knowledge_check_result", event.target.value)}
      >
        <option value="">knowledge_check_result</option>
        <option value="satisfactory">satisfactory</option>
        <option value="unsatisfactory">unsatisfactory</option>
      </select>

      <input
        type="date"
        className={INPUT}
        value={form.knowledge_check_date}
        onChange={(event) => update("knowledge_check_date", event.target.value)}
      />

      <input
        className={INPUT}
        value={form.protocol_number}
        placeholder="protocol_number"
        onChange={(event) => update("protocol_number", event.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className={BLUE}
          disabled={busy}
        >
          {T.save}
        </button>

        <button
          type="button"
          className={SECONDARY}
          onClick={onCancel}
          disabled={busy}
        >
          {T.cancel}
        </button>
      </div>
    </form>
  );
}


function AttemptList({
  registry,
  obligation,
  attempts,
  busy,
  onDownload,
  onSubmitted,
  onResult,
}) {
  return (
    <div
      data-testid="admin-registries-attempts"
      className="mt-4 grid gap-3"
    >
      {!attempts.length ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          No export attempts yet.
        </div>
      ) : null}

      {attempts.map((attempt) => (
        <div
          key={attempt.id}
          data-testid="admin-registry-attempt"
          className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900">
                #{attempt.attempt_no} / {attempt.transport}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                schema: {attempt.schema_version || "\u2014"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={attempt.has_artifact ? "green" : "gray"}>
                {attempt.has_artifact ? "artifact" : "no artifact"}
              </StatusBadge>

              {attempt.result_status ? (
                <StatusBadge tone={statusTone(attempt.result_status)}>
                  {statusLabel(attempt.result_status)}
                </StatusBadge>
              ) : null}
            </div>
          </div>

          <div className="mt-3 break-all text-xs text-slate-500">
            SHA-256: {attempt.artifact_sha256 || "\u2014"}
          </div>

          <div className="mt-3 text-xs text-slate-500">
            external_reference: {attempt.external_reference || "\u2014"}
          </div>

          {attempt.errors_json?.length ? (
            <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              {attempt.errors_json.join("; ")}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {attempt.has_artifact ? (
              <button
                type="button"
                className={SECONDARY}
                disabled={busy}
                onClick={() => onDownload(attempt)}
              >
                {T.download}
              </button>
            ) : null}

            {attempt.has_artifact && !attempt.submitted_at ? (
              <button
                type="button"
                className={BLUE}
                disabled={busy}
                onClick={() => onSubmitted(attempt)}
              >
                {T.submitted}
              </button>
            ) : null}

            {attempt.submitted_at && !attempt.result_status ? (
              <button
                type="button"
                className={PRIMARY}
                disabled={busy}
                onClick={() => onResult(attempt)}
              >
                {T.result}
              </button>
            ) : null}
          </div>

          <div className="mt-3 text-[11px] text-slate-400">
            {registry} / {obligation.id} / {attempt.id}
          </div>
        </div>
      ))}
    </div>
  );
}


export function AdminRegistriesPage() {
  const [activeRegistry, setActiveRegistry] = useState("frdo");

  const [filters, setFilters] = useState({
    q: "",
    status: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    q: "",
    status: "",
  });

  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

  const [expandedId, setExpandedId] = useState("");
  const [editingContextId, setEditingContextId] = useState("");
  const [attemptsById, setAttemptsById] = useState({});

  const api = useMemo(() => {
    if (activeRegistry === "mintrud") {
      return {
        list: getAdminMintrudObligations,
        validate: validateAdminMintrudObligation,
        approve: approveAdminMintrudObligation,
        attempts: getAdminMintrudSubmissionAttempts,
        download: downloadAdminMintrudSubmissionAttempt,
        submitted: markAdminMintrudSubmissionAttemptSubmitted,
        result: recordAdminMintrudSubmissionAttemptResult,
      };
    }

    return {
      list: getAdminFrdoObligations,
      validate: validateAdminFrdoObligation,
      approve: approveAdminFrdoObligation,
      attempts: getAdminFrdoSubmissionAttempts,
      download: downloadAdminFrdoSubmissionAttempt,
      submitted: markAdminFrdoSubmissionAttemptSubmitted,
      result: recordAdminFrdoSubmissionAttemptResult,
    };
  }, [activeRegistry]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await api.list({
        q: appliedFilters.q,
        status: appliedFilters.status,
        limit: 100,
      });

      setObligations(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [
    api,
    appliedFilters.q,
    appliedFilters.status,
  ]);

  useEffect(() => {
    setExpandedId("");
    setEditingContextId("");
    setAttemptsById({});
    load();
  }, [
    activeRegistry,
    load,
  ]);

  async function withAction(key, callback) {
    setBusyKey(key);
    setError("");

    try {
      await callback();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusyKey("");
    }
  }

  async function reloadAttempts(obligationId) {
    const attempts = await api.attempts(
      obligationId
    );

    setAttemptsById((current) => ({
      ...current,
      [obligationId]:
        Array.isArray(attempts)
          ? attempts
          : [],
    }));
  }

  async function toggleAttempts(obligation) {
    if (expandedId === obligation.id) {
      setExpandedId("");
      return;
    }

    setExpandedId(obligation.id);

    await withAction(
      `attempts:${obligation.id}`,
      () => reloadAttempts(
        obligation.id
      )
    );
  }

  async function validate(obligation) {
    await withAction(
      `validate:${obligation.id}`,
      async () => {
        await api.validate(
          obligation.id
        );

        await load();
      }
    );
  }

  async function approve(obligation) {
    await withAction(
      `approve:${obligation.id}`,
      async () => {
        await api.approve(
          obligation.id
        );

        await load();
      }
    );
  }

  async function saveContext(
    obligation,
    payload
  ) {
    await withAction(
      `context:${obligation.id}`,
      async () => {
        await updateAdminMintrudObligationContext(
          obligation.id,
          payload
        );

        setEditingContextId("");
        await load();
      }
    );
  }

  async function download(
    obligation,
    attempt
  ) {
    await withAction(
      `download:${attempt.id}`,
      () => api.download(
        obligation.id,
        attempt.id
      )
    );
  }

  async function markSubmitted(
    obligation,
    attempt
  ) {
    const reference = window.prompt(
      "external_reference",
      attempt.external_reference || ""
    );

    if (reference === null) {
      return;
    }

    await withAction(
      `submitted:${attempt.id}`,
      async () => {
        await api.submitted(
          obligation.id,
          attempt.id,
          {
            external_reference:
              reference.trim() || null,
          }
        );

        await load();
        await reloadAttempts(
          obligation.id
        );
      }
    );
  }

  async function recordResult(
    obligation,
    attempt
  ) {
    const resultStatus = window.prompt(
      "result_status: accepted / rejected / correction_required",
      "accepted"
    );

    if (!resultStatus) {
      return;
    }

    const normalized = resultStatus.trim();

    if (
      ![
        "accepted",
        "rejected",
        "correction_required",
      ].includes(normalized)
    ) {
      setError(
        "Unsupported result_status"
      );
      return;
    }

    let externalId = null;
    let errors = [];

    if (normalized === "accepted") {
      const value = window.prompt(
        "external_id",
        ""
      );

      if (value === null) {
        return;
      }

      externalId =
        value.trim() || null;
    } else {
      const value = window.prompt(
        "errors (one per line)",
        ""
      );

      if (value === null) {
        return;
      }

      errors = value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    await withAction(
      `result:${attempt.id}`,
      async () => {
        await api.result(
          obligation.id,
          attempt.id,
          {
            result_status: normalized,
            external_id: externalId,
            errors,
          }
        );

        await load();
        await reloadAttempts(
          obligation.id
        );
      }
    );
  }

  return (
    <div
      data-testid="admin-registries-page"
      className="space-y-5"
    >
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-950">
              {T.title}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {T.subtitle}
            </p>
          </div>

          <button
            type="button"
            className={SECONDARY}
            onClick={load}
            disabled={loading}
          >
            {loading
              ? T.loading
              : T.refresh}
          </button>
        </div>

        <div
          data-testid="admin-registries-tabs"
          className="mt-5 flex flex-wrap gap-2"
        >
          <button
            type="button"
            data-testid="admin-registries-tab-frdo"
            className={
              activeRegistry === "frdo"
                ? BLUE
                : SECONDARY
            }
            onClick={() => setActiveRegistry("frdo")}
          >
            {T.frdo}
          </button>

          <button
            type="button"
            data-testid="admin-registries-tab-mintrud"
            className={
              activeRegistry === "mintrud"
                ? BLUE
                : SECONDARY
            }
            onClick={() => setActiveRegistry("mintrud")}
          >
            {T.mintrud}
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          {T.warning}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <form
          data-testid="admin-registries-filters"
          className="grid gap-3 md:grid-cols-[1fr_260px_auto]"
          onSubmit={(event) => {
            event.preventDefault();

            setAppliedFilters({
              q: filters.q.trim(),
              status: filters.status,
            });
          }}
        >
          <input
            className={INPUT}
            value={filters.q}
            placeholder={T.search}
            onChange={(event) => (
              setFilters((current) => ({
                ...current,
                q: event.target.value,
              }))
            )}
          />

          <select
            className={INPUT}
            value={filters.status}
            onChange={(event) => (
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            )}
          >
            <option value="">
              {T.allStatuses}
            </option>

            {STATUS_OPTIONS.map((status) => (
              <option
                key={status}
                value={status}
              >
                {statusLabel(status)}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={PRIMARY}
            >
              {T.apply}
            </button>

            <button
              type="button"
              className={SECONDARY}
              onClick={() => {
                setFilters({
                  q: "",
                  status: "",
                });

                setAppliedFilters({
                  q: "",
                  status: "",
                });
              }}
            >
              {T.reset}
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <div
          data-testid="admin-registries-error"
          className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200"
        >
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table
            data-testid="admin-registries-table"
            className="min-w-[1050px] w-full text-left text-sm"
          >
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Readiness</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-500"
                  >
                    {T.loading}
                  </td>
                </tr>
              ) : null}

              {!loading && obligations.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-500"
                  >
                    {T.noRows}
                  </td>
                </tr>
              ) : null}

              {!loading
                ? obligations.map((obligation) => {
                    const attempts =
                      attemptsById[obligation.id] || [];

                    const canValidate = [
                      "pending_data",
                      "ready",
                      "needs_approval",
                    ].includes(
                      obligation.status
                    );

                    const canApprove = [
                      "ready",
                      "needs_approval",
                    ].includes(
                      obligation.status
                    );

                    const readiness = (
                      obligation.readiness_errors
                      || []
                    )
                      .map((item) => (
                        item.message
                        || item.code
                        || JSON.stringify(item)
                      ))
                      .join("; ");

                    return (
                      <tr
                        key={obligation.id}
                        className="align-top"
                      >
                        <td
                          colSpan={6}
                          className="p-0"
                        >
                          <div className="grid min-w-[1050px] grid-cols-[1.1fr_1.3fr_1fr_0.9fr_1.5fr_1.7fr]">
                            <div className="px-4 py-4">
                              <div className="font-semibold text-slate-900">
                                {obligation.user_full_name || "\u2014"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {obligation.user_email}
                              </div>
                            </div>

                            <div className="px-4 py-4">
                              <div className="font-medium text-slate-900">
                                {obligation.course_title}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {obligation.regulatory_program_type}
                              </div>
                            </div>

                            <div className="px-4 py-4">
                              <div className="font-medium text-slate-900">
                                {obligation.document_number || "\u2014"}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {obligation.document_type || "\u2014"}
                              </div>
                            </div>

                            <div className="px-4 py-4">
                              <StatusBadge tone={statusTone(obligation.status)}>
                                {statusLabel(obligation.status)}
                              </StatusBadge>
                            </div>

                            <div className="px-4 py-4 text-xs leading-5 text-slate-600">
                              {readiness || "OK"}

                              {obligation.last_error ? (
                                <div className="mt-2 text-red-700">
                                  {obligation.last_error}
                                </div>
                              ) : null}
                            </div>

                            <div className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {canValidate ? (
                                  <button
                                    type="button"
                                    className={SECONDARY}
                                    disabled={Boolean(busyKey)}
                                    onClick={() => validate(obligation)}
                                  >
                                    {T.validate}
                                  </button>
                                ) : null}

                                {canApprove ? (
                                  <button
                                    type="button"
                                    className={BLUE}
                                    disabled={Boolean(busyKey)}
                                    onClick={() => approve(obligation)}
                                  >
                                    {T.approve}
                                  </button>
                                ) : null}

                                {activeRegistry === "mintrud"
                                  && canValidate ? (
                                    <button
                                      type="button"
                                      className={SECONDARY}
                                      disabled={Boolean(busyKey)}
                                      onClick={() => (
                                        setEditingContextId(
                                          editingContextId === obligation.id
                                            ? ""
                                            : obligation.id
                                        )
                                      )}
                                    >
                                      {T.context}
                                    </button>
                                  ) : null}

                                <button
                                  type="button"
                                  className={SECONDARY}
                                  disabled={Boolean(busyKey)}
                                  onClick={() => toggleAttempts(obligation)}
                                >
                                  {T.attempts}
                                </button>
                              </div>
                            </div>
                          </div>

                          {activeRegistry === "mintrud"
                            && editingContextId === obligation.id ? (
                              <div className="border-t border-slate-100 px-4 pb-4">
                                <MintrudContextForm
                                  obligation={obligation}
                                  busy={Boolean(busyKey)}
                                  onCancel={() => setEditingContextId("")}
                                  onSave={(payload) => saveContext(
                                    obligation,
                                    payload
                                  )}
                                />
                              </div>
                            ) : null}

                          {expandedId === obligation.id ? (
                            <div className="border-t border-slate-100 p-4">
                              <AttemptList
                                registry={activeRegistry}
                                obligation={obligation}
                                attempts={attempts}
                                busy={Boolean(busyKey)}
                                onDownload={(attempt) => download(
                                  obligation,
                                  attempt
                                )}
                                onSubmitted={(attempt) => markSubmitted(
                                  obligation,
                                  attempt
                                )}
                                onResult={(attempt) => recordResult(
                                  obligation,
                                  attempt
                                )}
                              />
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
