import { Navigate, Route, Routes } from "react-router-dom";

import { AccountPage } from "../pages/AccountPage";
import { AuthPage } from "../pages/AuthPage";
import { CatalogPage } from "../pages/CatalogPage";
import { ContactsPage } from "../pages/ContactsPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { FaqPage } from "../pages/FaqPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { OfferPage } from "../pages/OfferPage";
import { OrganizationInfoPage } from "../pages/OrganizationInfoPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { RegisterPage } from "../pages/RegisterPage";
import { VerifyDocumentPage } from "../pages/VerifyDocumentPage";
import { getAdminPathForPage } from "../utils/adminRoutes";
import { CourseDetailPublicRoute, VerifyDocumentCodeRoute } from "./PublicRouteComponents";

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
  return (
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
          <Route
            path={getAdminPathForPage("documents")}
            element={
              user ? (
                isAdmin ? (
                  <DocumentsPage />
                ) : (
                  <Navigate to="/account" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        <Route path="*" element={<NotFoundPage onPageChange={handleNavigatePublicPage} />} />
      </Routes>
  );
}
