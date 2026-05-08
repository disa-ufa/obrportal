import { formatApiError } from "../utils/apiErrors";
import { getAdminAuditEvents } from "../api/client";

export function useAdminAuditActions({
  setAdminData,
  setAdminDataLoadedAt,
  setAdminLoading,
  setError,
  clearSelectedAuditEvent,
  getNowLabel,
}) {
  async function handleApplyAuditFilters(filters) {
    setAdminLoading(true);
    setError("");
    clearSelectedAuditEvent();

    try {
      const auditEvents = await getAdminAuditEvents(filters);

      setAdminData((current) => ({
        ...current,
        auditEvents,
      }));
      setAdminDataLoadedAt(getNowLabel());

      return auditEvents;
    } catch (err) {
      setError(formatApiError(err, "Не удалось загрузить журнал аудита."));

      throw err;
    } finally {
      setAdminLoading(false);
    }
  }

  return {
    handleApplyAuditFilters,
  };
}
