import {
  getAdminPageFromPathname,
  isAdminPathname,
} from "../utils/adminRoutes";
import { getPublicPageFromPathname } from "../utils/publicRoutes";
import { userHasRole } from "../utils/adminState";

export function useAppRouteState({
  pathname,
  currentPage,
  user,
  initializingAuth,
}) {
  const isAdminRoute = isAdminPathname(pathname);
  const adminRoutePage = getAdminPageFromPathname(pathname);
  const isUnknownAdminRoute = isAdminRoute && !adminRoutePage;
  const activeAdminPage = adminRoutePage || currentPage;
  const currentPublicPage = getPublicPageFromPathname(pathname);
  const isAdmin = userHasRole(user, "admin");

  const authBadgeText = initializingAuth
    ? "initializing"
    : user
      ? "authenticated"
      : "guest";

  const authBadgeTone = initializingAuth
    ? "amber"
    : user
      ? "blue"
      : "gray";

  return {
    isAdminRoute,
    adminRoutePage,
    isUnknownAdminRoute,
    activeAdminPage,
    currentPublicPage,
    isAdmin,
    authBadgeText,
    authBadgeTone,
  };
}
