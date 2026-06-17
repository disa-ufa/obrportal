import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { useEffect, useState } from "react";

const RICH_TEXT_CHARACTER_LIMIT = 20000;

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
    "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-3 text-xs font-black ring-1 transition focus:outline-none focus:ring-2 focus:ring-blue-200",
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
  return <span aria-hidden="true" className="h-6 w-px bg-slate-200" />;
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
          "min-h-64 rounded-[1.25rem] bg-white px-5 py-5 text-[15px] leading-7 text-slate-900 outline-none transition",
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
    <div data-testid="lesson-rich-text-editor" className="mt-2 rounded-[1.75rem] bg-gradient-to-b from-slate-50 to-white p-3 ring-1 ring-slate-200">
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
            Ссылка
          </button>
          <button
            type="button"
            data-testid="lesson-rich-text-bubble-code"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`rounded-xl px-2 py-1 text-xs font-black transition ${
              editor.isActive("code") ? "bg-white text-slate-950" : "hover:bg-white/10"
            }`}
          >
            Код
          </button>
        </BubbleMenu>
      ) : null}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-slate-200">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-slate-700">
            Редактор учебного текста
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Структурируйте материал заголовками, списками, цитатами и ссылками.
          </div>
        </div>

        <div className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
          Ctrl+B · Ctrl+I · Enter
        </div>
      </div>

      <div
        data-testid="lesson-rich-text-toolbar"
        className="flex flex-wrap items-center gap-2 rounded-[1.35rem] bg-white/95 p-2.5 ring-1 ring-slate-200 shadow-sm"
        role="toolbar"
        aria-label="Панель форматирования учебного текста"
      >
        <ToolbarButton
          title="Абзац"
          active={editor.isActive("paragraph")}
          disabled={disabled}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          Абзац
        </ToolbarButton>
        <ToolbarButton
          title="Заголовок H2"
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2 Заголовок
        </ToolbarButton>
        <ToolbarButton
          title="Заголовок H3"
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3 Подзаг.
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Жирный"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Жирный
        </ToolbarButton>
        <ToolbarButton
          title="Курсив"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">Курсив</span>
        </ToolbarButton>
        <ToolbarButton
          title="Код в строке"
          active={editor.isActive("code")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          Код
        </ToolbarButton>
        <ToolbarButton
          title="Ссылка"
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={openLinkEditor}
        >
          Ссылка
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Маркированный список"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Список
        </ToolbarButton>
        <ToolbarButton
          title="Нумерованный список"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Нумер.
        </ToolbarButton>
        <ToolbarButton
          title="Цитата"
          active={editor.isActive("blockquote")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Цитата
        </ToolbarButton>
        <ToolbarButton
          title="Блок кода"
          active={editor.isActive("codeBlock")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          Блок кода
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Отменить"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          Назад
        </ToolbarButton>
        <ToolbarButton
          title="Повторить"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          Вперёд
        </ToolbarButton>
        <ToolbarButton
          title="Очистить форматирование"
          disabled={disabled}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          Очистить
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
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
        className="mt-3 rounded-[1.35rem] bg-white p-2 ring-1 ring-slate-200 shadow-inner [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-slate-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-blue-200 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-slate-600 [&_.ProseMirror_code]:rounded-md [&_.ProseMirror_code]:bg-slate-100 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:font-mono [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-black [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-black [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_p]:my-2 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-2xl [&_.ProseMirror_pre]:bg-slate-950 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:text-slate-50 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_a]:font-bold [&_.ProseMirror_a]:text-blue-700 [&_.ProseMirror_a]:underline"
      >
        <EditorContent editor={editor} />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-slate-500">
          Совет: короткие абзацы, подзаголовки и списки делают урок понятнее для обучающегося.
        </div>
        <div
          data-testid="lesson-rich-text-character-count"
          className={`rounded-full px-2.5 py-1 font-bold ring-1 ${
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
