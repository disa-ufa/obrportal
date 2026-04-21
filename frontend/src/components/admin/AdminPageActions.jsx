import { ActionButton } from "../ui/ActionButton";

export function AdminPageActions({
  loading = false,
  onRefresh,
  refreshLabel = "Обновить",
  refreshingLabel = "Обновляем...",
  primaryLabel,
  primaryTone = "blue",
  primaryDisabled = false,
  onPrimaryClick,
  children,
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {onRefresh && (
        <ActionButton
          type="button"
          tone="light"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? refreshingLabel : refreshLabel}
        </ActionButton>
      )}

      {primaryLabel && onPrimaryClick && (
        <ActionButton
          type="button"
          tone={primaryTone}
          onClick={onPrimaryClick}
          disabled={loading || primaryDisabled}
        >
          {primaryLabel}
        </ActionButton>
      )}

      {children}
    </div>
  );
}
