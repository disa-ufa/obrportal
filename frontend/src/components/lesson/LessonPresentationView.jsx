function getPresentationLinkProps(value) {
  const href = `${value || ""}`.trim();

  if (
    href.startsWith("/")
    || href.startsWith("#")
  ) {
    return {};
  }

  return {
    target: "_blank",
    rel: "noreferrer",
  };
}


export default function LessonPresentationView({
  title = "",
  filename = "",
  sourceUrl = "",
  rawSource = "",
  downloadUrl = "",
  showDownload = true,
  conversionStatus = "",
}) {
  const ready = Boolean(sourceUrl);

  const resolvedTitle =
    `${title || filename || "Презентация"}`.trim()
    || "Презентация";

  const openLinkProps =
    getPresentationLinkProps(sourceUrl);

  const downloadLinkProps =
    getPresentationLinkProps(downloadUrl);

  return (
    <section
      data-testid="learner-content-presentation"
      data-presentation-view="lesson-presentation"
      className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <div>
        <div className="text-base font-black text-slate-950">
          {resolvedTitle}
        </div>

        <div className="mt-1 text-sm font-semibold text-slate-600">
          {ready
            ? "Презентация для просмотра в браузере"
            : "Презентация не настроена"}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
        {ready ? (
          <iframe
            data-testid="learner-content-presentation-viewer"
            title={resolvedTitle}
            src={sourceUrl}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-[760px] w-full bg-white"
          />
        ) : (
          <div
            data-testid="learner-content-presentation-unavailable"
            className="flex min-h-[320px] flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-slate-50 p-8 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-sm font-black text-amber-800 ring-1 ring-amber-200">
              PPT
            </div>

            <div className="mt-4 text-base font-black text-slate-950">
              {"Презентация недоступна"}
            </div>

            <div className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {rawSource
                ? "Ссылка на презентацию имеет неподдерживаемый формат."
                : conversionStatus && conversionStatus !== "ready"
                  ? "Презентация ещё не готова к просмотру."
                  : "Презентация временно недоступна."}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
          {ready ? (
            <a
              data-testid="learner-content-presentation-open"
              href={sourceUrl}
              {...openLinkProps}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
            >
              {"Открыть на весь экран"}
            </a>
          ) : null}

          {ready && showDownload && downloadUrl ? (
            <a
              data-testid="learner-content-presentation-download"
              href={downloadUrl}
              {...downloadLinkProps}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              {"Скачать"}
            </a>
          ) : null}
      </div>
    </section>
  );
}
