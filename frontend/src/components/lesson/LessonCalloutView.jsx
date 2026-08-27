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


export default function LessonCalloutView({
  title = "",
  text = "",
  toneName = "info",
}) {
  const resolvedToneName = `${toneName || "info"}`.trim() || "info";

  const tone = (
    CALLOUT_TONES[resolvedToneName]
    || CALLOUT_TONES.info
  );

  return (
    <section
      data-testid="learner-content-callout"
      data-presentation-view="lesson-callout"
      data-tone={resolvedToneName}
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
        {title || tone.label}
      </h3>

      <div
        className={`mt-3 whitespace-pre-wrap break-words text-base font-semibold leading-7 sm:text-lg sm:leading-8 ${tone.text}`}
      >
        {text || "\u0421\u043e\u0434\u0435\u0440\u0436\u0430\u043d\u0438\u0435 \u0432\u0440\u0435\u0437\u043a\u0438 \u043f\u043e\u043a\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043e."}
      </div>
    </section>
  );
}
