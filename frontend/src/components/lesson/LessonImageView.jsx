export default function LessonImageView({
  title = "",
  sourceUrl = "",
  rawSource = "",
  altText = "",
  caption = "",
  fullWidth = true,
  openFullSize = true,
  downloadUrl = "",
  showDownload = true,
}) {
  const ready = Boolean(sourceUrl);

  const resolvedTitle =
    `${title || "Изображение"}`.trim()
    || "Изображение";

  const resolvedAlt =
    `${altText || resolvedTitle || "Изображение"}`.trim()
    || "Изображение";

  const image = ready ? (
    <div
      className={`overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 ${
        fullWidth
          ? "w-full"
          : "mx-auto max-w-3xl"
      }`}
    >
      <img
        data-testid="learner-content-image-element"
        src={sourceUrl}
        alt={resolvedAlt}
        loading="lazy"
        decoding="async"
        className="max-h-[620px] w-full object-contain"
      />
    </div>
  ) : null;

  return (
    <figure
      data-testid="learner-content-image"
      data-presentation-view="lesson-image"
      className="mt-5"
    >
      <div className="mb-3 text-xl font-black leading-tight text-slate-950">
        {resolvedTitle}
      </div>

      {ready ? (
        openFullSize ? (
          <a
            data-testid="learner-content-image-open"
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            {image}
          </a>
        ) : (
          image
        )
      ) : (
        <div
          data-testid="learner-content-image-unavailable"
          className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200"
        >
          {rawSource
            ? "Ссылка на изображение имеет неподдерживаемый формат."
            : "Изображение временно недоступно."}
        </div>
      )}

      {caption ? (
        <figcaption
          data-testid="learner-content-image-caption"
          className="mt-3 text-center text-sm leading-6 text-slate-500"
        >
          {caption}
        </figcaption>
      ) : null}

      {ready && showDownload && downloadUrl ? (
        <a
          data-testid="learner-content-image-download"
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {"Скачать изображение"}
        </a>
      ) : null}
    </figure>
  );
}
