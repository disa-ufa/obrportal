import { PUBLIC_COURSES } from "../data/publicCourses";

export const PUBLIC_ROUTE_MAP = {
  home: "/",
  catalog: "/catalog",
  "organization-info": "/organization-info",
  organization: "/organization",
  "verify-document": "/verify-document",
  contacts: "/contacts",
  faq: "/faq",
  privacy: "/privacy",
  offer: "/offer",
  login: "/login",
  register: "/register",
  account: "/account",
};

export function getPublicPageFromPathname(pathname) {
  if (pathname === "/") return "home";
  if (pathname === "/catalog" || pathname === "/programs") return "catalog";
  if (pathname.startsWith("/courses/")) return "course-detail";
  if (pathname === "/organization-info") return "organization-info";
  if (pathname === "/organization") return "organization";
  if (pathname === "/verify-document") return "verify-document";
  if (pathname.startsWith("/verify/")) return "verify-document";
  if (pathname === "/contacts") return "contacts";
  if (pathname === "/faq") return "faq";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/offer") return "offer";
  if (pathname === "/login") return "login";
  if (pathname === "/register") return "register";
  if (pathname === "/account") return "account";
  return "not-found";
}

export function ensureMetaDescriptionTag() {
  let element = document.querySelector('meta[name="description"]');

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", "description");
    document.head.appendChild(element);
  }

  return element;
}

export function buildPublicMeta(pathname) {
  if (pathname === "/") {
    return {
      title: "ObrPortal — образовательная платформа",
      description:
        "Публичный сайт образовательной платформы: каталог программ, сведения об организации, проверка документов и правовые страницы.",
    };
  }

  if (pathname === "/catalog" || pathname === "/programs") {
    return {
      title: "Каталог программ — ObrPortal",
      description:
        "Публичный каталог образовательных программ с карточками курсов, стоимостью, форматом обучения и итоговыми документами.",
    };
  }

  if (pathname.startsWith("/courses/")) {
    const slug = pathname.replace(/^\/courses\//, "").replace(/\/$/, "");
    const course = PUBLIC_COURSES.find((item) => item.slug === slug);

    if (course) {
      return {
        title: `${course.title} — ObrPortal`,
        description: `${course.title}. Формат: ${course.format}. Объем: ${course.hours} часов. Итоговый документ: ${course.document}.`,
      };
    }

    return {
      title: "Карточка курса — ObrPortal",
      description:
        "Описание образовательной программы, условий обучения, итоговой аттестации и итогового документа.",
    };
  }

  if (pathname === "/organization-info") {
    return {
      title: "Сведения об образовательной организации — ObrPortal",
      description:
        "Официальный публичный раздел со сведениями об образовательной организации, документах, программах и контактных данных.",
    };
  }

  if (pathname === "/verify-document" || pathname.startsWith("/verify/")) {
    return {
      title: "Проверка документа — ObrPortal",
      description:
        "Публичная проверка подлинности итогового документа по номеру или безопасному идентификатору.",
    };
  }

  if (pathname === "/organization") {
    return {
      title: "Кабинет организации - ObrPortal",
      description:
        "Кабинет представителя юридического лица для просмотра учебных групп, участников и корпоративного обучения.",
    };
  }

  if (pathname === "/contacts") {
    return {
      title: "Контакты — ObrPortal",
      description:
        "Публичные контакты образовательной платформы для физических лиц, юридических лиц и обращений по документам.",
    };
  }

  if (pathname === "/faq") {
    return {
      title: "FAQ — ObrPortal",
      description:
        "Частые вопросы по курсам, обучению, итоговым документам, проверке подлинности и работе платформы.",
    };
  }

  if (pathname === "/privacy") {
    return {
      title: "Политика обработки персональных данных — ObrPortal",
      description:
        "Публичная политика обработки персональных данных: цели, состав данных, правовые основания и права субъекта.",
    };
  }

  if (pathname === "/offer") {
    return {
      title: "Условия использования портала — ObrPortal",
      description:
        "Публичные условия использования образовательного портала: назначение сервиса, регистрация, доступ к обучению, итоговые документы и обращения пользователей.",
    };
  }

  if (pathname === "/login") {
    return {
      title: "Вход — ObrPortal",
      description:
        "Публичная точка входа в образовательную платформу для пользователей и административных ролей.",
    };
  }

  if (pathname === "/register") {
    return {
      title: "Регистрация — ObrPortal",
      description:
        "Публичная страница регистрации пользователя. На текущем этапе это UX-экран для будущего signup flow.",
    };
  }

  if (pathname === "/account") {
    return {
      title: "Личный кабинет — ObrPortal",
      description:
        "Личный кабинет пользователя образовательной платформы с будущими разделами программ, обучения и документов.",
    };
  }

  return {
    title: "Страница не найдена — ObrPortal",
    description:
      "Запрошенная страница не найдена. Вернитесь на главную, в каталог программ или в обязательные публичные разделы.",
  };
}

export const PUBLIC_ROUTE_META_DIAGNOSTIC_CASES = [
  { pathname: "/", expectedPage: "home", expectedTitle: "ObrPortal — образовательная платформа" },
  { pathname: "/catalog", expectedPage: "catalog", expectedTitle: "Каталог программ — ObrPortal" },
  { pathname: "/courses/__missing_routes_meta_course__", expectedPage: "course-detail", expectedTitle: "Карточка курса — ObrPortal" },
  { pathname: "/organization-info", expectedPage: "organization-info", expectedTitle: "Сведения об образовательной организации — ObrPortal" },
  { pathname: "/organization", expectedPage: "organization", expectedTitle: "Кабинет организации - ObrPortal" },
  { pathname: "/verify-document", expectedPage: "verify-document", expectedTitle: "Проверка документа — ObrPortal" },
  { pathname: "/verify/__missing_routes_meta_code__", expectedPage: "verify-document", expectedTitle: "Проверка документа — ObrPortal" },
  { pathname: "/contacts", expectedPage: "contacts", expectedTitle: "Контакты — ObrPortal" },
  { pathname: "/faq", expectedPage: "faq", expectedTitle: "FAQ — ObrPortal" },
  { pathname: "/privacy", expectedPage: "privacy", expectedTitle: "Политика обработки персональных данных — ObrPortal" },
  { pathname: "/offer", expectedPage: "offer", expectedTitle: "Условия использования портала — ObrPortal" },
  { pathname: "/login", expectedPage: "login", expectedTitle: "Вход — ObrPortal" },
  { pathname: "/register", expectedPage: "register", expectedTitle: "Регистрация — ObrPortal" },
  { pathname: "/account", expectedPage: "account", expectedTitle: "Личный кабинет — ObrPortal" },
  { pathname: "/__missing_routes_meta_public__", expectedPage: "not-found", expectedTitle: "Страница не найдена — ObrPortal" },
];

export function getPublicRoutesMetaDiagnostics() {
  const routeMapEntries = Object.entries(PUBLIC_ROUTE_MAP);
  const duplicatedPaths = routeMapEntries
    .map(([, path]) => path)
    .filter((path, index, paths) => paths.indexOf(path) !== index);
  const brokenMetaCases = PUBLIC_ROUTE_META_DIAGNOSTIC_CASES.filter((item) => {
    const page = getPublicPageFromPathname(item.pathname);
    const meta = buildPublicMeta(item.pathname);

    return page !== item.expectedPage || meta.title !== item.expectedTitle || !meta.description;
  });

  return {
    routeMapTotal: routeMapEntries.length,
    metaCasesTotal: PUBLIC_ROUTE_META_DIAGNOSTIC_CASES.length,
    duplicatedPaths: [...new Set(duplicatedPaths)],
    brokenMetaCases,
    ok: duplicatedPaths.length === 0 && brokenMetaCases.length === 0,
  };
}
