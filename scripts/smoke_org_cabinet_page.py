from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{relative_path} is missing required fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/pages/OrganizationCabinetPage.jsx",
        [
            'import { useEffect, useMemo, useState } from "react";',
            "addOrgLearningGroupMember,",
            "createOrgGroupEnrollments,",
            "createOrgLearningGroup,",
            "deleteOrgGroupEnrollment,",
            "deleteOrgLearningGroup,",
            "getOrgGroupEnrollments,",
            "getOrgLearningGroupMembers,",
            "getOrgLearningGroups,",
            "getOrgProfile,",
            "getPublicCourses,",
            "removeOrgLearningGroupMember,",
            "searchOrgUsers,",
            "updateOrgLearningGroup,",
            "updateOrgProfile,",
            "replaceOrgProfileOfferings,",
            "replaceOrgProfileSpecialists,",
            "export function OrganizationCabinetPage",
            "const [groups, setGroups] = useState([]);",
            "const [selectedGroupId, setSelectedGroupId] = useState(\"\");",
            "const [members, setMembers] = useState([]);",
            "const [profile, setProfile] = useState(null);",
            "const [groupEnrollments, setGroupEnrollments] = useState([]);",
            "const [organizationUsers, setOrganizationUsers] = useState([]);",
            "const [courseSearchResults, setCourseSearchResults] = useState([]);",
            "getOrgProfile(),",
            "getOrgLearningGroups(),",
            "getOrgLearningGroupMembers(selectedGroupId)",
            "getOrgGroupEnrollments(selectedGroupId)",
            "updateOrgProfile(organizationId, payload)",
            "replaceOrgProfileOfferings(",
            "replaceOrgProfileSpecialists(",
            "handleSaveOrganizationOfferings",
            "handleSaveOrganizationSpecialists",
            "createOrgLearningGroup({",
            "updateOrgLearningGroup(groupId, payload)",
            "deleteOrgLearningGroup(group.id)",
            "deleteOrgGroupEnrollment(selectedGroupId, enrollment.id)",
            "searchOrgUsers",
            "getPublicCourses",
            "createOrgGroupEnrollments({",
            "addOrgLearningGroupMember(selectedGroupId,",
            "removeOrgLearningGroupMember(selectedGroupId, member.user_id)",
            "buildOrganizationOptions(profile?.organizations || [], groups)",
            "sortMembers(",
            "sortOrganizationUsers(",
            "sortEnrollments(",
            "enrollmentMatchesFilters(",
            "hasActiveEnrollmentFilters(",
            "mergeUniqueEnrollments(",
            "buildCabinetStatsProps({",
            "buildHeroSectionProps({",
            "buildOrganizationProfileSectionProps({",
            "buildOrganizationUsersSectionProps({",
            "buildGroupCreateSectionProps({",
            "buildSelectedGroupAsideSectionProps({",
            "buildGroupListProps({",
            "buildGroupsWorkspaceProps({",
            "<OrganizationCabinetHeroSection {...heroSectionProps} />",
            "<OrganizationCabinetErrorAlert error={error} />",
            "<OrganizationCabinetStats {...cabinetStatsProps} />",
            "<OrganizationProfileSection {...organizationProfileSectionProps} />",
            "<OrganizationUsersSection {...organizationUsersSectionProps} />",
            "<OrganizationGroupCreateSection {...groupCreateSectionProps} />",
            "<OrganizationCabinetGroupsWorkspace {...groupsWorkspaceProps} />",
            "<OrganizationCabinetNextSteps />",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetForms.jsx",
        [
            'name="description"',
            'name="phone"',
            'name="email"',
            'name="website"',
            "Описание организации",
            "Контактные данные",
            "Сохранить профиль",
            "organization-document-profile-readiness",
            "OrganizationProfileOfferingsEditor",
            "OrganizationProfileSpecialistsEditor",
            "onSaveOrganizationOfferings",
            "onSaveOrganizationSpecialists",
            "Профиль для итогового PDF",
            "Эти реквизиты используются при подготовке итоговых документов",
            "Если в PDF нужны отдельные данные подписанта",
            "fallback-настройки приложения",
        ],
    )


    require_contains(
        "frontend/src/components/organization/OrganizationProfileOfferingsEditor.jsx",
        [
            "export function OrganizationProfileOfferingsEditor",
            "organization-profile-offerings",
            "Услуги и направления деятельности",
            "Направления деятельности",
            "Добавить направление",
            "Добавить услугу",
            "Сохранить услуги и направления",
            "buildOrganizationProfileOfferingsFormData",
            "validateOfferingCollection",
            "Можно указать не более 100 элементов",
        ],
    )


    require_contains(
        "frontend/src/components/organization/OrganizationProfileSpecialistsEditor.jsx",
        [
            "export function OrganizationProfileSpecialistsEditor",
            "organization-profile-specialists",
            "Специалисты организации",
            "без ФИО",
            "Редактировать специалистов",
            "Добавить тип специалиста",
            "Сохранить специалистов",
            "buildOrganizationProfileSpecialistsFormData",
            "validateSpecialists",
            "Количество специалистов должно быть от 1 до 10 000",
            "Можно указать не более 100 типов специалистов",
        ],
    )

    require_contains(
        "frontend/src/api/client.js",
        [
            "export async function getOrgProfile()",
            'return request("/api/v1/org/profile");',
            "export async function updateOrgProfile(organizationId, payload)",
            "export async function replaceOrgProfileOfferings(organizationId, payload)",
            "/api/v1/org/profile/${organizationId}/offerings",
            "export async function replaceOrgProfileSpecialists(organizationId, payload)",
            "/api/v1/org/profile/${organizationId}/specialists",
            "export async function getOrgLearningGroups(filters = {})",
            "export async function getOrgLearningGroupDetail(groupId)",
            "export async function createOrgLearningGroup(payload)",
            "export async function updateOrgLearningGroup(groupId, payload)",
            "export async function deleteOrgLearningGroup(groupId)",
            "export async function getOrgLearningGroupMembers(groupId)",
            "export async function addOrgLearningGroupMember(groupId, payload)",
            "export async function removeOrgLearningGroupMember(groupId, userId)",
            "export async function createOrgGroupEnrollments(payload)",
            "export async function getOrgGroupEnrollments(groupId)",
            "export async function deleteOrgGroupEnrollment(groupId, enrollmentId)",
        ],
    )

    require_contains(
        "frontend/src/utils/organizationCabinetProps.js",
        [
            "export function buildCabinetStatsProps",
            "export function buildHeroSectionProps",
            "export function buildOrganizationProfileSectionProps",
            "onSaveOrganizationOfferings",
            "onSaveOrganizationSpecialists",
            "export function buildOrganizationUsersSectionProps",
            "export function buildGroupCreateSectionProps",
            "export function buildSelectedGroupAsideSectionProps",
            "export function buildGroupListProps",
            "export function buildGroupsWorkspaceProps",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetGroupsWorkspace.jsx",
        [
            "export function OrganizationCabinetGroupsWorkspace",
            "<OrganizationCabinetLoadingState />",
            "<OrganizationCabinetEmptyGroupsState />",
            "<OrganizationSelectedGroupAside",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationSelectedGroupContent.jsx",
        [
            "export function OrganizationSelectedGroupContent",
            "<LearningGroupEditForm",
            "<OrganizationGroupCourseAssignmentForm",
            "<OrganizationGroupEnrollmentsSection",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationSelectedGroupAside.jsx",
        [
            "export function OrganizationSelectedGroupAside",
            "<OrganizationSelectedGroupPanelHeader",
            "<OrganizationSelectedGroupContent",
            "<OrganizationGroupMembersSection",
        ],
    )

    print("Organization cabinet page behavior smoke passed")


if __name__ == "__main__":
    main()
