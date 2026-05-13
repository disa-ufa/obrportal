import { OrganizationGroupEnrollmentsHeader } from "./OrganizationGroupEnrollmentsHeader";
import { OrganizationGroupEnrollmentsFilters } from "./OrganizationGroupEnrollmentsFilters";
import { OrganizationGroupEnrollmentsMessages } from "./OrganizationGroupEnrollmentsMessages";
import { OrganizationGroupEnrollmentCard } from "./OrganizationGroupEnrollmentCard";

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

    {groupEnrollmentsLoading ? (
      <div className="mt-3 text-sm text-slate-500">Загружаем назначения...</div>
    ) : groupEnrollments.length === 0 ? (
      <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
        У выбранной группы пока нет назначенных курсов.
      </div>
    ) : visibleGroupEnrollments.length === 0 ? (
      <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-100">
        По заданным фильтрам назначений не найдено.
      </div>
    ) : (
      <div className="mt-3 grid gap-2">
        {visibleGroupEnrollments.map((enrollment) => (
          <OrganizationGroupEnrollmentCard
            key={enrollment.id}
            enrollment={enrollment}
            deletingGroupEnrollmentId={deletingGroupEnrollmentId}
            handleDeleteGroupEnrollment={handleDeleteGroupEnrollment}
          />
        ))}
      </div>
    )}
    </div>
  );
}
