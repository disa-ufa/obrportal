# ObrPortal — Stage 6 checkpoint

## Current checkpoint

- Branches: develop = main = origin/develop = origin/main
- Latest verified commit: 39b9add
- Latest commit title: refactor: reuse admin course link builder

## Verification

Latest local verification completed:

- backend pytest: 174 passed, 1 warning
- frontend production build: passed
- smoke_auth_rbac.py: passed
- duplicated work center widgets: not found
- raw admin links in work-center UI: centralized through adminLinks builders

Known warning:

- reportlab DeprecationWarning for ast.NameConstant under Python 3.12.
- This warning is not blocking current Stage 6 functionality.

## Stage 6 completed admin areas

The administrative MVP shell is implemented and covered by smoke checks for direct and filtered routes:

- Dashboard
- Users
- Organizations
- Groups
- Courses
- Enrollments
- Documents
- Roles
- Permissions
- Audit events

## Completed frontend improvements

- Admin dashboard work center
- Users work center
- Organizations work center
- Groups work center
- Courses work center
- Enrollments work center
- Documents work center
- Roles work center
- Permissions work center
- Audit work center
- Shared AdminSummaryCard and AdminWorkflowLink widgets
- Centralized admin URL builders through frontend/src/utils/adminLinks.js

## Completed backend/API coverage

- Auth and current user
- Admin RBAC check
- Admin users CRUD and password reset
- Admin organizations CRUD
- Learning groups CRUD
- Learning group members
- Courses admin list/detail flows
- Enrollments admin flows
- Grouped and bulk grouped enrollments
- Documents list/detail/update/delete/download flows
- Generated completion documents
- Publish/revoke/restore document lifecycle
- Public document verification
- Roles CRUD
- Role/user assignments
- Role/permission assignments
- Permissions read/detail
- Audit events list/detail/filter
- Learner forbidden checks for admin APIs

## Current status

Stage 6 administrative MVP is stable enough to move to the next development block.

## Recommended next blocks

### 6.41 Technical cleanup

- Remove remaining route/link inconsistencies if found.
- Review duplicated small UI helpers.
- Review App.jsx size and prepare for future decomposition.
- Keep behavior unchanged.

### 6.42 Learner account improvement

- Improve learner account dashboard.
- Show courses, statuses, documents, downloadable files and verification links in a clearer workflow.
- Add smoke coverage for public/account routes if needed.

### 6.43 Document templates and registry polish

- Prepare document template model/structure.
- Improve generated document metadata.
- Prepare UI for document issue/reissue scenarios.

### 6.44 Production readiness

- Environment documentation.
- Deployment instructions.
- Backup/restore notes.
- CI check review.
- Seed/admin setup documentation.
