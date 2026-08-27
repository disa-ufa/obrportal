function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableHash(value) {
  const source = `${value || ""}`;
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function stableShuffle(items, seed, getId) {
  return [...items].sort((left, right) => {
    const leftId = getId(left);
    const rightId = getId(right);

    const leftRank = stableHash(
      `${seed}:${leftId}`
    );

    const rightRank = stableHash(
      `${seed}:${rightId}`
    );

    if (leftRank === rightRank) {
      return `${leftId}`.localeCompare(`${rightId}`);
    }

    return leftRank - rightRank;
  });
}

export default function LessonQuizQuestionView({
  question,
  questionId,
  value,
  disabled,
  seed,
  onChange,
}) {
  const type = `${question?.type || ""}`.trim();

  const rawOptions = asArray(
    question?.options
  );

  const shouldShuffleOptions = Boolean(
    question?.shuffle_options
  );

  const options = shouldShuffleOptions
    ? stableShuffle(
        rawOptions,
        `${seed}:${questionId}`,
        (option) => option?.id || ""
      )
    : rawOptions;

  if (type === "single_choice") {
    return (
      <div className="mt-4 grid gap-2">
        {options.map((option) => {
          const optionId = `${option?.id || ""}`;

          return (
            <label
              key={optionId}
              className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition hover:ring-blue-300"
            >
              <input
                type="radio"
                name={`quiz-${questionId}`}
                checked={`${value ?? ""}` === optionId}
                disabled={disabled}
                onChange={() => onChange(optionId)}
                className="mt-1"
              />

              <span className="text-sm font-semibold leading-6 text-slate-800">
                {option?.text || "\u0412\u0430\u0440\u0438\u0430\u043d\u0442"}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (type === "multiple_choice") {
    const selected = Array.isArray(value)
      ? value
      : [];

    return (
      <div className="mt-4 grid gap-2">
        {options.map((option) => {
          const optionId = `${option?.id || ""}`;
          const checked = selected.includes(optionId);

          return (
            <label
              key={optionId}
              className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition hover:ring-blue-300"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  const nextValue = checked
                    ? selected.filter(
                        (item) => item !== optionId
                      )
                    : [
                        ...selected,
                        optionId,
                      ];

                  onChange(nextValue);
                }}
                className="mt-1"
              />

              <span className="text-sm font-semibold leading-6 text-slate-800">
                {option?.text || "\u0412\u0430\u0440\u0438\u0430\u043d\u0442"}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (type === "true_false") {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {[true, false].map((optionValue) => (
          <label
            key={`${optionValue}`}
            className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 transition hover:ring-blue-300"
          >
            <input
              type="radio"
              name={`quiz-${questionId}`}
              checked={value === optionValue}
              disabled={disabled}
              onChange={() => onChange(optionValue)}
            />

            <span className="text-sm font-semibold text-slate-800">
              {optionValue
                ? "\u0412\u0435\u0440\u043d\u043e"
                : "\u041d\u0435\u0432\u0435\u0440\u043d\u043e"}
            </span>
          </label>
        ))}
      </div>
    );
  }

  if (type === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        placeholder="\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043b\u043e"
      />
    );
  }

  if (type === "short_text") {
    return (
      <textarea
        value={value ?? ""}
        disabled={disabled}
        rows={3}
        maxLength={10000}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-4 min-h-[96px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        placeholder="\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043e\u0442\u0432\u0435\u0442"
      />
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
      {"\u0422\u0438\u043f \u0432\u043e\u043f\u0440\u043e\u0441\u0430 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f."}
    </div>
  );
}

export function LessonQuizQuestionCard({
  question,
  index,
  showPoints = true,
  testId,
  children,
}) {
  return (
    <article
      data-testid={testId}
      data-question-type={question?.type || ""}
      className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {"\u0412\u043e\u043f\u0440\u043e\u0441"} {index + 1}
          </div>

          <div className="mt-1 text-base font-black leading-6 text-slate-950">
            {question?.title || "\u0411\u0435\u0437 \u0442\u0435\u043a\u0441\u0442\u0430 \u0432\u043e\u043f\u0440\u043e\u0441\u0430"}
          </div>

          {question?.description ? (
            <div className="mt-2 text-sm leading-6 text-slate-600">
              {question.description}
            </div>
          ) : null}
        </div>

        {showPoints ? (
          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            {Number(question?.points || 0)} {"\u0431\u0430\u043b\u043b."}
          </span>
        ) : null}
      </div>

      {children}
    </article>
  );
}

export function LessonQuizShell({
  title,
  description,
  required = false,
  testId,
  presentationView,
  children,
}) {
  return (
    <section
      data-testid={testId}
      data-presentation-view={presentationView || undefined}
      className="rounded-3xl bg-blue-50/70 p-5 ring-1 ring-blue-100"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
            {"\u0418\u043d\u0442\u0435\u0440\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u0442\u0435\u0441\u0442"}
          </div>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            {title || "\u0422\u0435\u0441\u0442"}
          </h3>

          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>

        {required ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
            {"\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e"}
          </span>
        ) : null}
      </div>

      {children}
    </section>
  );
}
