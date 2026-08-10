import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { isAdminPathname } from "../utils/adminRoutes";
import {
  buildPublicMeta,
  ensureMetaDescriptionTag,
} from "../utils/publicRoutes";

const ADMIN_META = {
  title: "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0443\u0440 \u2014 ОбрПортал",
  description: "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0443\u0440 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u044b \u0441 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435\u043c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f\u043c\u0438, \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f\u043c\u0438, \u0433\u0440\u0443\u043f\u043f\u0430\u043c\u0438 \u0438 RBAC.",
};

export function usePageMeta() {
  const location = useLocation();

  useEffect(() => {
    const meta = isAdminPathname(location.pathname)
      ? ADMIN_META
      : buildPublicMeta(location.pathname);

    document.title = meta.title;

    const metaDescriptionTag = ensureMetaDescriptionTag();
    metaDescriptionTag.setAttribute("content", meta.description);
  }, [location.pathname]);

  return location;
}
