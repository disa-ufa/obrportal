from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class OrgLearningGroupItem(BaseModel):
    id: str
    organization_id: str
    name: str
    code: str | None = None
    description: str | None = None
    is_active: bool


class OrgLearningGroupDetail(OrgLearningGroupItem):
    created_at: datetime
    updated_at: datetime
    document: OrgEnrollmentDocumentItem | None = None


class OrgLearningGroupCreate(BaseModel):
    organization_id: str
    name: str = Field(min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=1024)
    is_active: bool = True


class OrgLearningGroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=1024)
    is_active: bool | None = None



class OrgUserSearchOrganizationItem(BaseModel):
    id: str
    name: str | None = None


class OrgUserSearchRoleItem(BaseModel):
    code: str
    name: str
    organization_id: str | None = None


class OrgLearningGroupMemberItem(BaseModel):
    id: str
    learning_group_id: str
    user_id: str
    user_email: str
    user_full_name: str | None = None
    user_is_active: bool
    user_organizations: list[OrgUserSearchOrganizationItem] = Field(default_factory=list)
    user_roles: list[OrgUserSearchRoleItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime



class OrgUserSearchItem(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    is_active: bool
    organization_ids: list[str]
    organizations: list[OrgUserSearchOrganizationItem] = Field(default_factory=list)
    roles: list[OrgUserSearchRoleItem] = Field(default_factory=list)


class OrgLearningGroupMemberCreate(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)



class OrgEnrollmentDocumentItem(BaseModel):
    id: str
    document_number: str
    verification_code: str
    document_type: str | None = None
    title: str
    status: str
    file_available: bool = False
    public_verify_path: str | None = None
    generated_at: datetime | None = None
    created_at: datetime
    revoked_at: datetime | None = None
    revocation_reason: str | None = None


class OrgEnrollmentItem(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_full_name: str | None = None
    course_id: str
    course_slug: str
    course_title: str
    organization_id: str | None = None
    organization_name: str | None = None
    learning_group_id: str | None = None
    learning_group_name: str | None = None
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class OrgEnrollmentGroupCreate(BaseModel):
    learning_group_id: str = Field(min_length=1, max_length=64)
    course_id: str = Field(min_length=1, max_length=64)
    status: str = Field(default="assigned", max_length=32)
    started_at: datetime | None = None
    completed_at: datetime | None = None


class OrgEnrollmentBulkSkippedItem(BaseModel):
    user_id: str
    user_email: str
    user_full_name: str | None = None
    reason: str
    existing_enrollment_id: str | None = None


class OrgEnrollmentBulkCreateResult(BaseModel):
    status: str
    learning_group_id: str
    course_id: str
    organization_id: str
    created_count: int
    skipped_count: int
    created: list[OrgEnrollmentItem] = Field(default_factory=list)
    skipped: list[OrgEnrollmentBulkSkippedItem] = Field(default_factory=list)


class OrgProfileOfferingItem(BaseModel):
    id: str
    name: str
    description: str | None = None
    sort_order: int


class OrgProfileOfferingInput(BaseModel):
    name: str
    description: str | None = None


class OrgProfileOfferingsUpdate(BaseModel):
    activity_directions: list[OrgProfileOfferingInput] = Field(
        default_factory=list
    )
    services: list[OrgProfileOfferingInput] = Field(default_factory=list)


class OrgProfileSpecialistItem(BaseModel):
    id: str
    name: str
    description: str | None = None
    count: int
    sort_order: int


class OrgProfileSpecialistInput(BaseModel):
    name: str
    description: str | None = None
    count: int = Field(
        default=1,
        ge=1,
        le=10000,
        strict=True,
    )


class OrgProfileSpecialistsUpdate(BaseModel):
    specialists: list[OrgProfileSpecialistInput] = Field(
        default_factory=list
    )


class OrgProfileRecipientCategoryItem(BaseModel):
    id: str
    name: str
    description: str | None = None
    sort_order: int


class OrgProfileRecipientCategoryInput(BaseModel):
    name: str
    description: str | None = None


class OrgProfileRecipientCategoriesUpdate(BaseModel):
    recipient_categories: list[OrgProfileRecipientCategoryInput] = Field(
        default_factory=list
    )


class OrgProfileOrganizationItem(BaseModel):
    id: str
    inn: str
    kpp: str | None = None
    ogrn: str | None = None
    name: str
    legal_address: str | None = None
    actual_address: str | None = None
    description: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    activity_directions: list[OrgProfileOfferingItem] = Field(
        default_factory=list
    )
    services: list[OrgProfileOfferingItem] = Field(default_factory=list)
    specialists: list[OrgProfileSpecialistItem] = Field(
        default_factory=list
    )
    recipient_categories: list[OrgProfileRecipientCategoryItem] = Field(
        default_factory=list
    )
    created_at: datetime
    updated_at: datetime


class OrgProfileSummary(BaseModel):
    organizations_count: int
    groups_count: int
    active_groups_count: int
    members_count: int



class OrgProfileUpdate(BaseModel):
    kpp: str | None = Field(default=None)
    ogrn: str | None = Field(default=None)
    legal_address: str | None = Field(default=None)
    actual_address: str | None = Field(default=None)
    description: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    email: str | None = Field(default=None)
    website: str | None = Field(default=None)


class OrgProfile(BaseModel):
    organizations: list[OrgProfileOrganizationItem]
    summary: OrgProfileSummary
