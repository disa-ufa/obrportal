import { useEffect, useMemo, useState } from "react";
import {
  getAdminLearnerImportDetail,
  getAdminLearnerImports,
  uploadAdminLearnerImport,
} from "../api/client";

function formatDateTime(value) {
  if (!value) {
    return "?";
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusTone(status) {
  if (status === "parsed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "failed" || status === "invalid") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (status === "processing") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusTone(status)}`}>
      {status || "unknown"}
    </span>
  );
}

function SummaryCard({ label, value, tone = "slate" }) {
  const toneClass = {
    slate: "bg-white text-slate-900 ring-slate-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    red: "bg-rose-50 text-rose-800 ring-rose-200",
    blue: "bg-blue-50 text-blue-800 ring-blue-200",
  }[tone] || "bg-white text-slate-900 ring-slate-200";

  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function safeJsonPreview(value) {
  if (!value || typeof value !== "object") {
    return "?";
  }

  const entries = Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && `${item}`.trim() !== "")
    .slice(0, 4);

  if (!entries.length) {
    return "?";
  }

  return entries.map(([key, item]) => `${key}: ${item}`).join("; ");
}

export function LearnerImportsPage() {
  const [imports, setImports] = useState([]);
  const [selectedImport, setSelectedImport] = useState(null);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("parsed");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedRows = selectedImport?.rows || [];

  const totals = useMemo(() => {
    return imports.reduce(
      (acc, item) => {
        acc.totalRows += item.total_rows || 0;
        acc.validRows += item.valid_rows || 0;
        acc.invalidRows += item.invalid_rows || 0;
        return acc;
      },
      { totalRows: 0, validRows: 0, invalidRows: 0 }
    );
  }, [imports]);

  async function loadImports(overrides = {}) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminLearnerImports({
        q: overrides.q ?? query,
        status: overrides.status ?? statusFilter,
        limit: 100,
      });
      setImports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "?? ??????? ????????? ??????? ??????????.");
    } finally {
      setLoading(false);
    }
  }

  async function openImport(batchId) {
    if (!batchId) {
      return;
    }

    setSelectedImportId(batchId);
    setDetailLoading(true);
    setError("");

    try {
      const detail = await getAdminLearnerImportDetail(batchId);
      setSelectedImport(detail);
    } catch (err) {
      setError(err.message || "?? ??????? ??????? ??????.");
      setSelectedImport(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("???????? CSV ??? XLSX ???? ??? ???????.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const created = await uploadAdminLearnerImport(file, { notes });
      setNotice(`?????? ????????: ${created.valid_rows} ???????? ?????, ${created.invalid_rows} ????? ? ????????.`);
      setFile(null);
      setNotes("");
      await loadImports();
      await openImport(created.id);
    } catch (err) {
      setError(err.message || "?? ??????? ????????? ??????.");
    } finally {
      setUploading(false);
    }
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    loadImports();
  }

  useEffect(() => {
    loadImports();
  }, []);

  return (
    <div className="space-y-6" data-testid="admin-learner-imports-page">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">??????? / ?????? ??????????</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">?????? ??????????</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              ????????? CSV ??? XLSX ????, ????????? ???????????? ?????? ? ?????? ????? ????????? ????????, ?????????? ? ??????????.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadImports()}
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "?????????..." : "???????? ??????"}
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
            {notice}
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="??????" value={imports.length} tone="blue" />
        <SummaryCard label="???????? ?????" value={totals.validRows} tone="green" />
        <SummaryCard label="????? ? ????????" value={totals.invalidRows} tone="red" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-6">
          <form onSubmit={handleUpload} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-black text-slate-950">????????? ????</h2>
            <p className="mt-1 text-sm text-slate-600">
              ?????????????? .csv ? .xlsx. ?? ???? ???? ?????? ?????? ??????????? ? ??????????? ??? batch ???????.
            </p>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              ???? ???????
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              ??????????
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="????????: ?????? ????, ?????? ???? 2026"
                className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </label>

            <button
              type="submit"
              disabled={uploading}
              className="mt-5 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "?????????..." : "????????? ? ?????????"}
            </button>
          </form>

          <form onSubmit={handleApplyFilters} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-black text-slate-950">???????</h2>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              ?????
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="???? ??? ??????????"
                className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              ??????
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">???</option>
                <option value="parsed">parsed</option>
                <option value="draft">draft</option>
                <option value="processing">processing</option>
                <option value="failed">failed</option>
              </select>
            </label>

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              ?????????
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">??????? ????????</h2>
                <p className="mt-1 text-sm text-slate-600">????????? ??????????? ????? ? ?????? ???????? ?????.</p>
              </div>
              {loading ? <span className="text-sm text-slate-500">????????...</span> : null}
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">????</th>
                    <th className="px-4 py-3">??????</th>
                    <th className="px-4 py-3">??????</th>
                    <th className="px-4 py-3">??????</th>
                    <th className="px-4 py-3">????</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {imports.length ? imports.map((item) => (
                    <tr key={item.id} className={selectedImportId === item.id ? "bg-blue-50/60" : ""}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.source_filename || "??? ?????"}</div>
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-500">{item.notes || "?"}</div>
                      </td>
                      <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="font-semibold">{item.valid_rows}</span> / {item.total_rows}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.invalid_rows}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(item.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openImport(item.id)}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                        >
                          ???????
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        ??????? ???? ?? ???????.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">?????? ???????</h2>
                <p className="mt-1 text-sm text-slate-600">
                  ???????? ?????? ? ???????, ????? ?????????? ???????????? ?????? ? ??????.
                </p>
              </div>
              {detailLoading ? <span className="text-sm text-slate-500">????????...</span> : null}
            </div>

            {selectedImport ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <SummaryCard label="?????" value={selectedImport.total_rows} />
                  <SummaryCard label="????????" value={selectedImport.valid_rows} tone="green" />
                  <SummaryCard label="? ????????" value={selectedImport.invalid_rows} tone="red" />
                  <SummaryCard label="??????" value={selectedImport.status} tone="blue" />
                </div>

                <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">?</th>
                        <th className="px-4 py-3">??????</th>
                        <th className="px-4 py-3">??????</th>
                        <th className="px-4 py-3">??????</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 font-semibold text-slate-700">{row.row_number}</td>
                          <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                          <td className="px-4 py-3 text-slate-700">{safeJsonPreview(row.normalized_data_json)}</td>
                          <td className="px-4 py-3">
                            {row.validation_errors_json?.length ? (
                              <ul className="list-disc space-y-1 pl-5 text-rose-700">
                                {row.validation_errors_json.map((item) => <li key={item}>{item}</li>)}
                              </ul>
                            ) : (
                              <span className="text-slate-400">?</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-200">
                ?????? ??????? ?? ???????.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
