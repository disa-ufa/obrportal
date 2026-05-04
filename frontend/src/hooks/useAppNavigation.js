import { useNavigate } from "react-router-dom";

import { getAdminPathForPage } from "../utils/adminRoutes";
import { PUBLIC_ROUTE_MAP } from "../utils/publicRoutes";

export function useAppNavigation({ setCurrentPage }) {
  const navigate = useNavigate();

  function handleNavigatePublicPage(pageKey) {
    if (pageKey === "dashboard" || pageKey === "admin") {
      navigate("/admin");
      return;
    }

    navigate(PUBLIC_ROUTE_MAP[pageKey] || "/");
  }

  function handleNavigateAdminPage(pageKey) {
    const path = getAdminPathForPage(pageKey);

    setCurrentPage(pageKey);
    navigate(path);
  }

  function handleOpenPublicCourse(courseSlug) {
    navigate(`/courses/${courseSlug}`);
  }

  return {
    handleNavigatePublicPage,
    handleNavigateAdminPage,
    handleOpenPublicCourse,
  };
}
