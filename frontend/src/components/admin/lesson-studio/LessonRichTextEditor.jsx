import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code2, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Type, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";

const RICH_TEXT_CHARACTER_LIMIT = 20000;

const RICH_TEXT_COLOR_PALETTE = [
  { key: "default", label: "\u041e\u0431\u044b\u0447\u043d\u044b\u0439", color: "" },
  { key: "red", label: "\u041a\u0440\u0430\u0441\u043d\u044b\u0439", color: "#dc2626" },
  { key: "amber", label: "\u0416\u0435\u043b\u0442\u044b\u0439", color: "#d97706" },
  { key: "green", label: "\u0417\u0435\u043b\u0435\u043d\u044b\u0439", color: "#16a34a" },
  { key: "blue", label: "\u0421\u0438\u043d\u0438\u0439", color: "#2563eb" },
];

function getRichTextColorButtonClass(active = false) {
  return [
    "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md px-2 text-[12px] font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100",
    active
      ? "bg-blue-600 text-white ring-blue-600 shadow-sm"
      : "bg-white text-slate-700 ring-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200",
  ].join(" ");
}

function buildDocumentFromPlainText(value) {
  const text = `${value || ""}`.trim();

  if (!text) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph }],
    })),
  };
}

function normalizeEditorDocument(value) {
  if (value?.editor_json?.type === "doc") {
    return value.editor_json;
  }

  return buildDocumentFromPlainText(value?.text);
}

function getToolbarButtonClass(active = false) {
  return [
    "inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-[12px] font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100",
    active
      ? "bg-blue-600 text-white ring-blue-600 shadow-sm"
      : "bg-white text-slate-700 ring-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200",
  ].join(" ");
}

function ToolbarButton({ active = false, disabled = false, title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`${getToolbarButtonClass(active)} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />;
}

function getEditorStats(editor) {
  const characters = editor?.storage?.characterCount?.characters?.() || 0;
  const words = editor?.storage?.characterCount?.words?.() || 0;

  return { characters, words };
}

function applyEditorLink(editor, nextUrl) {
  if (!editor) {
    return;
  }

  const cleanUrl = `${nextUrl || ""}`.trim();

  if (!cleanUrl) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: cleanUrl }).run();
}

function emitEditorChange(editor, onChange) {
  if (!editor || typeof onChange !== "function") {
    return;
  }

  onChange({
    text: editor.getText().trim(),
    editor_json: editor.getJSON(),
    editor_html: editor.getHTML(),
  });
}

function LessonRichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Начните писать учебный текст. Выделите фразу для быстрых действий.",
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      TextStyle,
      Color.configure({
        types: ["textStyle"],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: RICH_TEXT_CHARACTER_LIMIT,
      }),
    ],
    content: normalizeEditorDocument(value),
    editorProps: {
      attributes: {
        class:
          "min-h-[240px] rounded-xl bg-white px-6 py-6 text-[15px] leading-7 text-slate-900 outline-none transition",
      },
    },
    onUpdate: ({ editor: currentEditor }) => emitEditorChange(currentEditor, onChange),
  });

  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState("");

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const openLinkEditor = () => {
    if (!editor || disabled) {
      return;
    }

    setLinkInputValue(editor.getAttributes("link")?.href || "");
    setLinkEditorOpen(true);
  };

  const closeLinkEditor = () => {
    setLinkEditorOpen(false);
    setLinkInputValue("");
  };

  const handleLinkSubmit = (event) => {
    event.preventDefault();

    applyEditorLink(editor, linkInputValue);
    closeLinkEditor();
  };

  if (!editor) {
    return (
      <div
        data-testid="lesson-rich-text-editor-loading"
        className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 ring-1 ring-slate-200"
      >
        Загружаем редактор текста…
      </div>
    );
  }

  const { characters, words } = getEditorStats(editor);
  const characterLimitReached = characters >= RICH_TEXT_CHARACTER_LIMIT;

  return (
    <div data-testid="lesson-rich-text-editor" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {editor ? (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 120 }}
          className="flex items-center gap-1 rounded-2xl bg-slate-950 p-1 text-white shadow-xl"
        >
          <button
            type="button"
            data-testid="lesson-rich-text-bubble-bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`rounded-xl px-2 py-1 text-xs font-black transition ${
              editor.isActive("bold") ? "bg-white text-slate-950" : "hover:bg-white/10"
            }`}
          >
            B
          </button>
          <button
            type="button"
            data-testid="lesson-rich-text-bubble-italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`rounded-xl px-2 py-1 text-xs font-black italic transition ${
              editor.isActive("italic") ? "bg-white text-slate-950" : "hover:bg-white/10"
            }`}
          >
            I
          </button>
          <button
            type="button"
            data-testid="lesson-rich-text-bubble-link"
            onClick={openLinkEditor}
            className={`rounded-xl px-2 py-1 text-xs font-black transition ${
              editor.isActive("link") ? "bg-white text-slate-950" : "hover:bg-white/10"
            }`}
          >
            <span>↗</span>
          <span>Ссылка</span>
          </button>
          <button
            type="button"
            data-testid="lesson-rich-text-bubble-code"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`rounded-xl px-2 py-1 text-xs font-black transition ${
              editor.isActive("code") ? "bg-white text-slate-950" : "hover:bg-white/10"
            }`}
          >
            <span className="font-mono text-[11px]">&lt;&gt;</span>
          <span>Код</span>
          </button>
        </BubbleMenu>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50/90 px-4 py-3 ring-1 ring-slate-200">
        <div>
          <div className="text-sm font-black text-slate-950">
            Редактор учебного текста
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Структурируйте материал заголовками, списками, цитатами и ссылками.
          </div>
        </div>

        <div className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
          Ctrl+B · Ctrl+I · Enter
        </div>
      </div>

      <div
        data-testid="lesson-rich-text-toolbar"
        className="flex flex-wrap items-center gap-1 rounded-xl bg-white/95 p-1.5 ring-1 ring-slate-200 shadow-sm"
        role="toolbar"
        aria-label="\u041f\u0430\u043d\u0435\u043b\u044c \u0444\u043e\u0440\u043c\u0430\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u0443\u0447\u0435\u0431\u043d\u043e\u0433\u043e \u0442\u0435\u043a\u0441\u0442\u0430"
      >
        <ToolbarButton
          title={"\u0410\u0431\u0437\u0430\u0446"}
          active={editor.isActive("paragraph")}
          disabled={disabled}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Type className="h-4 w-4" aria-hidden="true" />
          <span>{"\u0410\u0431\u0437\u0430\u0446"}</span>
        </ToolbarButton>
        <ToolbarButton
          title={"\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a H2"}
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" aria-hidden="true" />
          <span>{"\u0417\u0430\u0433\u043e\u043b."}</span>
        </ToolbarButton>
        <ToolbarButton
          title={"\u041f\u043e\u0434\u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a H3"}
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" aria-hidden="true" />
          <span>{"\u041f\u043e\u0434\u0437."}</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title={"\u0416\u0438\u0440\u043d\u044b\u0439"}
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u041a\u0443\u0440\u0441\u0438\u0432"}
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u041a\u043e\u0434 \u0432 \u0441\u0442\u0440\u043e\u043a\u0435"}
          active={editor.isActive("code")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code2 className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u0421\u0441\u044b\u043b\u043a\u0430"}
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={openLinkEditor}
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title={"\u041c\u0430\u0440\u043a\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u0441\u043f\u0438\u0441\u043e\u043a"}
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u041d\u0443\u043c\u0435\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u0441\u043f\u0438\u0441\u043e\u043a"}
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u0426\u0438\u0442\u0430\u0442\u0430"}
          active={editor.isActive("blockquote")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u0411\u043b\u043e\u043a \u043a\u043e\u0434\u0430"}
          active={editor.isActive("codeBlock")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <span className="font-mono text-xs font-black">{"</>"}</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title={"\u0412\u044b\u0440\u043e\u0432\u043d\u044f\u0442\u044c \u043f\u043e \u043b\u0435\u0432\u043e\u043c\u0443 \u043a\u0440\u0430\u044e"}
          active={editor.isActive({ textAlign: "left" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u0412\u044b\u0440\u043e\u0432\u043d\u044f\u0442\u044c \u043f\u043e \u0446\u0435\u043d\u0442\u0440\u0443"}
          active={editor.isActive({ textAlign: "center" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u0412\u044b\u0440\u043e\u0432\u043d\u044f\u0442\u044c \u043f\u043e \u043f\u0440\u0430\u0432\u043e\u043c\u0443 \u043a\u0440\u0430\u044e"}
          active={editor.isActive({ textAlign: "right" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u0412\u044b\u0440\u043e\u0432\u043d\u044f\u0442\u044c \u043f\u043e \u0448\u0438\u0440\u0438\u043d\u0435"}
          active={editor.isActive({ textAlign: "justify" })}
          disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>

        <Divider />

        {RICH_TEXT_COLOR_PALETTE.map((item) => {
          const active = item.color
            ? editor.isActive("textStyle", { color: item.color })
            : !editor.getAttributes("textStyle")?.color;

          return (
            <button
              key={item.key}
              type="button"
              title={item.color ? `\u0426\u0432\u0435\u0442 \u0442\u0435\u043a\u0441\u0442\u0430: ${item.label}` : "\u041e\u0431\u044b\u0447\u043d\u044b\u0439 \u0446\u0432\u0435\u0442 \u0442\u0435\u043a\u0441\u0442\u0430"}
              aria-label={item.color ? `\u0426\u0432\u0435\u0442 \u0442\u0435\u043a\u0441\u0442\u0430: ${item.label}` : "\u041e\u0431\u044b\u0447\u043d\u044b\u0439 \u0446\u0432\u0435\u0442 \u0442\u0435\u043a\u0441\u0442\u0430"}
              disabled={disabled}
              onClick={() => {
                if (item.color) {
                  editor.chain().focus().setColor(item.color).run();
                } else {
                  editor.chain().focus().unsetColor().run();
                }
              }}
              className={`${getRichTextColorButtonClass(active)} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="relative inline-flex h-6 w-5 items-center justify-center text-sm font-black leading-none">
                A
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
                  style={{ backgroundColor: item.color || "#111827" }}
                />
              </span>
            </button>
          );
        })}

        <Divider />

        <ToolbarButton
          title={"\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c"}
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c"}
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          title={"\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0444\u043e\u0440\u043c\u0430\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435"}
          disabled={disabled}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <span className="text-sm leading-none">{"\u2298"}</span>
        </ToolbarButton>
      </div>

      {linkEditorOpen ? (
        <form
          data-testid="lesson-rich-text-link-editor"
          onSubmit={handleLinkSubmit}
          className="mt-3 flex flex-wrap items-center gap-2 rounded-[1.25rem] bg-blue-50/80 p-3 ring-1 ring-blue-100"
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Ссылка</span>
            <input
              type="url"
              autoFocus
              value={linkInputValue}
              onChange={(event) => setLinkInputValue(event.target.value)}
              placeholder="https://example.ru/material"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 transition focus-visible:outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-blue-700"
          >
            Применить
          </button>

          <button
            type="button"
            onClick={() => applyEditorLink(editor, "")}
            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Убрать
          </button>

          <button
            type="button"
            onClick={closeLinkEditor}
            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Отмена
          </button>
        </form>
      ) : null}

      <div
        data-testid="lesson-rich-text-editor-surface"
        className="mt-3 rounded-xl bg-white p-2 ring-1 ring-slate-200 shadow-inner [&_.ProseMirror_span]:break-words [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-slate-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-blue-200 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-slate-600 [&_.ProseMirror_code]:rounded-md [&_.ProseMirror_code]:bg-slate-100 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:font-mono [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-black [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-black [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_p]:my-2 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-2xl [&_.ProseMirror_pre]:bg-slate-950 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:text-slate-50 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_a]:font-bold [&_.ProseMirror_a]:text-blue-700 [&_.ProseMirror_a]:underline"
      >
        <EditorContent editor={editor} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-slate-500">
          Совет: короткие абзацы, подзаголовки и списки делают урок понятнее для обучающегося.
        </div>
        <div
          data-testid="lesson-rich-text-character-count"
          className={`rounded-full px-3 py-1.5 font-bold ring-1 ${
            characterLimitReached
              ? "bg-red-50 text-red-700 ring-red-200"
              : "bg-white text-slate-600 ring-slate-200"
          }`}
        >
          {words} слов · {characters}/{RICH_TEXT_CHARACTER_LIMIT} символов
        </div>
      </div>
    </div>
  );
}

export default LessonRichTextEditor;
