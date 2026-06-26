import { useState } from "react";
import { Link } from "react-router-dom";
import {
  OrganizationForm,
  ORGANIZATION_API_ERROR_MESSAGES,
  formatOrganizationApiError,
} from "./OrganizationForm";
import { Alert } from "../ui/Alert";
import { formatDetailDate } from "../ui/DetailField";
import { LoadingBlock } from "../ui/LoadingBlock";
import { StatusBadge } from "../ui/StatusBadge";
import { buildDocumentsPath, buildEnrollmentsPath, buildGroupsPath } from "../../utils/adminLinks";

const TEXT = {
  loading: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438...",
  loadErrorTitle: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e",
  actionErrorTitle: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
  deleteConfirm: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e? \u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435\u043b\u044c\u0437\u044f \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c. \u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044e \u043d\u0435\u043b\u044c\u0437\u044f \u0443\u0434\u0430\u043b\u0438\u0442\u044c, \u0435\u0441\u043b\u0438 \u043e\u043d\u0430 \u0443\u0436\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f.",
  edit: "\u0420\u0435\u0434\u0430\u043a\u0442.",
  editFull: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
  delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
  close: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
  more: "\u0415\u0449\u0451",
  groups: "\u0413\u0440\u0443\u043f\u043f\u044b",
  enrollments: "\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f",
  documents: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  attention: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f",
  profile: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c",
  profileSubtitle: "\u0420\u0435\u043a\u0432\u0438\u0437\u0438\u0442\u044b \u0438 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u044e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u043b\u0438\u0446\u0430.",
  access: "\u041a\u043e\u043c\u0430\u043d\u0434\u0430 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f",
  accessSubtitle: "\u0421\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0435 \u0433\u0440\u0443\u043f\u043f\u044b, \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0438 \u0440\u043e\u043b\u0438.",
  assignAccess: "\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f",
  assignSubtitle: "\u0414\u043e\u0441\u0442\u0443\u043f \u043a \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438 \u043d\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0447\u0435\u0440\u0435\u0437 \u0440\u043e\u043b\u0438 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439.",
  pdf: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c PDF",
  pdfSubtitle: "\u0414\u0430\u043d\u043d\u044b\u0435 \u0434\u043b\u044f \u0438\u0442\u043e\u0433\u043e\u0432\u044b\u0445 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432.",
  related: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0438 \u0437\u0430\u043f\u0438\u0441\u0438",
  relatedSubtitle: "\u0411\u044b\u0441\u0442\u0440\u044b\u0435 \u043f\u0435\u0440\u0435\u0445\u043e\u0434\u044b \u0432 \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0435 \u0440\u0430\u0437\u0434\u0435\u043b\u044b.",
  addresses: "\u0410\u0434\u0440\u0435\u0441\u0430",
  addressesSubtitle: "\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0438 \u0444\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u0434\u0440\u0435\u0441.",
  activity: "\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c",
  activitySubtitle: "\u0421\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0435 \u0434\u0430\u0442\u044b \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438.",
  editFormTitle: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
  saveChanges: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f",
  updated: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0430.",
  openGroups: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0433\u0440\u0443\u043f\u043f\u044b",
  openEnrollments: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f",
  openDocuments: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
  configured: "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u043e",
  notConfigured: "\u041d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043e",
  noData: "-",
  created: "\u0421\u043e\u0437\u0434\u0430\u043d\u0430",
  changed: "\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0430",
};

const DOCUMENT_PROFILE_FIELDS = [
  {
    key: "document_issuer_name",
    label: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f-\u0432\u044b\u0434\u0430\u0432\u0448\u0430\u044f",
  },
  {
    key: "document_signer_position",
    label: "\u0414\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u044c",
  },
  {
    key: "document_signer_name",
    label: "\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0442",
  },
  {
    key: "document_basis",
    label: "\u041e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u0435",
  },
  {
    key: "document_place",
    label: "\u041c\u0435\u0441\u0442\u043e \u0432\u044b\u0434\u0430\u0447\u0438",
  },
];

function hasValue(value) {
  return Boolean(String(value || "").trim());
}

function isDocumentProfileComplete(organization) {
  return DOCUMENT_PROFILE_FIELDS.every((field) => hasValue(organization?.[field.key]));
}

function getOrganizationAttentionItems(organization) {
  if (!organization) {
    return [];
  }

  const items = [];

  if (!hasValue(organization.kpp)) {
    items.push("\u041a\u041f\u041f \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d");
  }

  if (!hasValue(organization.ogrn)) {
    items.push("\u041e\u0413\u0420\u041d \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d");
  }

  if (!hasValue(organization.legal_address)) {
    items.push("\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u0434\u0440\u0435\u0441 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d");
  }

  if (!hasValue(organization.actual_address)) {
    items.push("\u0424\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u0434\u0440\u0435\u0441 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d");
  }

  if (!isDocumentProfileComplete(organization)) {
    items.push("\u041f\u0440\u043e\u0444\u0438\u043b\u044c PDF \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d \u043d\u0435 \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e");
  }

  return items;
}

function getOrganizationInitials(name) {
  const normalized = String(name || "ORG")
    .replace(/[??"']/g, " ")
    .trim();

  const parts = normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "??";
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}

function InfoTile({ label, value, compact = false }) {
  return (
    <div className={`rounded-xl bg-slate-50 ring-1 ring-slate-100 ${compact ? "p-3" : "p-4"}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value || TEXT.noData}
      </div>
    </div>
  );
}

function DashboardCard({ testId, title, subtitle, badge, children }) {
  return (
    <div
      data-testid={testId}
      className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-950">
            {title}
          </div>
          {subtitle && (
            <div className="mt-1 text-xs font-medium leading-5 text-slate-500">
              {subtitle}
            </div>
          )}
        </div>

        {badge && (
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-50 px-2 text-xs font-black text-slate-500 ring-1 ring-slate-200">
            {badge}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}

function LinkRow({ to, label, count, tone = "slate" }) {
  const toneClass = tone === "amber"
    ? "text-amber-800 hover:bg-amber-50"
    : "text-slate-700 hover:bg-slate-50";

  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold ring-1 ring-slate-100 transition ${toneClass}`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
        {count ?? "?"}
      </span>
    </Link>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-100">
      <span className="font-semibold text-slate-500">
        {label}
      </span>
      <span className="max-w-[58%] break-words text-right font-black text-slate-900">
        {value || TEXT.noData}
      </span>
    </div>
  );
}

function PanelActionButton({ icon, label, title, danger = false, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={title || label}
      className="group inline-flex min-w-[72px] flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={`inline-flex h-8 min-w-[72px] items-center justify-center rounded-xl bg-white px-3 text-xs font-semibold ring-1 transition group-hover:bg-slate-50 ${
          danger ? "text-red-600 ring-red-100 group-hover:bg-red-50" : "text-slate-600 ring-slate-200"
        }`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
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

  const attentionItems = getOrganizationAttentionItems(organizationDetail);
  const pdfReady = isDocumentProfileComplete(organizationDetail);

  function handleClose() {
    setIsEditing(false);
    setActionError("");
    onClose();
  }

  async function handleDelete() {
    const confirmed = window.confirm(TEXT.deleteConfirm);

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

  if (!organizationDetail && !loading && !error) {
    return null;
  }

  return (
    <div data-testid="admin-organization-detail-content" className="space-y-4">
      {loading && <LoadingBlock text={TEXT.loading} />}

      {error && (
        <Alert title={TEXT.loadErrorTitle} tone="red">
          {error}
        </Alert>
      )}

      {organizationDetail && !loading && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-200">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                {getOrganizationInitials(organizationDetail.name)}
              </span>

              <div className="min-w-0">
                <div className="truncate text-base font-black text-slate-950">
                  {organizationDetail.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span>{"\u0418\u041d\u041d"} {organizationDetail.inn || TEXT.noData}</span>
                  {organizationDetail.kpp && <span>{"\u041a\u041f\u041f"} {organizationDetail.kpp}</span>}
                </div>
              </div>
            </div>

            <div
              data-testid="admin-organization-detail-actions"
              className="flex flex-wrap items-start justify-end gap-3"
            >
              {!isEditing && (
                <PanelActionButton
                  icon={"\u270e"}
                  label={TEXT.edit}
                  title={TEXT.editFull}
                  onClick={() => setIsEditing(true)}
                  disabled={deleting}
                />
              )}

              {!isEditing && (
                <PanelActionButton
                  icon={deleting ? "..." : "\u232b"}
                  label={TEXT.delete}
                  title={TEXT.delete}
                  danger
                  onClick={handleDelete}
                  disabled={deleting}
                />
              )}

              <PanelActionButton
                icon={"\u00d7"}
                label={TEXT.close}
                title={TEXT.close}
                onClick={handleClose}
                disabled={deleting}
              />

              <details className="relative">
                <summary
                  title={TEXT.more}
                  aria-label={TEXT.more}
                  className="inline-flex min-w-[48px] cursor-pointer list-none flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 transition"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
                    {"\u22ef"}
                  </span>
                  <span>{TEXT.more}</span>
                </summary>

                <div className="absolute right-0 z-30 mt-2 w-60 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
                  <Link
                    to={buildGroupsPath({ organization_id: organizationDetail.id })}
                    className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {TEXT.groups}
                  </Link>

                  <Link
                    to={buildEnrollmentsPath({ organization_id: organizationDetail.id })}
                    className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {TEXT.enrollments}
                  </Link>

                  <Link
                    to={buildDocumentsPath({ organization_id: organizationDetail.id })}
                    className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {TEXT.documents}
                  </Link>
                </div>
              </details>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="blue">organization</StatusBadge>
            <StatusBadge tone={organizationDetail.kpp ? "green" : "gray"}>
              {"\u041a\u041f\u041f"}
            </StatusBadge>
            <StatusBadge tone={organizationDetail.ogrn ? "green" : "gray"}>
              {"\u041e\u0413\u0420\u041d"}
            </StatusBadge>
            <StatusBadge tone={pdfReady ? "green" : "gray"}>
              {pdfReady ? "PDF OK" : "PDF"}
            </StatusBadge>
          </div>

          {actionError && (
            <Alert title={TEXT.actionErrorTitle} tone="red">
              {actionError}
            </Alert>
          )}

          {isEditing ? (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="mb-4">
                <div className="text-sm font-black text-slate-950">
                  {TEXT.editFormTitle}
                </div>
              </div>

              <OrganizationForm
                initialValues={organizationDetail}
                submitLabel={TEXT.saveChanges}
                successMessage={TEXT.updated}
                errorMessage={ORGANIZATION_API_ERROR_MESSAGES.updateFailed}
                onSubmit={(payload) => onUpdateOrganization(organizationDetail.id, payload)}
                onCancel={() => setIsEditing(false)}
                onSuccess={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <>
              {attentionItems.length > 0 && (
                <div
                  data-testid="organization-attention-diagnostics"
                  className="rounded-2xl bg-amber-50/70 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-amber-700 ring-1 ring-amber-200">
                      !
                    </span>

                    <span className="font-black text-slate-950">
                      {TEXT.attention}
                    </span>

                    {attentionItems.map((item) => (
                      <span key={item} className="inline-flex min-w-0 items-center gap-2">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                        <span className="truncate">{item}</span>
                      </span>
                    ))}

                    <span
                      data-testid="organization-attention-count"
                      className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-200"
                    >
                      {attentionItems.length}
                    </span>
                  </div>

                  <p data-testid="organization-attention-diagnostics-note" className="sr-only">
                    {"\u0414\u0438\u0430\u0433\u043d\u043e\u0441\u0442\u0438\u043a\u0430 \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0430 \u043d\u0430 \u0440\u0435\u043a\u0432\u0438\u0437\u0438\u0442\u0430\u0445, \u0430\u0434\u0440\u0435\u0441\u0430\u0445 \u0438 \u043f\u0440\u043e\u0444\u0438\u043b\u0435 PDF."}
                  </p>
                </div>
              )}

              <div
                data-testid="organization-dashboard-grid"
                className="grid gap-4 xl:grid-cols-3"
              >
                <DashboardCard
                  testId="organization-profile-card"
                  title={TEXT.profile}
                  subtitle={TEXT.profileSubtitle}
                  badge="ID"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoTile label="ID" value={organizationDetail.id} compact />
                    <InfoTile label={"\u0418\u041d\u041d"} value={organizationDetail.inn} compact />
                    <InfoTile label={"\u041a\u041f\u041f"} value={organizationDetail.kpp} compact />
                    <InfoTile label={"\u041e\u0413\u0420\u041d"} value={organizationDetail.ogrn} compact />
                    <InfoTile label={TEXT.created} value={formatDetailDate(organizationDetail.created_at)} compact />
                    <InfoTile label={TEXT.changed} value={formatDetailDate(organizationDetail.updated_at)} compact />
                  </div>
                </DashboardCard>

                <DashboardCard
                  testId="organization-access-card"
                  title={TEXT.access}
                  subtitle={TEXT.accessSubtitle}
                  badge="?"
                >
                  <div className="grid gap-2">
                    <LinkRow
                      to={buildGroupsPath({ organization_id: organizationDetail.id })}
                      label={TEXT.openGroups}
                    />
                    <LinkRow
                      to={buildEnrollmentsPath({ organization_id: organizationDetail.id })}
                      label={TEXT.openEnrollments}
                    />
                    <LinkRow
                      to={buildDocumentsPath({ organization_id: organizationDetail.id })}
                      label={TEXT.openDocuments}
                    />
                  </div>

                  <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 ring-1 ring-emerald-100">
                    {TEXT.configured}
                  </div>
                </DashboardCard>

                <DashboardCard
                  testId="organization-access-assignment-card"
                  title={TEXT.assignAccess}
                  subtitle={TEXT.assignSubtitle}
                >
                  <div className="grid gap-3">
                    <ProfileRow label={"\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c"} value={"\u0427\u0435\u0440\u0435\u0437 \u0440\u0430\u0437\u0434\u0435\u043b \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439"} />
                    <ProfileRow label={"\u0420\u043e\u043b\u044c"} value={"\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438"} />
                    <ProfileRow label={"\u0423\u0440\u043e\u0432\u0435\u043d\u044c"} value={"\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f"} />
                  </div>

                  <Link
                    to={buildGroupsPath({ organization_id: organizationDetail.id })}
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-black text-white transition hover:bg-blue-700"
                  >
                    {TEXT.assignAccess}
                  </Link>
                </DashboardCard>

                <DashboardCard
                  testId="organization-related-records-card"
                  title={TEXT.related}
                  subtitle={TEXT.relatedSubtitle}
                >
                  <div className="grid gap-2">
                    <LinkRow
                      to={buildDocumentsPath({ organization_id: organizationDetail.id })}
                      label={TEXT.documents}
                    />
                    <LinkRow
                      to={buildGroupsPath({ organization_id: organizationDetail.id })}
                      label={TEXT.groups}
                    />
                    <LinkRow
                      to={buildEnrollmentsPath({ organization_id: organizationDetail.id })}
                      label={TEXT.enrollments}
                    />
                  </div>
                </DashboardCard>

                <DashboardCard
                  testId="organization-address-card"
                  title={TEXT.addresses}
                  subtitle={TEXT.addressesSubtitle}
                >
                  <div className="grid gap-3">
                    <InfoTile label={"\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u0434\u0440\u0435\u0441"} value={organizationDetail.legal_address} compact />
                    <InfoTile label={"\u0424\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u0434\u0440\u0435\u0441"} value={organizationDetail.actual_address} compact />
                  </div>
                </DashboardCard>

                <DashboardCard
                  testId="organization-document-profile-card"
                  title={TEXT.pdf}
                  subtitle={TEXT.pdfSubtitle}
                  badge={pdfReady ? "OK" : attentionItems.length}
                >
                  <div className="space-y-2 text-xs">
                    {DOCUMENT_PROFILE_FIELDS.map((field) => (
                      <ProfileRow
                        key={field.key}
                        label={field.label}
                        value={organizationDetail[field.key]}
                      />
                    ))}
                  </div>
                </DashboardCard>

                <DashboardCard
                  testId="organization-activity-card"
                  title={TEXT.activity}
                  subtitle={TEXT.activitySubtitle}
                >
                  <div className="space-y-3 text-xs">
                    <div className="flex gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                      <div>
                        <div className="font-black text-slate-950">
                          {TEXT.changed}
                        </div>
                        <div className="mt-0.5 text-slate-500">
                          {formatDetailDate(organizationDetail.updated_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
                      <div>
                        <div className="font-black text-slate-950">
                          {TEXT.created}
                        </div>
                        <div className="mt-0.5 text-slate-500">
                          {formatDetailDate(organizationDetail.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </DashboardCard>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
