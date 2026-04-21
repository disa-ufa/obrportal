import { ActionButton } from "../ui/ActionButton";

export function AdminFilterPanel({
  children,
  columnsClassName = "lg:grid-cols-[1fr_260px_auto]",
  onReset,
  resetDisabled = false,
  resetLabel = "Сбросить",
  summary,
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className={`grid gap-4 ${columnsClassName} lg:items-end`}>
        {children}

        {onReset && (
          <ActionButton
            type="button"
            tone="light"
            onClick={onReset}
            disabled={resetDisabled}
          >
            {resetLabel}
          </ActionButton>
        )}
      </div>

      {summary && (
        <div className="mt-3 text-xs text-slate-500">
          {summary}
        </div>
      )}
    </div>
  );
}
