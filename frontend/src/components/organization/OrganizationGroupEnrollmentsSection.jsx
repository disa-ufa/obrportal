import { OrganizationGroupEnrollmentsHeader } from "./OrganizationGroupEnrollmentsHeader";
import { OrganizationGroupEnrollmentsFilters } from "./OrganizationGroupEnrollmentsFilters";
import { OrganizationGroupEnrollmentsMessages } from "./OrganizationGroupEnrollmentsMessages";
import { OrganizationGroupEnrollmentsList } from "./OrganizationGroupEnrollmentsList";

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
