import { useId } from "react";

export function AuthField({
  id,
  label,
  hint,
  error,
  required = false,
  className = "",
  inputClassName = "",
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [
    inputProps["aria-describedby"],
    hint ? hintId : "",
    error ? errorId : "",
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div data-testid="auth-field" className={className}>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        {...inputProps}
        id={inputId}
        required={required}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:ring-4 ${
          error
            ? "border-red-300 focus-visible:border-red-400 focus-visible:ring-red-100"
            : "border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-100"
        } ${inputClassName}`}
      />

      {hint && !error && (
        <p id={hintId} className="mt-2 text-xs leading-5 text-slate-500">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs font-semibold leading-5 text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
