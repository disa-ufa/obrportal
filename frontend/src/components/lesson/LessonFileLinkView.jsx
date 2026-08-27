export default function LessonFileLinkView({
  title = "",
  description = "",
  openUrl = "",
  rawSource = "",
  openInNewTab = true,
}) {
  const resolvedTitle =
    `${title || "Файл или ссылка"}`.trim()
    || "Файл или ссылка";

  const resolvedDescription =
    `${description || ""}`.trim();

  const ready = Boolean(openUrl);

  const hasRawSource =
    Boolean(`${rawSource || ""}`.trim());

  const target =
    ready && openInNewTab
      ? "_blank"
      : undefined;

  const rel =
    ready && openInNewTab
      ? "noreferrer"
      : undefined;

  return (
    <section
      data-testid="learner-content-file-link"
      data-presentation-view="lesson-file-link"
      className="mt-5"
    >
      <div className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-lg font-black text-violet-700 ring-1 ring-violet-100"
          >
            {"↗"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-600">
              {"Материал"}
            </div>

            <h3 className="mt-1 text-xl font-black leading-tight text-slate-950">
              {resolvedTitle}
            </h3>

            {resolvedDescription ? (
              <div
                data-testid="learner-content-file-link-description"
                className="mt-3 whitespace-pre-wrap break-words text-base font-medium leading-7 text-slate-700 sm:text-lg sm:leading-8"
              >
                {resolvedDescription}
              </div>
            ) : null}

            {ready ? (
              <div className="mt-3 text-sm font-medium leading-6 text-slate-500">
                {"Материал откроется отдельно. Убедитесь, что у вас есть доступ к ресурсу."}
              </div>
            ) : null}
          </div>
        </div>

        {ready ? (
          <div className="mt-5 flex justify-end">
            <a
              data-testid="learner-content-file-link-open"
              href={openUrl}
              target={target}
              rel={rel}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
            >
              <span>
                {"Открыть материал"}
              </span>
              <span aria-hidden="true">
                {"↗"}
              </span>
            </a>
          </div>
        ) : hasRawSource ? (
          <div
            data-testid="learner-content-file-link-unsafe-url"
            className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200"
          >
            {"Ссылка на материал имеет неподдерживаемый формат."}
          </div>
        ) : (
          <div
            data-testid="learner-content-file-link-unavailable"
            className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-200"
          >
            {"Материал пока не добавлен."}
          </div>
        )}
      </div>
    </section>
  );
}
