function isLessonRichTextDocumentEmpty(documentValue) {
  const nodes = Array.isArray(documentValue?.content) ? documentValue.content : [];

  if (!nodes.length) {
    return true;
  }

  return !nodes.some((node) => getLessonRichTextPlainText(node).trim());
}

function getLessonRichTextPlainText(node) {
  if (!node || typeof node !== "object") {
    return "";
  }

  if (node.type === "text") {
    return `${node.text || ""}`;
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  if (!Array.isArray(node.content)) {
    return "";
  }

  return node.content.map((child) => getLessonRichTextPlainText(child)).join("");
}

export function getSafeLessonRichTextHref(href, apiUrlBuilder) {
  const value = `${href || ""}`.trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("#")) {
    return value;
  }

  if (value.startsWith("/api/")) {
    return typeof apiUrlBuilder === "function" ? apiUrlBuilder(value) : value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];

    if (!allowedProtocols.includes(url.protocol)) {
      return "";
    }

    if (
      typeof window !== "undefined" &&
      window.location?.host &&
      url.host === window.location.host &&
      (url.protocol === "http:" || url.protocol === "https:")
    ) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return value;
  } catch {
    return "";
  }
}

const LESSON_RICH_TEXT_ALLOWED_COLORS = new Set([
  "#dc2626",
  "#d97706",
  "#16a34a",
  "#2563eb",
]);

function getSafeLessonRichTextColor(value) {
  const color = `${value || ""}`.trim().toLowerCase();

  return LESSON_RICH_TEXT_ALLOWED_COLORS.has(color) ? color : "";
}

function getLessonRichTextAlignClass(value) {
  const align = `${value || ""}`.trim().toLowerCase();

  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  if (align === "justify") return "text-justify";

  return "text-left";
}

function renderLessonRichTextMarks(children, marks = [], keyPrefix = "mark", apiUrlBuilder) {
  return marks.reduce((currentChildren, mark, index) => {
    const markKey = `${keyPrefix}-${mark.type || "mark"}-${index}`;

    if (mark.type === "bold") {
      return (
        <strong key={markKey} className="font-black text-slate-950">
          {currentChildren}
        </strong>
      );
    }

    if (mark.type === "italic") {
      return (
        <em key={markKey} className="italic">
          {currentChildren}
        </em>
      );
    }

    if (mark.type === "code") {
      return (
        <code
          key={markKey}
          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-900 ring-1 ring-slate-200"
        >
          {currentChildren}
        </code>
      );
    }

    if (mark.type === "link") {
      const safeHref = getSafeLessonRichTextHref(mark.attrs?.href, apiUrlBuilder);

      if (!safeHref) {
        return currentChildren;
      }

      return (
        <a
          key={markKey}
          data-testid="lesson-rich-text-safe-link"
          href={safeHref}
          target={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "_blank"}
          rel={safeHref.startsWith("/") || safeHref.startsWith("#") ? undefined : "noreferrer"}
          className="font-bold text-blue-700 underline decoration-blue-300 underline-offset-4 transition hover:text-blue-900"
        >
          {currentChildren}
        </a>
      );
    }

    if (mark.type === "textStyle") {
      const safeColor = getSafeLessonRichTextColor(mark.attrs?.color);

      if (!safeColor) {
        return currentChildren;
      }

      return (
        <span key={markKey} style={{ color: safeColor }}>
          {currentChildren}
        </span>
      );
    }

    return currentChildren;
  }, children);
}

function renderLessonRichTextChildren(nodes, keyPrefix, apiUrlBuilder) {
  if (!Array.isArray(nodes)) {
    return null;
  }

  return nodes
    .map((node, index) => renderLessonRichTextNode(node, `${keyPrefix}-${index}`, apiUrlBuilder))
    .filter(Boolean);
}

function renderLessonRichTextNode(node, key, apiUrlBuilder) {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (node.type === "text") {
    return renderLessonRichTextMarks(`${node.text || ""}`, node.marks, key, apiUrlBuilder);
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  const children = renderLessonRichTextChildren(node.content, key, apiUrlBuilder);

  if (node.type === "paragraph") {
    const alignClass = getLessonRichTextAlignClass(node.attrs?.textAlign);

    return (
      <p key={key} className={`text-base leading-8 text-slate-700 ${alignClass}`}>
        {children?.length ? children : <br />}
      </p>
    );
  }

  if (node.type === "heading") {
    const level = Number(node.attrs?.level || 2);
    const HeadingTag = level >= 3 ? "h3" : "h2";
    const alignClass = getLessonRichTextAlignClass(node.attrs?.textAlign);
    const className =
      level >= 3
        ? `mt-5 text-lg font-black leading-8 text-slate-950 first:mt-0 ${alignClass}`
        : `mt-6 text-2xl font-black leading-9 text-slate-950 first:mt-0 ${alignClass}`;

    return (
      <HeadingTag key={key} className={className}>
        {children}
      </HeadingTag>
    );
  }

  if (node.type === "bulletList") {
    return (
      <ul key={key} className="ml-6 list-disc space-y-2 text-base leading-8 text-slate-700">
        {children}
      </ul>
    );
  }

  if (node.type === "orderedList") {
    return (
      <ol key={key} className="ml-6 list-decimal space-y-2 text-base leading-8 text-slate-700">
        {children}
      </ol>
    );
  }

  if (node.type === "listItem") {
    return (
      <li key={key} className="pl-1">
        {children}
      </li>
    );
  }

  if (node.type === "blockquote") {
    return (
      <blockquote
        key={key}
        className="rounded-2xl border-l-4 border-blue-300 bg-blue-50 px-5 py-4 text-base italic leading-8 text-slate-700"
      >
        {children}
      </blockquote>
    );
  }

  if (node.type === "codeBlock") {
    return (
      <pre
        key={key}
        className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-slate-50 shadow-inner"
      >
        <code>{getLessonRichTextPlainText(node)}</code>
      </pre>
    );
  }

  if (children?.length) {
    return (
      <div key={key} className="text-base leading-8 text-slate-700">
        {children}
      </div>
    );
  }

  return null;
}

export default function LessonRichTextView({
  documentValue,
  fallbackText = "",
  learnerMode = false,
  apiUrlBuilder,
}) {
  const fallback = `${fallbackText || ""}`.trim();
  const empty = isLessonRichTextDocumentEmpty(documentValue);
  const nodes = Array.isArray(documentValue?.content)
    ? documentValue.content
    : [];

  return (
    <div
      data-testid="lesson-rich-text-safe-preview"
      className={
        learnerMode
          ? "space-y-4 break-words text-slate-800"
          : "space-y-3 break-words"
      }
    >
      {empty ? (
        <p className="text-base leading-8 text-slate-500">
          {fallback || "Учебный текст пока не заполнен."}
        </p>
      ) : (
        nodes.map((node, index) =>
          renderLessonRichTextNode(
            node,
            `rich-text-preview-${index}`,
            apiUrlBuilder,
          ),
        )
      )}
    </div>
  );
}
