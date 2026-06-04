import { useState } from "react";
import { Link } from "react-router-dom";
import {
  OrganizationForm,
  ORGANIZATION_API_ERROR_MESSAGES,
  formatOrganizationApiError,
} from "./OrganizationForm";
import { ActionButton } from "../ui/ActionButton";
import { Alert } from "../ui/Alert";
import { DetailField, formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { SectionCard } from "../ui/SectionCard";
import { StatusBadge } from "../ui/StatusBadge";
import { buildAuditPath, buildDocumentsPath, buildEnrollmentsPath, buildGroupsPath } from "../../utils/adminLinks";

const ORGANIZATION_DOCUMENT_PROFILE_FIELDS = [
  { key: "document_issuer_name", label: "организация-выдавшая документ" },
  { key: "document_signer_position", label: "должность подписанта" },
  { key: "document_signer_name", label: "ФИО подписанта" },
  { key: "document_basis", label: "основание выдачи" },
  { key: "document_place", label: "место выдачи" },
];

function getOrganizationAttentionItems(organization) {
  const items = [];

  if (!organization) {
    return items;
  }

  if (!organization.kpp) {
    items.push("КПП: не заполнен, проверьте реквизиты юридического лица.");
  }

  if (!organization.ogrn) {
    items.push("ОГРН: не заполнен, проверьте регистрационные данные организации.");
  }

  if (!organization.legal_address) {
    items.push("Юридический адрес: не заполнен.");
  }

  if (!organization.actual_address) {
    items.push("Фактический адрес: не заполнен.");
  }

  const missingProfileFields = ORGANIZATION_DOCUMENT_PROFILE_FIELDS.filter(
    (field) => !String(organization[field.key] || "").trim()
  );

  if (missingProfileFields.length > 0) {
    items.push(
      `PDF-профиль: не заполнено полей — ${missingProfileFields.length}. Заполните ${missingProfileFields
        .map((field) => field.label)
        .join(", ")}.`
    );
  }

  return [...new Set(items)];
}

export function OrganizationDetailPanel({
  organizationDetail,
  loading,
  error,
  onClose,
  onUpdateOrganization,
  onDeleteOrganization,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const organizationAttentionItems = getOrganizationAttentionItems(organizationDetail);

  function handleClose() {
    setIsEditing(false);
    setActionError("");
    onClose();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Удалить организацию? Действие нельзя отменить. Организацию нельзя удалить, если она используется в назначениях ролей пользователей."
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setActionError("");

    try {
      await onDeleteOrganization(organizationDetail.id);
      setIsEditing(false);
    } catch (err) {
      setActionError(formatOrganizationApiError(err, ORGANIZATION_API_ERROR_MESSAGES.deleteFailed));
    } finally {
      setDeleting(false);
    }
  }

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

            <div className="flex flex-wrap gap-2">
              {!isEditing && (
                <ActionButton
                  type="button"
                  tone="blue"
                  onClick={() => setIsEditing(true)}
                >
                  Редактировать
                </ActionButton>
              )}

              {!isEditing && (
                <ActionButton
                  type="button"
                  tone="red"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Удаляем..." : "Удалить"}
                </ActionButton>
              )}

              <ActionButton
                type="button"
                tone="light"
                onClick={handleClose}
              >
                Закрыть
              </ActionButton>
            </div>
          </div>

          {actionError && (
            <Alert title="Не удалось выполнить действие" tone="red">
              {actionError}
            </Alert>
          )}

          {isEditing ? (
            <OrganizationForm
              initialValues={organizationDetail}
              submitLabel="Сохранить изменения"
              successMessage="Организация обновлена."
              errorMessage={ORGANIZATION_API_ERROR_MESSAGES.updateFailed}
              onSubmit={(payload) => onUpdateOrganization(organizationDetail.id, payload)}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => setIsEditing(false)}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="blue">organization</StatusBadge>
                <StatusBadge tone={organizationDetail.kpp ? "green" : "gray"}>
                  kpp: {organizationDetail.kpp ? "filled" : "empty"}
                </StatusBadge>
                <StatusBadge tone={organizationDetail.ogrn ? "green" : "gray"}>
                  ogrn: {organizationDetail.ogrn ? "filled" : "empty"}
                </StatusBadge>
              </div>

              {organizationAttentionItems.length > 0 && (
                <div
                  data-testid="organization-attention-diagnostics"
                  className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">
                      Что требует внимания в организации
                    </div>
                    <span
                      data-testid="organization-attention-count"
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                    >
                      Пунктов внимания: {organizationAttentionItems.length}
                    </span>
                  </div>
                  <p
                    data-testid="organization-attention-diagnostics-note"
                    className="mt-2 leading-6"
                  >
                    Диагностика основана на реквизитах, адресах, PDF-профиле организации и блоке «Реквизиты для генерируемых документов».
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {organizationAttentionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                data-testid="organization-related-records-links"
                className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"
              >
                <div className="font-semibold text-slate-900">
                  Связанные записи
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Быстрые переходы в назначения и документы, отфильтрованные по этой организации.
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    data-testid="organization-groups-link"
                    to={buildGroupsPath({ organization_id: organizationDetail.id })}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
                  >
                    Группы организации
                  </Link>

                  <Link
                    to={buildEnrollmentsPath({ organization_id: organizationDetail.id })}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
                  >
                    Назначения организации
                  </Link>

                  <Link
                    to={buildDocumentsPath({ organization_id: organizationDetail.id })}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
                  >
                    Документы организации
                  </Link>

                  <Link
                    data-testid="organization-action-required-enrollments-link"
                    to={buildEnrollmentsPath({
                      organization_id: organizationDetail.id,
                      action_required: "true",
                    })}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                  >
                    Проблемные назначения
                  </Link>

                  <Link
                    data-testid="organization-action-required-documents-link"
                    to={buildDocumentsPath({
                      organization_id: organizationDetail.id,
                      action_required: "true",
                    })}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                  >
                    Проблемные документы
                  </Link>

                  <Link
                    data-testid="organization-audit-link"
                    to={buildAuditPath({ entity_type: "organization", entity_id: organizationDetail.id })}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
                  >
                    Аудит организации
                  </Link>
                </div>
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

              <div
                data-testid="organization-document-profile-card"
                className="rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100"
              >
                <div className="font-semibold text-slate-900">
                  Профиль итогового PDF
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Эти значения используются в PDF-шаблонах удостоверений, сертификатов и справок: организация-выдавшая документ, место выдачи, подписант и основание выдачи. Если поле пустое, при генерации документа может использоваться fallback-настройка приложения.
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <DetailField
                    label="Организация-выдавшая документ"
                    value={organizationDetail.document_issuer_name}
                  />
                  <DetailField
                    label="Место выдачи"
                    value={organizationDetail.document_place}
                  />
                  <DetailField
                    label="Должность подписанта"
                    value={organizationDetail.document_signer_position}
                  />
                  <DetailField
                    label="ФИО подписанта"
                    value={organizationDetail.document_signer_name}
                  />
                  <DetailField
                    label="Основание выдачи"
                    value={organizationDetail.document_basis}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}
