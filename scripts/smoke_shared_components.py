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
        "frontend/src/components/ui/ActionButton.jsx",
        [
            "export function ActionButton({",
            "children,",
            "onClick,",
            'type = "button"',
            'tone = "dark"',
            "disabled = false",
            "const tones = {",
            'dark: "bg-slate-900',
            'light: "bg-slate-100',
            'blue: "bg-blue-600',
            'red: "bg-red-600',
            "type={type}",
            "onClick={onClick}",
            "disabled={disabled}",
            "${tones[tone]}",
            "{children}",
        ],
    )

    require_contains(
        "frontend/src/components/ui/Alert.jsx",
        [
            "export function Alert({",
            'title = "',
            'tone = "red"',
            "const tones = {",
            'red: "bg-red-50',
            'amber: "bg-amber-50',
            'blue: "bg-blue-50',
            "${tones[tone]}",
            "{children &&",
        ],
    )

    require_contains(
        "frontend/src/components/ui/DetailField.jsx",
        [
            "export function formatDetailDate(value)",
            "return new Date(value).toLocaleString(\"ru-RU\");",
            "export function DetailField({ label, value, children })",
            "const content = children ?? value;",
            "const isEmpty = content === null || content === undefined || content === \"\";",
            "{label}",
            "{isEmpty ? \"-\" : content}",
        ],
    )

    require_contains(
        "frontend/src/components/ui/EmptyState.jsx",
        [
            "export function EmptyState({",
            "title =",
            "description",
            "{title}",
            "{description &&",
        ],
    )

    require_contains(
        "frontend/src/components/ui/JsonBlock.jsx",
        [
            "export function JsonBlock({ value })",
            "JSON.stringify(value || {}, null, 2)",
        ],
    )

    require_contains(
        "frontend/src/components/ui/LoadingBlock.jsx",
        [
            "export function LoadingBlock({",
            "text =",
            "animate-spin",
            "{text}",
        ],
    )

    require_contains(
        "frontend/src/components/ui/SectionCard.jsx",
        [
            "export function SectionCard({ title, subtitle, action, children })",
            "{title}",
            "{subtitle &&",
            "{action &&",
            "{children}",
        ],
    )

    require_contains(
        "frontend/src/components/ui/SmallTable.jsx",
        [
            'import { EmptyState } from "./EmptyState";',
            "export function SmallTable({",
            "columns,",
            "rows,",
            "emptyText,",
            "getRowId = (row, index) => row.id || row.code || index",
            "selectedRowId = null",
            "minWidth =",
            "if (!rows?.length)",
            "<EmptyState",
            "columns.map((column)",
            "rows.map((row, index)",
            "const rowId = String(getRowId(row, index));",
            "const isSelected = selectedRowId && rowId === String(selectedRowId);",
            "column.render ? column.render(row) : row[column.key] || \"-\"",
        ],
    )

    require_contains(
        "frontend/src/components/ui/StatusBadge.jsx",
        [
            "export function StatusBadge({ children, tone = \"gray\" })",
            "const tones = {",
            'green: "bg-emerald-50',
            'red: "bg-red-50',
            'blue: "bg-blue-50',
            'gray: "bg-slate-50',
            'amber: "bg-amber-50',
            "${tones[tone]}",
            "{children}",
        ],
    )

    require_contains(
        "frontend/src/components/auth/AuthPanel.jsx",
        [
            'import { AuthField } from "./AuthField";',
            'import { PasswordField } from "./PasswordField";',
            "export function AuthPanel({",
            "email,",
            "password,",
            "loading,",
            "onEmailChange,",
            "onPasswordChange,",
            "onLogin,",
            "<form",
            'className="space-y-5"',
            "onSubmit={onLogin}",
            "aria-busy={loading}",
            "<AuthField",
            'id="login-email"',
            'type="email"',
            "value={email}",
            "onChange={(event) => onEmailChange(event.target.value)}",
            'autoComplete="username"',
            "<PasswordField",
            'id="login-password"',
            "value={password}",
            "onChange={(event) => onPasswordChange(event.target.value)}",
            'autoComplete="current-password"',
            "disabled={loading}",
            '{loading ? "Входим..." : "Войти"}',
        ],
    )

    require_contains(
        "frontend/src/components/auth/CurrentUserCard.jsx",
        [
            'import { SectionCard } from "../ui/SectionCard";',
            'import { StatusBadge } from "../ui/StatusBadge";',
            "export function CurrentUserCard({",
            "user,",
            "loading,",
            "onRbacCheck,",
            "onRefreshAdminData,",
            "<SectionCard",
            "!user ?",
            "user.email",
            "user.full_name || \"-\"",
            "user.roles.map((role)",
            '<StatusBadge key={role.code} tone="blue">',
            "onClick={onRbacCheck}",
            "onClick={onRefreshAdminData}",
        ],
    )

    require_contains(
        "frontend/src/components/documents/DocumentVerificationQrBlock.jsx",
        [
            'import { useMemo, useState } from "react";',
            'import { QRCodeSVG } from "qrcode.react";',
            "buildDocumentVerificationPath,",
            "buildDocumentVerificationUrl,",
            "copyTextToClipboard,",
            "downloadQrSvgById,",
            "export function DocumentVerificationQrBlock({",
            "code,",
            "documentNumber,",
            "containerId,",
            "showUrl = false",
            "showCopyLink = false",
            "showPublicLink = false",
            "const verificationCode = code || documentNumber || \"\";",
            "const [copied, setCopied] = useState(\"\");",
            "buildDocumentVerificationPath(verificationCode)",
            "buildDocumentVerificationUrl(verificationCode)",
            "if (!verificationCode)",
            "return null;",
            "const qrValue = verificationUrl || verificationPath;",
            "effectiveContainerId",
            "async function handleCopy(kind, text)",
            "copyTextToClipboard(text)",
            "setCopied(kind);",
            "window.setTimeout(() => {",
            "<QRCodeSVG",
            "value={qrValue}",
            "size={size}",
            "showPublicLink &&",
            "showCopyLink &&",
            "downloadQrSvgById(effectiveContainerId, verificationCode)",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetForms.jsx",
        [
            'import { useEffect, useState } from "react";',
            'import { formatApiError } from "../../utils/apiErrors";',
            "buildLearningGroupFormData,",
            "buildOrganizationProfileFormData,",
            "formatDate,",
            "formatEnrollmentStatus,",
            "formatOptional,",
            "formatUserOrganizations,",
            "formatUserRoles,",
            "getOrganizationLabel,",
            "shortId,",
            "export function OrganizationProfileCard({ organization, onSave })",
            "const [editing, setEditing] = useState(false);",
            "buildOrganizationProfileFormData(organization)",
            "async function handleSubmit(event)",
            "const updated = await onSave(organization.id, formData);",
            "setFormData(buildOrganizationProfileFormData(updated));",
            "setEditing(false);",
            "formatApiError(err,",
            "export function LearningGroupEditForm({ group, onSave })",
            "buildLearningGroupFormData(group)",
            "if (!formData.name.trim())",
            "const updated = await onSave(group.id, formData);",
            "setFormData(buildLearningGroupFormData(updated));",
            "setMessage(",
            "export function EmptyState",
            "export function OrganizationCabinetHero",
            "export function OrganizationCabinetStats",
            "export function OrganizationGroupCreateSection",
            "export function OrganizationGroupListSection",
            "export function OrganizationUsersSection",
            "export function OrganizationSelectedGroupPanelHeader",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetErrorAlert.jsx",
        [
            "export function OrganizationCabinetErrorAlert({ error })",
            "if (!error)",
            "return null;",
            "{error}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetLoadingState.jsx",
        [
            "export function OrganizationCabinetLoadingState()",
            "rounded-3xl",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetEmptyGroupsState.jsx",
        [
            'import { EmptyState } from "./OrganizationCabinetForms";',
            "export function OrganizationCabinetEmptyGroupsState()",
            "<EmptyState",
            "title=",
            "text=",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetGroupsWorkspace.jsx",
        [
            'import { OrganizationGroupListSection } from "./OrganizationCabinetForms";',
            'import { OrganizationSelectedGroupAside } from "./OrganizationSelectedGroupAside";',
            'import { OrganizationCabinetLoadingState } from "./OrganizationCabinetLoadingState";',
            'import { OrganizationCabinetEmptyGroupsState } from "./OrganizationCabinetEmptyGroupsState";',
            "export function OrganizationCabinetGroupsWorkspace({",
            "loading,",
            "hasGroups,",
            "groupListProps,",
            "selectedGroupAsideProps,",
            "const shouldShowEmptyGroupsState = !hasGroups;",
            "if (loading)",
            "return <OrganizationCabinetLoadingState />;",
            "if (shouldShowEmptyGroupsState)",
            "return <OrganizationCabinetEmptyGroupsState />;",
            "<OrganizationGroupListSection {...groupListProps} />",
            "<OrganizationSelectedGroupAside {...selectedGroupAsideProps} />",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetHeroSection.jsx",
        [
            'import { OrganizationCabinetHero } from "./OrganizationCabinetForms";',
            "export function OrganizationCabinetHeroSection({",
            "heroUserLabel,",
            "onPageChange,",
            "onLogout,",
            "function handleCatalogClick()",
            'onPageChange("catalog");',
            "<OrganizationCabinetHero>",
            "{heroUserLabel}",
            "onClick={handleCatalogClick}",
            "onClick={onLogout}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationCabinetNextSteps.jsx",
        [
            "export function OrganizationCabinetNextSteps()",
            "<section",
            "rounded-shell",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationSelectedGroupAside.jsx",
        [
            'import { OrganizationSelectedGroupPanelHeader } from "./OrganizationCabinetForms";',
            'import { OrganizationSelectedGroupContent } from "./OrganizationSelectedGroupContent";',
            'import { OrganizationGroupMembersSection } from "./OrganizationGroupMembersSection";',
            "export function OrganizationSelectedGroupAside({",
            "selectedGroup,",
            "organizations,",
            "deletingGroupId,",
            "handleDeleteGroup,",
            "handleSaveGroup,",
            "handleCreateGroupEnrollments,",
            "members,",
            "handleDeleteMember,",
            "const hasSelectedGroup = Boolean(selectedGroup);",
            "const panelHeaderProps = {",
            "const selectedGroupContentProps = {",
            "const groupMembersSectionProps = {",
            "<OrganizationSelectedGroupPanelHeader {...panelHeaderProps} />",
            "hasSelectedGroup &&",
            "<OrganizationSelectedGroupContent {...selectedGroupContentProps} />",
            "<OrganizationGroupMembersSection {...groupMembersSectionProps} />",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationSelectedGroupContent.jsx",
        [
            'import { LearningGroupEditForm } from "./OrganizationCabinetForms";',
            'import { OrganizationGroupCourseAssignmentForm } from "./OrganizationGroupCourseAssignmentForm";',
            'import { OrganizationGroupEnrollmentsSection } from "./OrganizationGroupEnrollmentsSection";',
            "export function OrganizationSelectedGroupContent({",
            "selectedGroup,",
            "handleSaveGroup,",
            "handleCreateGroupEnrollments,",
            "const groupEditProps = {",
            "group: selectedGroup,",
            "onSave: handleSaveGroup,",
            "const courseAssignmentProps = {",
            "const groupEnrollmentsProps = {",
            "<LearningGroupEditForm {...groupEditProps} />",
            "<OrganizationGroupCourseAssignmentForm {...courseAssignmentProps} />",
            "<OrganizationGroupEnrollmentsSection {...groupEnrollmentsProps} />",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseAssignmentForm.jsx",
        [
            'import { OrganizationGroupCourseAssignmentResult } from "./OrganizationGroupCourseAssignmentResult";',
            'import { OrganizationGroupCourseAssignmentError } from "./OrganizationGroupCourseAssignmentError";',
            'import { OrganizationGroupCourseAssignmentActions } from "./OrganizationGroupCourseAssignmentActions";',
            'import { OrganizationGroupCoursePicker } from "./OrganizationGroupCoursePicker";',
            "export function OrganizationGroupCourseAssignmentForm({",
            "handleCreateGroupEnrollments,",
            "courseSearchQuery,",
            "groupEnrollmentForm,",
            "const canAssignCourse = Boolean(groupEnrollmentForm.course_id) && !assigningGroupCourse;",
            "onSubmit={handleCreateGroupEnrollments}",
            "<OrganizationGroupCoursePicker",
            "<OrganizationGroupCourseAssignmentActions",
            "<OrganizationGroupCourseAssignmentError",
            "groupEnrollmentResult &&",
            "<OrganizationGroupCourseAssignmentResult",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseAssignmentActions.jsx",
        [
            "export function OrganizationGroupCourseAssignmentActions({",
            "groupEnrollmentForm,",
            "handleGroupEnrollmentFormChange,",
            "assigningGroupCourse,",
            "canAssignCourse,",
            "const selectedStatus = groupEnrollmentForm.status;",
            "const isSubmitDisabled = !canAssignCourse;",
            "const submitLabel = assigningGroupCourse",
            'name="status"',
            "value={selectedStatus}",
            "onChange={handleGroupEnrollmentFormChange}",
            'value="assigned"',
            'value="in_progress"',
            'value="completed"',
            "disabled={isSubmitDisabled}",
            "{submitLabel}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseAssignmentError.jsx",
        [
            "export function OrganizationGroupCourseAssignmentError({",
            "groupEnrollmentError,",
            "if (!groupEnrollmentError)",
            "return null;",
            "{groupEnrollmentError}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseAssignmentResult.jsx",
        [
            "export function OrganizationGroupCourseAssignmentResult({",
            "groupEnrollmentResult,",
            "const skippedEnrollments = Array.isArray(groupEnrollmentResult?.skipped)",
            "const visibleSkippedEnrollments = skippedEnrollments.slice(0, 5);",
            "const hasSkippedEnrollments = visibleSkippedEnrollments.length > 0;",
            "groupEnrollmentResult.created_count",
            "groupEnrollmentResult.skipped_count",
            "visibleSkippedEnrollments.map((item)",
            "item.user_full_name || item.user_email || item.user_id",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCoursePicker.jsx",
        [
            'import { shortId } from "../../utils/organizationCabinet";',
            'import { OrganizationGroupCourseOption } from "./OrganizationGroupCourseOption";',
            "export function OrganizationGroupCoursePicker({",
            "courseSearchQuery,",
            "handleCourseSearchQueryChange,",
            "handleSearchCourseCandidates,",
            "courseSearchLoading,",
            "courseSearchResults,",
            "handleSelectCourse,",
            "groupEnrollmentForm,",
            "const selectedCourseId = groupEnrollmentForm.course_id;",
            "const selectedCourseLabel = courseSearchQuery || shortId(selectedCourseId);",
            "const hasCourseSearchResults = courseSearchResults.length > 0;",
            "value={courseSearchQuery}",
            "onChange={handleCourseSearchQueryChange}",
            "onClick={handleSearchCourseCandidates}",
            "courseSearchResults.map((course)",
            "<OrganizationGroupCourseOption",
            "active={selectedCourseId === course.id}",
            "onSelect={handleSelectCourse}",
            "selectedCourseId &&",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupCourseOption.jsx",
        [
            'import { shortId } from "../../utils/organizationCabinet";',
            "export function OrganizationGroupCourseOption({",
            "course,",
            "active,",
            "onSelect,",
            "const courseTitle = course.title || course.slug || course.id;",
            "const courseMetaLabel = [",
            "course.slug || shortId(course.id)",
            "onClick={() => onSelect(course)}",
            "active",
            "{courseTitle}",
            "{courseMetaLabel}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsSection.jsx",
        [
            'import { OrganizationGroupEnrollmentsHeader } from "./OrganizationGroupEnrollmentsHeader";',
            'import { OrganizationGroupEnrollmentsFilters } from "./OrganizationGroupEnrollmentsFilters";',
            'import { OrganizationGroupEnrollmentsMessages } from "./OrganizationGroupEnrollmentsMessages";',
            'import { OrganizationGroupEnrollmentsList } from "./OrganizationGroupEnrollmentsList";',
            "export function OrganizationGroupEnrollmentsSection({",
            "groupEnrollmentsLoading,",
            "groupEnrollmentsError,",
            "groupEnrollmentDeleteMessage,",
            "groupEnrollmentSearchQuery,",
            "groupEnrollmentStatusFilter,",
            "groupEnrollmentFiltersActive,",
            "setGroupEnrollmentsRefreshKey,",
            "groupEnrollments,",
            "visibleGroupEnrollments,",
            "deletingGroupEnrollmentId,",
            "handleDeleteGroupEnrollment,",
            "<OrganizationGroupEnrollmentsHeader",
            "<OrganizationGroupEnrollmentsFilters",
            "<OrganizationGroupEnrollmentsMessages",
            "<OrganizationGroupEnrollmentsList",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsHeader.jsx",
        [
            "export function OrganizationGroupEnrollmentsHeader({",
            "groupEnrollmentsLoading,",
            "visibleGroupEnrollments,",
            "groupEnrollments,",
            "setGroupEnrollmentsRefreshKey,",
            "const refreshButtonLabel = groupEnrollmentsLoading",
            "const counterLabel = `${visibleGroupEnrollments.length} / ${groupEnrollments.length}`;",
            "onClick={() => setGroupEnrollmentsRefreshKey((current) => current + 1)}",
            "disabled={groupEnrollmentsLoading}",
            "{refreshButtonLabel}",
            "{counterLabel}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsFilters.jsx",
        [
            "export function OrganizationGroupEnrollmentsFilters({",
            "groupEnrollmentSearchQuery,",
            "setGroupEnrollmentSearchQuery,",
            "groupEnrollmentStatusFilter,",
            "setGroupEnrollmentStatusFilter,",
            "groupEnrollmentFiltersActive,",
            "function handleSearchQueryChange(event)",
            "setGroupEnrollmentSearchQuery(event.target.value);",
            "function handleStatusFilterChange(event)",
            "setGroupEnrollmentStatusFilter(event.target.value);",
            "function handleResetFilters()",
            "setGroupEnrollmentSearchQuery(\"\");",
            "setGroupEnrollmentStatusFilter(\"\");",
            "value={groupEnrollmentSearchQuery}",
            "value={groupEnrollmentStatusFilter}",
            "onClick={handleResetFilters}",
            "disabled={!groupEnrollmentFiltersActive}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsMessages.jsx",
        [
            "export function OrganizationGroupEnrollmentsMessages({",
            "groupEnrollmentDeleteMessage,",
            "groupEnrollmentsError,",
            "const hasDeleteMessage = Boolean(groupEnrollmentDeleteMessage);",
            "const hasErrorMessage = Boolean(groupEnrollmentsError);",
            "if (!hasDeleteMessage && !hasErrorMessage)",
            "return null;",
            "hasDeleteMessage &&",
            "{groupEnrollmentDeleteMessage}",
            "hasErrorMessage &&",
            "{groupEnrollmentsError}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentsList.jsx",
        [
            'import { OrganizationGroupEnrollmentCard } from "./OrganizationGroupEnrollmentCard";',
            "export function OrganizationGroupEnrollmentsList({",
            "groupEnrollmentsLoading,",
            "groupEnrollments,",
            "visibleGroupEnrollments,",
            "deletingGroupEnrollmentId,",
            "handleDeleteGroupEnrollment,",
            "const hasGroupEnrollments = groupEnrollments.length > 0;",
            "const hasVisibleGroupEnrollments = visibleGroupEnrollments.length > 0;",
            "if (groupEnrollmentsLoading)",
            "if (!hasGroupEnrollments)",
            "if (!hasVisibleGroupEnrollments)",
            "visibleGroupEnrollments.map((enrollment)",
            "<OrganizationGroupEnrollmentCard",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupEnrollmentCard.jsx",
        [
            "formatDate,",
            "formatEnrollmentStatus,",
            "export function OrganizationGroupEnrollmentCard({",
            "enrollment,",
            "deletingGroupEnrollmentId,",
            "handleDeleteGroupEnrollment,",
            "const courseLabel =",
            "const userLabel =",
            "const statusLabel = formatEnrollmentStatus(enrollment.status);",
            "const createdAtLabel = formatDate(enrollment.created_at);",
            'const isAssigned = enrollment.status === "assigned";',
            "const isDeleting = deletingGroupEnrollmentId === enrollment.id;",
            "isAssigned &&",
            "onClick={() => handleDeleteGroupEnrollment(enrollment)}",
            "disabled={isDeleting}",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMembersSection.jsx",
        [
            'import { OrganizationGroupMemberAddForm } from "./OrganizationGroupMemberAddForm";',
            'import { OrganizationGroupMembersList } from "./OrganizationGroupMembersList";',
            "export function OrganizationGroupMembersSection({",
            "selectedGroup,",
            "membersLoading,",
            "membersError,",
            "memberSearchQuery,",
            "memberSearchResults,",
            "memberUserId,",
            "addingMember,",
            "handleAddMember,",
            "members,",
            "deletingMemberId,",
            "handleDeleteMember,",
            "const hasSelectedGroup = Boolean(selectedGroup);",
            "const memberAddFormProps = {",
            "const membersListProps = {",
            "hasSelectedGroup &&",
            "<OrganizationGroupMemberAddForm {...memberAddFormProps} />",
            "<OrganizationGroupMembersList {...membersListProps} />",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMemberAddForm.jsx",
        [
            'import { OrganizationGroupMemberCandidateCard } from "./OrganizationGroupMemberCandidateCard";',
            "export function OrganizationGroupMemberAddForm({",
            "handleAddMember,",
            "memberSearchQuery,",
            "setMemberSearchQuery,",
            "memberSearchLoading,",
            "handleSearchMemberCandidates,",
            "memberSearchResults,",
            "memberUserId,",
            "setMemberUserId,",
            "addingMember,",
            "memberActionError,",
            "memberActionMessage,",
            "const hasMemberSearchResults = memberSearchResults.length > 0;",
            "const isSubmitDisabled = addingMember || !memberUserId;",
            "function handleMemberSearchQueryChange(event)",
            "setMemberSearchQuery(event.target.value);",
            "onSubmit={handleAddMember}",
            "value={memberSearchQuery}",
            "onChange={handleMemberSearchQueryChange}",
            "onClick={handleSearchMemberCandidates}",
            "memberSearchResults.map((candidate)",
            "<OrganizationGroupMemberCandidateCard",
            "active={memberUserId === candidate.id}",
            "disabled={isSubmitDisabled}",
            "memberActionError &&",
            "memberActionMessage &&",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMemberCandidateCard.jsx",
        [
            "formatUserOrganizations,",
            "formatUserRoles,",
            "export function OrganizationGroupMemberCandidateCard({",
            "candidate,",
            "active,",
            "setMemberUserId,",
            "const organizationLabel = formatUserOrganizations(",
            "const roleLabel = formatUserRoles(candidate.roles);",
            "const candidateTitle = candidate.full_name || candidate.email;",
            "function handleSelectCandidate()",
            "setMemberUserId(candidate.id);",
            "onClick={handleSelectCandidate}",
            "{candidateTitle}",
            "{candidateEmail}",
            "organizationLabel &&",
            "roleLabel &&",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMembersList.jsx",
        [
            'import { OrganizationGroupMemberCard } from "./OrganizationGroupMemberCard";',
            "export function OrganizationGroupMembersList({",
            "membersLoading,",
            "membersError,",
            "members,",
            "deletingMemberId,",
            "handleDeleteMember,",
            "const hasMembers = members.length > 0;",
            "const memberCardProps = {",
            "membersError &&",
            "membersLoading ?",
            "!hasMembers ?",
            "members.map((member)",
            "<OrganizationGroupMemberCard",
        ],
    )

    require_contains(
        "frontend/src/components/organization/OrganizationGroupMemberCard.jsx",
        [
            "formatDate,",
            "formatUserOrganizations,",
            "formatUserRoles,",
            "export function OrganizationGroupMemberCard({",
            "member,",
            "deletingMemberId,",
            "handleDeleteMember,",
            "const memberTitle = member.user_full_name || member.user_email || member.user_id;",
            "const memberEmail = member.user_email ||",
            "const createdAtLabel = formatDate(member.created_at);",
            "const organizationLabel = formatUserOrganizations(member.user_organizations);",
            "const roleLabel = formatUserRoles(member.user_roles);",
            "const isDeleting = deletingMemberId === member.id;",
            "function handleDeleteClick()",
            "handleDeleteMember(member);",
            "onClick={handleDeleteClick}",
            "disabled={isDeleting}",
        ],
    )

    print("Shared components behavior smoke passed")


if __name__ == "__main__":
    main()
