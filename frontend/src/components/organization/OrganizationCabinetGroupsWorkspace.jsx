import { OrganizationGroupListSection } from "./OrganizationCabinetForms";
import { OrganizationSelectedGroupAside } from "./OrganizationSelectedGroupAside";
import { OrganizationCabinetLoadingState } from "./OrganizationCabinetLoadingState";
import { OrganizationCabinetEmptyGroupsState } from "./OrganizationCabinetEmptyGroupsState";

export function OrganizationCabinetGroupsWorkspace({
  loading,
  hasGroups,
  groupListSectionProps,
  selectedGroupAsideProps,
}) {
  const shouldShowEmptyGroupsState = !hasGroups;
  const groupListProps = groupListSectionProps;
  const selectedGroupAsideSectionProps = selectedGroupAsideProps;

  if (loading) {
    return <OrganizationCabinetLoadingState />;
  }

  if (shouldShowEmptyGroupsState) {
    return <OrganizationCabinetEmptyGroupsState />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <OrganizationGroupListSection {...groupListProps} />

      <OrganizationSelectedGroupAside {...selectedGroupAsideSectionProps} />
    </div>
  );
}
