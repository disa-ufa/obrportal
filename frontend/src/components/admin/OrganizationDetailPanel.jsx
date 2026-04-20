import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";

export function OrganizationDetailPanel({
  organizationDetail,
  loading,
  error,
  onClose,
}) {
  return (
    <SectionCard
      title="Карточка организации"
      subtitle="Детальные данные из GET /api/v1/admin/organizations/{organization_id}."
    >
      {!organizationDetail && !loading && !error && (
        <p className="text-sm text-slate-600">
          Выберите организацию в таблице, чтобы открыть карточку.
        </p>
      )}

      {loading && <LoadingBlock text="Загружаем карточку организации..." />}

      {error && (
        <Alert title="Не удалось загрузить организацию" tone="red">
          {error}
        </Alert>
      )}

      {organizationDetail && !loading && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {organizationDetail.name}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                ИНН: {organizationDetail.inn}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Закрыть
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="blue">organization</StatusBadge>
            <StatusBadge tone={organizationDetail.kpp ? "green" : "gray"}>
              kpp: {organizationDetail.kpp ? "filled" : "empty"}
            </StatusBadge>
            <StatusBadge tone={organizationDetail.ogrn ? "green" : "gray"}>
              ogrn: {organizationDetail.ogrn ? "filled" : "empty"}
            </StatusBadge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="ID" value={organizationDetail.id} />
            <DetailField label="ИНН" value={organizationDetail.inn} />
            <DetailField label="КПП" value={organizationDetail.kpp} />
            <DetailField label="ОГРН" value={organizationDetail.ogrn} />
            <DetailField label="Создана" value={formatDetailDate(organizationDetail.created_at)} />
            <DetailField label="Обновлена" value={formatDetailDate(organizationDetail.updated_at)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="Юридический адрес" value={organizationDetail.legal_address} />
            <DetailField label="Фактический адрес" value={organizationDetail.actual_address} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}
