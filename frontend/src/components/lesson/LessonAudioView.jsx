export default function LessonAudioView({
  title = "",
  sourceUrl = "",
}) {
  const ready = Boolean(sourceUrl);
  const resolvedTitle = `${title || "Аудио"}`.trim() || "Аудио";

  return (
    <section
      data-testid="learner-content-audio"
      data-presentation-view="lesson-audio"
      className="mt-5"
    >
      <div className="mb-3 text-xl font-black leading-tight text-slate-950">
        {resolvedTitle}
      </div>

      <div className="rounded-3xl bg-green-50 p-5 ring-1 ring-green-100">
        {ready ? (
          <audio
            data-testid="learner-content-audio-player"
            controls
            preload="metadata"
            src={sourceUrl}
            className="w-full"
          >
            {"Ваш браузер не поддерживает аудиоплеер."}
          </audio>
        ) : (
          <div
            data-testid="learner-content-audio-unavailable"
            className="rounded-2xl bg-white/70 px-4 py-6 text-center text-sm font-semibold text-slate-500 ring-1 ring-green-100"
          >
            {"Аудио временно недоступно."}
          </div>
        )}
      </div>
    </section>
  );
}
