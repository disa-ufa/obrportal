export default function LessonVideoView({
  title = "",
  embedUrl = "",
  allowFullscreen = true,
  description = "",
  openUrl = "",
  rawSource = "",
}) {
  const resolvedTitle =
    `${title || "Видеоматериал"}`.trim()
    || "Видеоматериал";

  const resolvedDescription =
    `${description || ""}`.trim();

  const ready = Boolean(embedUrl);

  const hasRawSource =
    Boolean(`${rawSource || ""}`.trim());

  return (
    <section
      data-testid="learner-content-video"
      data-presentation-view="lesson-video"
      className="mt-5"
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100"
        >
          {"▶"}
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
            {"Видео"}
          </div>

          <div className="mt-0.5 text-xl font-black leading-tight text-slate-950">
            {resolvedTitle}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm ring-1 ring-slate-200">
        <div className="relative aspect-[16/9] bg-slate-950">
          {ready ? (
            <iframe
              data-testid="learner-content-video-player"
              title={resolvedTitle}
              src={embedUrl}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen={allowFullscreen}
            />
          ) : (
            <div
              data-testid="learner-content-video-unavailable"
              className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-xl text-blue-700 shadow-xl ring-1 ring-white/20">
                {"▶"}
              </div>

              <div className="mt-4 text-base font-bold text-white">
                {"Видео временно недоступно"}
              </div>

              <div className="mt-1 max-w-md text-sm leading-6 text-white/65">
                {"Попробуйте открыть материал отдельно."}
              </div>
            </div>
          )}
        </div>
      </div>

      {resolvedDescription ? (
        <div
          data-testid="learner-content-video-description"
          className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-base font-medium leading-7 text-slate-700 ring-1 ring-slate-100 sm:text-lg sm:leading-8"
        >
          {resolvedDescription}
        </div>
      ) : null}

      {openUrl ? (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <a
            data-testid="learner-content-video-open"
            href={openUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <span>
              {ready
                ? "Открыть видео отдельно"
                : "Открыть видео"}
            </span>
            <span aria-hidden="true">
              {"↗"}
            </span>
          </a>
        </div>
      ) : hasRawSource ? (
        <div
          data-testid="learner-content-video-unsafe-url"
          className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200"
        >
          {"Ссылка на видео имеет неподдерживаемый формат."}
        </div>
      ) : null}
    </section>
  );
}
