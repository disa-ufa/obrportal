import { Check } from "lucide-react";

export function AuthSteps({
  steps = [],
  activeStep = 0,
  className = "",
}) {
  return (
    <ol
      data-testid="auth-steps"
      className={`space-y-3 ${className}`}
      aria-label="Этапы авторизации"
    >
      {steps.map((step, index) => {
        const normalizedStep =
          typeof step === "string"
            ? { title: step, description: "" }
            : step;

        const completed = index < activeStep;
        const active = index === activeStep;

        return (
          <li
            key={`${normalizedStep.title}-${index}`}
            className="flex items-start gap-3"
            aria-current={active ? "step" : undefined}
          >
            <span
              className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ring-1 ${
                completed
                  ? "bg-emerald-500 text-white ring-emerald-400"
                  : active
                    ? "bg-white text-blue-700 ring-blue-200"
                    : "bg-white/10 text-blue-100 ring-white/20"
              }`}
            >
              {completed ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>

            <span>
              <span className="block font-bold text-white">
                {normalizedStep.title}
              </span>

              {normalizedStep.description && (
                <span className="mt-1 block text-sm leading-5 text-blue-100">
                  {normalizedStep.description}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
