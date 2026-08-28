import { buildApiUrl } from "../../api/client";
import LessonRichTextView, {
  getSafeLessonRichTextHref,
} from "../lesson/LessonRichTextView";
import LessonCalloutView from "../lesson/LessonCalloutView";
import LessonAudioView from "../lesson/LessonAudioView";
import LessonImageView from "../lesson/LessonImageView";
import LessonPresentationView from "../lesson/LessonPresentationView";
import LessonVideoView from "../lesson/LessonVideoView";
import LessonFileLinkView from "../lesson/LessonFileLinkView";


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
    || content.content_text
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
    || content.content_url
    || content.file_url
    || content.href
    || content.link
    || content.video_url
    || ""
  }`.trim();
}


function getSafeHref(value) {
  return getSafeLessonRichTextHref(
    value,
    buildApiUrl,
  );
}

function getVideoEmbedSrc(value) {
  const code = `${value || ""}`;
  const match = code.match(/src=["']([^"']+)["']/i);

  return match?.[1]?.replaceAll("&amp;", "&").trim() || "";
}


function normalizeVideoEmbedUrl(value) {
  const source = `${value || ""}`.trim().replaceAll("&amp;", "&");

  if (!source) {
    return "";
  }

  if (source.startsWith("//")) {
    return `https:${source}`;
  }

  if (
    source.startsWith("http://")
    || source.startsWith("https://")
  ) {
    return source;
  }

  return "";
}


function getYouTubeVideoId(url) {
  const host = url.hostname.replace(/^www\./, "");
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return pathParts[0] || "";
  }

  if (host.includes("youtube.com")) {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || "";
    }

    if (
      pathParts[0] === "embed"
      || pathParts[0] === "shorts"
      || pathParts[0] === "live"
    ) {
      return pathParts[1] || "";
    }
  }

  return "";
}


function getVideoPreviewEmbedUrl(value) {
  const source = `${value || ""}`
    .trim()
    .replaceAll("&amp;", "&");

  if (!source) {
    return "";
  }

  const iframeSrc = getVideoEmbedSrc(source);

  if (iframeSrc) {
    return normalizeVideoEmbedUrl(iframeSrc);
  }

  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);

    const youtubeId = getYouTubeVideoId(url);

    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}`;
    }

    if (host.includes("rutube.ru")) {
      const rutubeId =
        pathParts[0] === "video"
          ? pathParts[1]
          : pathParts[0] === "play"
            && pathParts[1] === "embed"
            ? pathParts[2]
            : "";

      if (rutubeId) {
        return `https://rutube.ru/play/embed/${rutubeId}`;
      }
    }

    if (
      host.includes("vk.com")
      || host.includes("vkvideo.ru")
    ) {
      const videoMatch = url.pathname.match(
        /video(-?\d+)_(\d+)/
      );

      if (videoMatch) {
        return `https://vk.com/video_ext.php?oid=${videoMatch[1]}&id=${videoMatch[2]}`;
      }

      if (url.pathname.includes("video_ext.php")) {
        return normalizeVideoEmbedUrl(source);
      }
    }

    if (host.includes("vimeo.com")) {
      const videoId = pathParts.find(
        (part) => /^\d+$/.test(part)
      );

      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }

    if (
      url.pathname.includes("/embed/")
      || host.includes("player.")
      || host.includes("video_ext.php")
    ) {
      return normalizeVideoEmbedUrl(source);
    }

    return "";
  } catch {
    return "";
  }
}


function getLearnerVideoSourceValue(block) {
  const content = getContent(block);

  const embedCode = `${
    content.embed_code
    || content.video_embed_code
    || content.iframe
    || ""
  }`.trim();

  const sourceType = `${
    content.video_source_type
    || content.source_type
    || content.insert_type
    || ""
  }`
    .trim()
    .toLowerCase();

  const directUrl = `${
    content.url
    || content.content_url
    || content.video_url
    || content.src
    || ""
  }`.trim();

  if (
    sourceType === "embed"
    || embedCode
  ) {
    return embedCode || directUrl;
  }

  return directUrl;
}


function getLearnerVideoOpenUrl(block) {
  const content = getContent(block);

  const directUrl = `${
    content.url
    || content.content_url
    || content.video_url
    || content.src
    || ""
  }`.trim();

  if (directUrl) {
    return directUrl;
  }

  return getVideoEmbedSrc(
    `${
      content.embed_code
      || content.video_embed_code
      || content.iframe
      || ""
    }`
  );
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
  const content = getContent(block);
  const text = getText(block);

  const documentValue =
    content.editor_json?.type === "doc"
      ? content.editor_json
      : undefined;

  return (
    <section
      data-testid="learner-content-rich-text"
      className="py-2"
    >
      {documentValue ? (
        <div className="mt-3">
          <LessonRichTextView
            documentValue={documentValue}
            fallbackText={text}
            learnerMode
            apiUrlBuilder={buildApiUrl}
          />
        </div>
      ) : (
        <div className="mt-3 whitespace-pre-wrap break-words text-base font-medium leading-7 text-slate-700 sm:text-lg sm:leading-8">
          {text || "\u0422\u0435\u043a\u0441\u0442\u043e\u0432\u044b\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043f\u043e\u043a\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d."}
        </div>
      )}
    </section>
  );
}


function VideoBlock({ block }) {
  const content = getContent(block);
  const text = getText(block);

  const sourceValue =
    getLearnerVideoSourceValue(block);

  const embedUrl =
    getVideoPreviewEmbedUrl(sourceValue);

  const openUrl =
    getLearnerVideoOpenUrl(block)
    || embedUrl;

  const href =
    getSafeHref(openUrl);

  const caption = `${
    content.caption
    || content.description
    || ""
  }`.trim();

  const videoTitle = `${
    block?.title
    || "Видеоматериал"
  }`.trim() || "Видеоматериал";

  const allowFullscreen =
    content.allow_fullscreen !== false;

  const description =
    text
    || caption
    || "";

  return (
    <LessonVideoView
      title={videoTitle}
      embedUrl={embedUrl}
      allowFullscreen={allowFullscreen}
      description={description}
      openUrl={href}
      rawSource={sourceValue}
    />
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
    || text
    || ""
  }`.trim();

  return (
    <LessonFileLinkView
      title={
        block?.title
        || fileName
        || "Файл или ссылка"
      }
      description={description}
      openUrl={href}
      rawSource={url}
      openInNewTab
    />
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

  return (
    <LessonImageView
      title={block?.title || filename}
      sourceUrl={safeSource}
      rawSource={rawSource}
      altText={alt}
      caption={caption}
      fullWidth={fullWidth}
      openFullSize={openFullSize}
      downloadUrl={safeDownload}
      showDownload={showDownload}
    />
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
    <LessonPresentationView
      title={block?.title || filename}
      filename={filename}
      sourceUrl={safeViewer}
      rawSource={rawViewer}
      downloadUrl={safeDownload}
      showDownload={showDownload}
      conversionStatus={conversionStatus}
    />
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
    <LessonAudioView
      title={block?.title}
      filename={filename}
      sourceUrl={safeSource}
      rawSource={rawSource}
      downloadUrl={safeDownload}
      showDownload={showDownload}
    />
  );
}

function CalloutBlock({ block }) {
  const content = getContent(block);
  const text = getText(block);

  return (
    <LessonCalloutView
      title={block?.title}
      text={text}
      toneName={content.tone}
    />
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
