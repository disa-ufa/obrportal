const CALLOUT_TONES = {
  info: {
    shell: "bg-blue-50 ring-blue-200",
    title: "text-blue-950",
    text: "text-blue-900",
    label: "\u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f",
  },
  success: {
    shell: "bg-emerald-50 ring-emerald-200",
    title: "text-emerald-950",
    text: "text-emerald-900",
    label: "\u0412\u0430\u0436\u043d\u043e",
  },
  warning: {
    shell: "bg-amber-50 ring-amber-200",
    title: "text-amber-950",
    text: "text-amber-900",
    label: "\u0412\u043d\u0438\u043c\u0430\u043d\u0438\u0435",
  },
  danger: {
    shell: "bg-red-50 ring-red-200",
    title: "text-red-950",
    text: "text-red-900",
    label: "\u0412\u0430\u0436\u043d\u043e",
  },
};


function normalizeBlockType(value) {
  const normalized = `${value || "rich_text"}`
    .trim()
    .toLowerCase();

  if (normalized === "text") {
    return "rich_text";
  }

  if (
    normalized === "file"
    || normalized === "link"
  ) {
    return "file_link";
  }

  return normalized;
}


function extractStructuredText(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map(extractStructuredText)
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (typeof value !== "object") {
    return "";
  }

  const directText = `${
    value.text
    || value.body
    || value.description
    || value.note
    || value.message
    || ""
  }`.trim();

  if (directText) {
    return directText;
  }

  if (Array.isArray(value.content)) {
    return value.content
      .map(extractStructuredText)
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}


function getContent(block) {
  const value = block?.content_json;

  return (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  )
    ? value
    : {};
}


function getText(block) {
  const content = getContent(block);

  const direct = `${
    content.text
    || content.body
    || content.description
    || content.note
    || content.message
    || ""
  }`.trim();

  if (direct) {
    return direct;
  }

  return extractStructuredText(content);
}


function getUrl(block) {
  const content = getContent(block);

  return `${
    content.url
    || content.file_url
    || content.video_url
    || ""
  }`.trim();
}


function getSafeHref(value) {
  const raw = `${value || ""}`.trim();

  if (!raw) {
    return "";
  }

  if (
    raw.startsWith("/")
    && !raw.startsWith("//")
  ) {
    return raw;
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


function getFileName(block) {
  const content = getContent(block);

  return `${
    content.file_name
    || content.filename
    || content.name
    || ""
  }`.trim();
}


function getAudioSourceUrl(block) {
  const content = getContent(block);

  return `${
    content.audio_url
    || content.stream_url
    || content.url
    || content.content_url
    || content.src
    || content.file_url
    || content.href
    || ""
  }`.trim();
}


function getAudioDownloadUrl(block) {
  const content = getContent(block);

  return `${
    content.original_url
    || content.download_url
    || getAudioSourceUrl(block)
    || ""
  }`.trim();
}


function getAudioFilename(block) {
  const content = getContent(block);

  return `${
    content.original_filename
    || content.filename
    || block?.title
    || "audio"
  }`.trim();
}


function getMaterialKind(block) {
  const content = getContent(block);

  return `${
    content.material_kind
    || ""
  }`
    .trim()
    .toLowerCase();
}


function isImageMaterialBlock(block) {
  return (
    normalizeBlockType(
      block?.block_type
    ) === "file_link"
    && getMaterialKind(block) === "image"
  );
}


function getImageSourceUrl(block) {
  const content = getContent(block);

  return `${
    content.image_url
    || content.url
    || content.content_url
    || content.src
    || content.file_url
    || content.href
    || ""
  }`.trim();
}


function getImageDownloadUrl(block) {
  const content = getContent(block);

  return `${
    content.original_url
    || content.download_url
    || getImageSourceUrl(block)
    || ""
  }`.trim();
}


function getImageFilename(block) {
  const content = getContent(block);

  return `${
    content.original_filename
    || content.file_name
    || content.filename
    || block?.title
    || "image"
  }`.trim();
}


function getImageAlt(block) {
  const content = getContent(block);

  return `${
    content.alt_text
    || content.alt
    || block?.title
    || getImageFilename(block)
    || "\u0418\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435"
  }`.trim();
}


function getPresentationViewerUrl(block) {
  const content = getContent(block);

  return `${
    content.viewer_url
    || content.url
    || content.content_url
    || content.file_url
    || content.href
    || ""
  }`.trim();
}


function getPresentationDownloadUrl(block) {
  const content = getContent(block);

  return `${
    content.original_url
    || content.download_url
    || getPresentationViewerUrl(block)
    || ""
  }`.trim();
}


function getPresentationFilename(block) {
  const content = getContent(block);

  return `${
    content.original_filename
    || content.filename
    || block?.title
    || "presentation.pdf"
  }`.trim();
}


function RichTextBlock({ block }) {
  const text = getText(block);

  return (
    <section
      data-testid="learner-content-rich-text"
      className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
    >
      {block?.title ? (
        <h3 className="text-base font-black text-slate-950">
          {block.title}
        </h3>
      ) : null}

      <div className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-slate-700">
        {text || "\u0422\u0435\u043a\u0441\u0442\u043e\u0432\u044b\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043f\u043e\u043a\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d."}
      </div>
    </section>
  );
}


function VideoBlock({ block }) {
  const content = getContent(block);
  const text = getText(block);
  const url = getUrl(block);
  const href = getSafeHref(url);

  const caption = `${
    content.caption
    || content.description
    || ""
  }`.trim();

  return (
    <section
      data-testid="learner-content-video"
      className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-200"
    >
      <div className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">
        \u0412\u0438\u0434\u0435\u043e
      </div>

      <h3 className="mt-2 text-base font-black text-blue-950">
        {block?.title || "\u0412\u0438\u0434\u0435\u043e\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b"}
      </h3>

      <div className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-blue-900">
        {text || caption || url || "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0432\u0438\u0434\u0435\u043e \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043e."}
      </div>

      {href ? (
        <a
          data-testid="learner-content-video-open"
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
        >
          \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0432\u0438\u0434\u0435\u043e
        </a>
      ) : url ? (
        <div
          data-testid="learner-content-video-unsafe-url"
          className="mt-4 rounded-xl bg-white/70 p-3 text-xs font-semibold text-blue-800 ring-1 ring-blue-200"
        >
          \u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u0432\u0438\u0434\u0435\u043e \u0438\u043c\u0435\u0435\u0442 \u043d\u0435\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043c\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442.
        </div>
      ) : null}
    </section>
  );
}


function FileLinkBlock({ block }) {
  const content = getContent(block);
  const text = getText(block);
  const url = getUrl(block);
  const href = getSafeHref(url);
  const fileName = getFileName(block);

  const description = `${
    content.description
    || content.text
    || ""
  }`.trim();

  return (
    <section
      data-testid="learner-content-file-link"
      className="rounded-2xl bg-violet-50 p-5 ring-1 ring-violet-200"
    >
      <div className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">
        \u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b
      </div>

      <h3 className="mt-2 text-base font-black text-violet-950">
        {block?.title || fileName || "\u0424\u0430\u0439\u043b \u0438\u043b\u0438 \u0441\u0441\u044b\u043b\u043a\u0430"}
      </h3>

      <div className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-violet-900">
        {description || text || url || "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043e."}
      </div>

      {href ? (
        <a
          data-testid="learner-content-file-link-open"
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
        >
          \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b
        </a>
      ) : url ? (
        <div
          data-testid="learner-content-file-link-unsafe-url"
          className="mt-4 rounded-xl bg-white/70 p-3 text-xs font-semibold text-violet-800 ring-1 ring-violet-200"
        >
          \u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0438\u043c\u0435\u0435\u0442 \u043d\u0435\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043c\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442.
        </div>
      ) : null}
    </section>
  );
}


function ImageBlock({ block }) {
  const content = getContent(block);

  const rawSource = getImageSourceUrl(block);
  const safeSource = getSafeHref(rawSource);

  const rawDownload = getImageDownloadUrl(block);
  const safeDownload = getSafeHref(rawDownload);

  const filename = getImageFilename(block);
  const alt = getImageAlt(block);

  const caption = `${
    content.caption
    || content.description
    || content.text
    || ""
  }`.trim();

  const fullWidth =
    content.full_width !== false;

  const openFullSize =
    content.open_full_size !== false;

  const showDownload =
    content.show_download !== false;

  const image = safeSource ? (
    <img
      data-testid="learner-content-image-element"
      src={safeSource}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`block max-h-[48rem] object-contain ${
        fullWidth
          ? "w-full"
          : "max-w-full"
      }`}
    />
  ) : null;

  return (
    <section
      data-testid="learner-content-image"
      className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200"
    >
      <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
        {"\u0418\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435"}
      </div>

      <h3 className="mt-2 text-base font-black text-slate-950">
        {block?.title || filename || "\u0418\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435"}
      </h3>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        {safeSource ? (
          openFullSize ? (
            <a
              data-testid="learner-content-image-open"
              href={safeSource}
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
            className="p-6 text-center text-sm font-semibold text-slate-500"
          >
            {rawSource
              ? "\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435 \u0438\u043c\u0435\u0435\u0442 \u043d\u0435\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043c\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442."
              : "\u0418\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e."}
          </div>
        )}
      </div>

      {caption ? (
        <div
          data-testid="learner-content-image-caption"
          className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-600"
        >
          {caption}
        </div>
      ) : null}

      {safeSource && showDownload && safeDownload ? (
        <a
          data-testid="learner-content-image-download"
          href={safeDownload}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          {"\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435"}
        </a>
      ) : null}
    </section>
  );
}


function PresentationBlock({ block }) {
  const content = getContent(block);

  const rawViewer =
    getPresentationViewerUrl(block);

  const safeViewer =
    getSafeHref(rawViewer);

  const rawDownload =
    getPresentationDownloadUrl(block);

  const safeDownload =
    getSafeHref(rawDownload);

  const filename =
    getPresentationFilename(block);

  const showDownload =
    content.show_download !== false;

  const conversionStatus = `${
    content.conversion_status
    || ""
  }`.trim();

  return (
    <section
      data-testid="learner-content-presentation"
      className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200"
    >
      <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
        {"\u041f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044f"}
      </div>

      <h3 className="mt-2 text-base font-black text-amber-950">
        {block?.title || filename || "\u041f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044f"}
      </h3>

      {filename ? (
        <div
          data-testid="learner-content-presentation-filename"
          className="mt-1 break-words text-xs font-semibold text-amber-800"
        >
          {filename}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-amber-200">
        {safeViewer ? (
          <iframe
            data-testid="learner-content-presentation-viewer"
            src={safeViewer}
            title={block?.title || filename || "Presentation"}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-[70vh] min-h-[28rem] w-full bg-white"
          />
        ) : (
          <div
            data-testid="learner-content-presentation-unavailable"
            className="p-6 text-center text-sm font-semibold text-amber-900"
          >
            {rawViewer
              ? "\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044e \u0438\u043c\u0435\u0435\u0442 \u043d\u0435\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043c\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442."
              : conversionStatus && conversionStatus !== "ready"
                ? "\u041f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044f \u0435\u0449\u0451 \u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u0430 \u043a \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0443."
                : "\u041f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044f \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430."}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {safeViewer ? (
          <a
            data-testid="learner-content-presentation-open"
            href={safeViewer}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
          >
            {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0440\u0435\u0437\u0435\u043d\u0442\u0430\u0446\u0438\u044e"}
          </a>
        ) : null}

        {showDownload && safeDownload ? (
          <a
            data-testid="learner-content-presentation-download"
            href={safeDownload}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
          >
            {"\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0444\u0430\u0439\u043b"}
          </a>
        ) : null}
      </div>
    </section>
  );
}


function AudioBlock({ block }) {
  const content = getContent(block);

  const rawSource = getAudioSourceUrl(block);
  const safeSource = getSafeHref(rawSource);

  const rawDownload = getAudioDownloadUrl(block);
  const safeDownload = getSafeHref(rawDownload);

  const filename = getAudioFilename(block);
  const showDownload = content.show_download !== false;

  return (
    <section
      data-testid="learner-content-audio"
      className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200"
    >
      <div className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
        {"\u0410\u0443\u0434\u0438\u043e"}
      </div>

      <h3 className="mt-2 text-base font-black text-emerald-950">
        {block?.title || filename || "\u0410\u0443\u0434\u0438\u043e\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b"}
      </h3>

      {filename ? (
        <div
          data-testid="learner-content-audio-filename"
          className="mt-1 break-words text-xs font-semibold text-emerald-700"
        >
          {filename}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-emerald-200">
        {safeSource ? (
          <audio
            data-testid="learner-content-audio-player"
            controls
            preload="metadata"
            src={safeSource}
            className="w-full"
          >
            {"\u0412\u0430\u0448 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0430\u0443\u0434\u0438\u043e\u043f\u043b\u0435\u0435\u0440."}
          </audio>
        ) : (
          <div
            data-testid="learner-content-audio-unavailable"
            className="py-4 text-center text-sm font-semibold text-slate-500"
          >
            {rawSource
              ? "\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0430 \u0430\u0443\u0434\u0438\u043e \u0438\u043c\u0435\u0435\u0442 \u043d\u0435\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043c\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442."
              : "\u0410\u0443\u0434\u0438\u043e \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e."}
          </div>
        )}
      </div>

      {safeSource && showDownload && safeDownload ? (
        <a
          data-testid="learner-content-audio-download"
          href={safeDownload}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
        >
          {"\u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0430\u0443\u0434\u0438\u043e"}
        </a>
      ) : null}
    </section>
  );
}


function CalloutBlock({ block }) {
  const content = getContent(block);
  const text = getText(block);

  const toneName = `${
    content.tone
    || "info"
  }`.trim();

  const tone = (
    CALLOUT_TONES[toneName]
    || CALLOUT_TONES.info
  );

  return (
    <section
      data-testid="learner-content-callout"
      data-tone={toneName}
      className={`rounded-2xl p-5 ring-1 ${tone.shell}`}
    >
      <div
        className={`text-xs font-black uppercase tracking-[0.12em] ${tone.text}`}
      >
        {tone.label}
      </div>

      <h3
        className={`mt-2 text-base font-black ${tone.title}`}
      >
        {block?.title || tone.label}
      </h3>

      <div
        className={`mt-3 whitespace-pre-wrap break-words text-sm font-semibold leading-7 ${tone.text}`}
      >
        {text || "\u0421\u043e\u0434\u0435\u0440\u0436\u0430\u043d\u0438\u0435 \u0432\u0440\u0435\u0437\u043a\u0438 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043e."}
      </div>
    </section>
  );
}


export function LearnerContentBlock({
  block,
}) {
  const blockType = normalizeBlockType(
    block?.block_type
  );

  if (blockType === "video") {
    return <VideoBlock block={block} />;
  }

  if (blockType === "audio") {
    return <AudioBlock block={block} />;
  }

  if (blockType === "presentation") {
    return <PresentationBlock block={block} />;
  }

  if (
    blockType === "file_link"
    && isImageMaterialBlock(block)
  ) {
    return <ImageBlock block={block} />;
  }

  if (blockType === "file_link") {
    return <FileLinkBlock block={block} />;
  }

  if (blockType === "callout") {
    return <CalloutBlock block={block} />;
  }

  return <RichTextBlock block={block} />;
}
