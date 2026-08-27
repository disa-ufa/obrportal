function getSafeExternalHref(value) {
  const raw = `${value || ""}`.trim();

  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);

    if (
      parsed.protocol !== "http:"
      && parsed.protocol !== "https:"
    ) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}


export function LessonAssignmentView({
  block,
  loading = false,
  statusLabel = "\u041d\u0435 \u043d\u0430\u0447\u0430\u0442\u043e",
  statusTone = "bg-slate-50 text-slate-700 ring-slate-200",
  testId,
  statusTestId,
  children,
}) {
  const content = block?.content_json || {};

  const description = `${
    content.description
    || content.text
    || content.body
    || ""
  }`.trim();

  const due = `${
    content.due
    || content.deadline
    || ""
  }`.trim();

  const expectedResult = `${
    content.expected_result
    || content.expectedResult
    || content.result
    || ""
  }`.trim();

  const submissionFormat = `${
    content.submission_format
    || content.submissionFormat
    || content.format
    || ""
  }`.trim();

  const criteria = `${
    content.criteria
    || content.checklist
    || content.evaluation_criteria
    || ""
  }`.trim();

  const estimatedMinutes = Number(
    content.estimated_minutes
    || content.estimatedMinutes
    || 0
  );

  const estimatedTimeText = (
    Number.isFinite(estimatedMinutes)
    && estimatedMinutes > 0
  )
    ? `${Math.round(estimatedMinutes)} \u043c\u0438\u043d.`
    : "";

  const materialHref = getSafeExternalHref(
    content.url
    || content.file_url
    || content.material_url
    || ""
  );

  const detailItems = [
    due
      ? ["\u0421\u0440\u043e\u043a", due]
      : null,
    expectedResult
      ? ["\u041e\u0436\u0438\u0434\u0430\u0435\u043c\u044b\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442", expectedResult]
      : null,
    submissionFormat
      ? ["\u0424\u043e\u0440\u043c\u0430\u0442 \u043e\u0442\u0432\u0435\u0442\u0430", submissionFormat]
      : null,
    criteria
      ? ["\u041a\u0440\u0438\u0442\u0435\u0440\u0438\u0438", criteria]
      : null,
    estimatedTimeText
      ? ["\u041e\u0440\u0438\u0435\u043d\u0442\u0438\u0440\u043e\u0432\u043e\u0447\u043d\u043e\u0435 \u0432\u0440\u0435\u043c\u044f", estimatedTimeText]
      : null,
  ].filter(Boolean);

  return (
    <section
      data-testid={testId}
      className="rounded-2xl bg-red-50/70 p-5 ring-1 ring-red-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-red-950">
            {block?.title || "\u041f\u0440\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u0435"}
          </div>

          <div className="mt-1 text-xs font-semibold text-red-700">
            {"\u0421\u0442\u0430\u0442\u0443\u0441:"} {loading ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430..." : statusLabel}
          </div>
        </div>

        <span
          data-testid={statusTestId}
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone}`}
        >
          {loading ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430..." : statusLabel}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-slate-800 ring-1 ring-red-100">
        <div className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
          {"\u0418\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u044f"}
        </div>

        <div className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-7">
          {description || "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043e."}
        </div>
      </div>

      {detailItems.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {detailItems.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl bg-white/80 p-4 text-slate-800 ring-1 ring-red-100"
            >
              <div className="text-xs font-black uppercase tracking-[0.12em] text-red-700">
                {label}
              </div>

              <div className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6">
                {value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {materialHref ? (
        <a
          data-testid="learner-assignment-material-link"
          href={materialHref}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50"
        >
          {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b"}
        </a>
      ) : null}

      {children}
    </section>
  );
}
