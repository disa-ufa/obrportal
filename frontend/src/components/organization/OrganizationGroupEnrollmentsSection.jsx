import { OrganizationGroupEnrollmentsHeader } from "./OrganizationGroupEnrollmentsHeader";
import { OrganizationGroupEnrollmentsFilters } from "./OrganizationGroupEnrollmentsFilters";
import { OrganizationGroupEnrollmentsMessages } from "./OrganizationGroupEnrollmentsMessages";
import { OrganizationGroupEnrollmentsList } from "./OrganizationGroupEnrollmentsList";

const STAGE82_ORGANIZATION_DOCUMENT_WORKLIST =
  "stage82_19_organization_document_worklist";

const ORGANIZATION_DOCUMENT_WORKLIST_LABELS = {
  stage: "Stage 82.19 · Organization Document Worklist",
  title: "Итоговые документы группы",
  subtitle:
    "Представитель организации видит, у каких слушателей уже есть итоговый документ, где он ждёт публикации, а где уже доступен для проверки.",
  completedWithoutDocument: "Завершили без документа",
  draft: "Черновики",
  available: "Опубликованы",
  revoked: "Отозваны",
  empty: "В выбранной группе пока нет завершённых назначений с итоговыми документами.",
  verify: "Проверить публично",
};

function getOrganizationEnrollmentDocumentStatusLabel(status) {
  switch (status) {
    case "available":
      return "Опубликован";
    case "draft":
      return "Черновик";
    case "revoked":
      return "Отозван";
    default:
      return "Нет документа";
  }
}

function getOrganizationEnrollmentDocumentStatusTone(status) {
  switch (status) {
    case "available":
      return "bg-green-50 text-green-800 ring-green-200";
    case "draft":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "revoked":
      return "bg-red-50 text-red-800 ring-red-200";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
}

function getOrganizationDocumentWorklistStats(enrollments = []) {
  const completedEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === "completed"
  );

  const documentItems = completedEnrollments.filter((enrollment) => enrollment.document);
  const draftItems = documentItems.filter((enrollment) => enrollment.document?.status === "draft");
  const availableItems = documentItems.filter(
    (enrollment) => enrollment.document?.status === "available"
  );
  const revokedItems = documentItems.filter(
    (enrollment) => enrollment.document?.status === "revoked"
  );
  const completedWithoutDocument = completedEnrollments.filter(
    (enrollment) => !enrollment.document
  );

  return {
    completedEnrollments,
    documentItems,
    draftItems,
    availableItems,
    revokedItems,
    completedWithoutDocument,
  };
}

function OrganizationDocumentWorklistPanel({ groupEnrollments }) {
  const stats = getOrganizationDocumentWorklistStats(groupEnrollments);
  const previewItems = [
    ...stats.draftItems,
    ...stats.availableItems,
    ...stats.revokedItems,
    ...stats.completedWithoutDocument,
  ].slice(0, 5);

  return (
    <div
      data-testid="organization-document-worklist"
      data-stage={STAGE82_ORGANIZATION_DOCUMENT_WORKLIST}
      data-organization-document-draft-count={stats.draftItems.length}
      data-organization-document-available-count={stats.availableItems.length}
      data-organization-document-revoked-count={stats.revokedItems.length}
      className="mt-4 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
        {ORGANIZATION_DOCUMENT_WORKLIST_LABELS.stage}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-950">
        {ORGANIZATION_DOCUMENT_WORKLIST_LABELS.title}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        {ORGANIZATION_DOCUMENT_WORKLIST_LABELS.subtitle}
      </p>

      <div
        data-testid="organization-document-worklist-summary"
        className="mt-4 grid gap-2 sm:grid-cols-2"
      >
        <div className="rounded-2xl bg-white p-3 ring-1 ring-indigo-100">
          <div className="text-xs text-slate-500">
            {ORGANIZATION_DOCUMENT_WORKLIST_LABELS.completedWithoutDocument}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-950">
            {stats.completedWithoutDocument.length}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-amber-100">
          <div className="text-xs text-slate-500">{ORGANIZATION_DOCUMENT_WORKLIST_LABELS.draft}</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{stats.draftItems.length}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-green-100">
          <div className="text-xs text-slate-500">
            {ORGANIZATION_DOCUMENT_WORKLIST_LABELS.available}
          </div>
          <div className="mt-1 text-2xl font-bold text-green-700">
            {stats.availableItems.length}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-red-100">
          <div className="text-xs text-slate-500">
            {ORGANIZATION_DOCUMENT_WORKLIST_LABELS.revoked}
          </div>
          <div className="mt-1 text-2xl font-bold text-red-700">{stats.revokedItems.length}</div>
        </div>
      </div>

      {previewItems.length > 0 ? (
        <div data-testid="organization-document-worklist-items" className="mt-4 grid gap-2">
          {previewItems.map((enrollment) => {
            const documentItem = enrollment.document;
            const documentStatus = documentItem?.status || "missing";
            const learnerLabel =
              enrollment.user_full_name || enrollment.user_email || enrollment.user_id;
            const courseLabel =
              enrollment.course_title || enrollment.course_slug || enrollment.course_id;

            return (
              <div
                key={enrollment.id}
                data-testid="organization-document-worklist-item"
                className="rounded-2xl bg-white p-3 text-xs ring-1 ring-indigo-100"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{learnerLabel}</div>
                    <div className="mt-1 text-slate-500">{courseLabel}</div>
                    {documentItem?.document_number && (
                      <div className="mt-1 font-semibold text-slate-600">
                        {documentItem.document_number}
                      </div>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-semibold ring-1 ${getOrganizationEnrollmentDocumentStatusTone(documentStatus)}`}
                  >
                    {getOrganizationEnrollmentDocumentStatusLabel(documentStatus)}
                  </span>
                </div>

                {documentItem?.public_verify_path && (
                  <a
                    href={documentItem.public_verify_path}
                    className="mt-3 inline-flex rounded-full bg-green-600 px-3 py-1.5 font-semibold text-white transition hover:bg-green-700"
                  >
                    {ORGANIZATION_DOCUMENT_WORKLIST_LABELS.verify}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          data-testid="organization-document-worklist-empty"
          className="mt-4 rounded-2xl bg-white p-3 text-xs leading-5 text-slate-500 ring-1 ring-indigo-100"
        >
          {ORGANIZATION_DOCUMENT_WORKLIST_LABELS.empty}
        </div>
      )}
    </div>
  );
}

export function OrganizationGroupEnrollmentsSection({
  groupEnrollmentsLoading,
  groupEnrollmentsError,
  groupEnrollmentDeleteMessage,
  groupEnrollmentSearchQuery,
  setGroupEnrollmentSearchQuery,
  groupEnrollmentStatusFilter,
  setGroupEnrollmentStatusFilter,
  groupEnrollmentFiltersActive,
  setGroupEnrollmentsRefreshKey,
  groupEnrollments,
  visibleGroupEnrollments,
  deletingGroupEnrollmentId,
  handleDeleteGroupEnrollment,
}) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <OrganizationGroupEnrollmentsHeader
        groupEnrollmentsLoading={groupEnrollmentsLoading}
        visibleGroupEnrollments={visibleGroupEnrollments}
        groupEnrollments={groupEnrollments}
        setGroupEnrollmentsRefreshKey={setGroupEnrollmentsRefreshKey}
      />

      <OrganizationGroupEnrollmentsFilters
        groupEnrollmentSearchQuery={groupEnrollmentSearchQuery}
        setGroupEnrollmentSearchQuery={setGroupEnrollmentSearchQuery}
        groupEnrollmentStatusFilter={groupEnrollmentStatusFilter}
        setGroupEnrollmentStatusFilter={setGroupEnrollmentStatusFilter}
        groupEnrollmentFiltersActive={groupEnrollmentFiltersActive}
      />

      <OrganizationGroupEnrollmentsMessages
        groupEnrollmentDeleteMessage={groupEnrollmentDeleteMessage}
        groupEnrollmentsError={groupEnrollmentsError}
      />

      <OrganizationDocumentWorklistPanel groupEnrollments={groupEnrollments} />

      <OrganizationGroupEnrollmentsList
        groupEnrollmentsLoading={groupEnrollmentsLoading}
        groupEnrollments={groupEnrollments}
        visibleGroupEnrollments={visibleGroupEnrollments}
        deletingGroupEnrollmentId={deletingGroupEnrollmentId}
        handleDeleteGroupEnrollment={handleDeleteGroupEnrollment}
      />
    </div>
  );
}
