import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { getAdminPathForPage } from "../utils/adminRoutes";
import { userHasRole } from "../utils/adminState";

function lazyNamed(loader, exportName) {
  return lazy(() =>
    loader().then((module) => ({
      default: module[exportName],
    }))
  );
}

const AccountPage = lazyNamed(() => import("../pages/AccountPage"), "AccountPage");
const AuthPage = lazyNamed(() => import("../pages/AuthPage"), "AuthPage");
const ForgotPasswordPage = lazyNamed(() => import("../pages/ForgotPasswordPage"), "ForgotPasswordPage");
const CatalogPage = lazyNamed(() => import("../pages/CatalogPage"), "CatalogPage");
const ContactsPage = lazyNamed(() => import("../pages/ContactsPage"), "ContactsPage");
const FaqPage = lazyNamed(() => import("../pages/FaqPage"), "FaqPage");
const HomePage = lazyNamed(() => import("../pages/HomePage"), "HomePage");
const NotFoundPage = lazyNamed(() => import("../pages/NotFoundPage"), "NotFoundPage");
const OfferPage = lazyNamed(() => import("../pages/OfferPage"), "OfferPage");
const OrganizationInfoPage = lazyNamed(() => import("../pages/OrganizationInfoPage"), "OrganizationInfoPage");
const OrganizationCabinetPage = lazyNamed(() => import("../pages/OrganizationCabinetPage"), "OrganizationCabinetPage");
const MinistryCabinetPage = lazyNamed(() => import("../pages/MinistryCabinetPage"), "MinistryCabinetPage");
const PrivacyPage = lazyNamed(() => import("../pages/PrivacyPage"), "PrivacyPage");
const RegisterPage = lazyNamed(() => import("../pages/RegisterPage"), "RegisterPage");
const SetPasswordPage = lazyNamed(() => import("../pages/SetPasswordPage"), "SetPasswordPage");
const ResetPasswordPage = lazyNamed(() => import("../pages/ResetPasswordPage"), "ResetPasswordPage");
const VerifyDocumentPage = lazyNamed(() => import("../pages/VerifyDocumentPage"), "VerifyDocumentPage");
const CourseDetailPublicRoute = lazyNamed(
  () => import("./PublicRouteComponents"),
  "CourseDetailPublicRoute"
);
const VerifyDocumentCodeRoute = lazyNamed(
  () => import("./PublicRouteComponents"),
  "VerifyDocumentCodeRoute"
);

function PublicRouteLoadingFallback() {
  return (
    <div
      data-testid="public-route-loading-state"
      className="rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200"
    >
      Загружаем страницу...
    </div>
  );
}

export function PublicRoutes({
  email,
  password,
  error,
  authLoading,
  initializingAuth,
  user,
  isAdmin,
  publicRegistrationEnabled,
  publicRegistrationLoading,
  setEmail,
  setPassword,
  handleLogin,
  handleLogout,
  handleRegister,
  handleNavigatePublicPage,
  handleOpenPublicCourse,
}) {
  const isOrgRepresentative = userHasRole(user, "org_rep");
  const isMinistryAdmin = userHasRole(user, "ministry_admin");
  const authenticatedEntryPath = isAdmin
    ? getAdminPathForPage("dashboard")
    : isOrgRepresentative
      ? "/organization"
      : isMinistryAdmin
        ? "/ministry"
        : "/account";

  return (
    <Suspense fallback={<PublicRouteLoadingFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              onPageChange={handleNavigatePublicPage}
              onOpenCourse={handleOpenPublicCourse}
            />
          }
        />
        <Route
          path="/catalog"
          element={
            <CatalogPage
              onPageChange={handleNavigatePublicPage}
              onOpenCourse={handleOpenPublicCourse}
              user={user}
            />
          }
        />
        <Route
          path="/programs"
          element={
            <CatalogPage
              onPageChange={handleNavigatePublicPage}
              onOpenCourse={handleOpenPublicCourse}
              user={user}
            />
          }
        />
        <Route
          path="/courses/:slug"
          element={
            <CourseDetailPublicRoute
              onPageChange={handleNavigatePublicPage}
              onOpenCourse={handleOpenPublicCourse}
              user={user}
            />
          }
        />
        <Route
          path="/organization-info"
          element={<OrganizationInfoPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/organization"
          element={
            user ? (
              isAdmin ? (
                <Navigate to={getAdminPathForPage("dashboard")} replace />
              ) : isOrgRepresentative ? (
                <OrganizationCabinetPage
                  user={user}
                  onPageChange={handleNavigatePublicPage}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/account" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/ministry"
          element={
            user ? (
              isAdmin ? (
                <Navigate to={getAdminPathForPage("dashboard")} replace />
              ) : isOrgRepresentative ? (
                <Navigate to="/organization" replace />
              ) : isMinistryAdmin ? (
                <MinistryCabinetPage
                  user={user}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/account" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/verify/:code"
          element={<VerifyDocumentCodeRoute onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/verify-document"
          element={<VerifyDocumentPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/contacts"
          element={<ContactsPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/faq"
          element={<FaqPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/privacy"
          element={<PrivacyPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/offer"
          element={<OfferPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/login"
          element={
            initializingAuth ? (
              <PublicRouteLoadingFallback />
            ) : user ? (
              <Navigate to={authenticatedEntryPath} replace />
            ) : (
              <AuthPage
                email={email}
                password={password}
                loading={authLoading}
                error={error}
                user={user}
                publicRegistrationEnabled={publicRegistrationEnabled}
                publicRegistrationLoading={publicRegistrationLoading}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onPageChange={handleNavigatePublicPage}
              />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            <ForgotPasswordPage
              onPageChange={handleNavigatePublicPage}
            />
          }
        />
        <Route
          path="/register"
          element={
            initializingAuth ? (
              <PublicRouteLoadingFallback />
            ) : user ? (
              <Navigate to={authenticatedEntryPath} replace />
            ) : publicRegistrationLoading ? (
              <PublicRouteLoadingFallback />
            ) : publicRegistrationEnabled ? (
              <RegisterPage
                onPageChange={handleNavigatePublicPage}
                onRegister={handleRegister}
                loading={authLoading}
                error={error}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/set-password"
          element={<SetPasswordPage onPageChange={handleNavigatePublicPage} />}
        />
        <Route
          path="/reset-password"
          element={
            <ResetPasswordPage
              onPageChange={handleNavigatePublicPage}
            />
          }
        />
        <Route
          path="/account"
          element={
            user ? (
              isAdmin ? (
                <Navigate to={getAdminPathForPage("dashboard")} replace />
              ) : isOrgRepresentative ? (
                <Navigate to="/organization" replace />
              ) : isMinistryAdmin ? (
                <Navigate to="/ministry" replace />
              ) : (
                <AccountPage
                  user={user}
                  onPageChange={handleNavigatePublicPage}
                  onLogout={handleLogout}
                  onOpenCourse={handleOpenPublicCourse}
                />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<NotFoundPage onPageChange={handleNavigatePublicPage} />} />
      </Routes>
    </Suspense>
  );
}
