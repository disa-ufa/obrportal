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
const CatalogPage = lazyNamed(() => import("../pages/CatalogPage"), "CatalogPage");
const ContactsPage = lazyNamed(() => import("../pages/ContactsPage"), "ContactsPage");
const FaqPage = lazyNamed(() => import("../pages/FaqPage"), "FaqPage");
const HomePage = lazyNamed(() => import("../pages/HomePage"), "HomePage");
const NotFoundPage = lazyNamed(() => import("../pages/NotFoundPage"), "NotFoundPage");
const OfferPage = lazyNamed(() => import("../pages/OfferPage"), "OfferPage");
const OrganizationInfoPage = lazyNamed(() => import("../pages/OrganizationInfoPage"), "OrganizationInfoPage");
const OrganizationCabinetPage = lazyNamed(() => import("../pages/OrganizationCabinetPage"), "OrganizationCabinetPage");
const PrivacyPage = lazyNamed(() => import("../pages/PrivacyPage"), "PrivacyPage");
const RegisterPage = lazyNamed(() => import("../pages/RegisterPage"), "RegisterPage");
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
  setEmail,
  setPassword,
  handleLogin,
  handleLogout,
  handleRegister,
  handleNavigatePublicPage,
  handleOpenPublicCourse,
}) {
  const isOrgRepresentative = userHasRole(user, "org_rep");

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
            <AuthPage
              email={email}
              password={password}
              loading={authLoading || initializingAuth}
              error={error}
              user={user}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onPageChange={handleNavigatePublicPage}
            />
          }
        />
        <Route
          path="/register"
          element={
            <RegisterPage
              onPageChange={handleNavigatePublicPage}
              onRegister={handleRegister}
              loading={authLoading || initializingAuth}
              error={error}
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
