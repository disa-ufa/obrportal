import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export function PublicRouteScrollTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname]);

  return null;
}
