import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({
  id,
  label = "Пароль",
  hint,
  error,
  required = false,
  className = "",
  inputClassName = "",
  icon: Icon,
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const [passwordVisible, setPasswordVisible] = useState(false);

  const describedBy = [
    inputProps["aria-describedby"],
    hint ? hintId : "",
    error ? errorId : "",
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div data-testid="password-field" className={className}>
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

      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        )}

        <input
          {...inputProps}
          id={inputId}
          type={passwordVisible ? "text" : "password"}
          required={required}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-2xl border bg-white pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:ring-4 ${
            Icon ? "pl-11" : "pl-4"
          } ${
            error
              ? "border-red-300 focus-visible:border-red-400 focus-visible:ring-red-100"
              : "border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-100"
          } ${inputClassName}`}
        />

        <button
          type="button"
          onClick={() => setPasswordVisible((current) => !current)}
          aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
          aria-pressed={passwordVisible}
          className="absolute inset-y-0 right-1 my-auto inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          {passwordVisible ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

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
