export const ADMIN_ROUTE_ITEMS = [
  {
    key: "dashboard",
    label: "Обзор",
    path: "/admin",
    description: "Главная сводка, очереди внимания и быстрые переходы.",
  },
  {
    key: "users",
    label: "Пользователи",
    path: "/admin/users",
    description: "Учётные записи, роли, активность и доступ.",
  },
  {
    key: "organizations",
    label: "Организации",
    path: "/admin/organizations",
    description: "Образовательные организации и их реквизиты.",
  },
  {
    key: "groups",
    label: "Группы",
    path: "/admin/groups",
    description: "Учебные группы и привязка слушателей.",
  },
  {
    key: "courses",
    label: "Программы",
    path: "/admin/courses",
    description: "Каталог программ, структура курсов и публикация.",
  },
  {
    key: "enrollments",
    label: "Назначения",
    path: "/admin/enrollments",
    description: "Назначения программ слушателям и группам.",
  },
  {
    key: "learnerImports",
    label: "?????? ??????????",
    path: "/admin/learner-imports",
    description: "???????? CSV/XLSX, ???????? ????? ? ?????????? ?????????? ? ???????? ????????.",
  },
  {
    key: "documents",
    label: "Документы",
    path: "/admin/documents",
    description: "Выданные документы, PDF, QR и проверка.",
  },
  {
    key: "roles",
    label: "Роли",
    path: "/admin/roles",
    description: "Ролевые модели и административные права.",
  },
  {
    key: "permissions",
    label: "Права",
    path: "/admin/permissions",
    description: "Технические разрешения для RBAC.",
  },
  {
    key: "audit",
    label: "Аудит",
    path: "/admin/audit-events",
    description: "Журнал действий и контроль изменений.",
  },
];

export const ADMIN_ROUTE_GROUPS = [
  {
    key: "overview",
    label: "Обзор",
    items: ["dashboard"],
  },
  {
    key: "operations",
    label: "Операции",
    items: ["users", "organizations", "groups", "enrollments", "learnerImports", "documents"],
  },
  {
    key: "content",
    label: "Контент",
    items: ["courses"],
  },
  {
    key: "access",
    label: "Доступ и контроль",
    items: ["roles", "permissions", "audit"],
  },
];

export const ADMIN_ROUTE_ITEM_BY_KEY = ADMIN_ROUTE_ITEMS.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

export function getAdminRouteItem(pageKey) {
  return ADMIN_ROUTE_ITEM_BY_KEY[pageKey] || null;
}

export function isAdminPathname(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export const ADMIN_ROUTE_PAGE_MAP = ADMIN_ROUTE_ITEMS.reduce((acc, item) => {
  acc[item.path] = item.key;
  return acc;
}, {});

export function getAdminLessonStudioRouteParams(pathname) {
  const match = String(pathname || "").match(/^\/admin\/lessons\/([^/]+)\/studio\/?$/);

  if (!match) {
    return null;
  }

  return {
    lessonId: decodeURIComponent(match[1]),
  };
}

export function getAdminPageFromPathname(pathname) {
  if (getAdminLessonStudioRouteParams(pathname)) {
    return "courses";
  }

  return ADMIN_ROUTE_PAGE_MAP[pathname] || null;
}

export function getAdminPathForPage(pageKey) {
  return ADMIN_ROUTE_ITEMS.find((item) => item.key === pageKey)?.path || "/admin";
}


export function buildAdminLessonStudioPath(lessonId) {
  return `/admin/lessons/${encodeURIComponent(lessonId)}/studio`;
}
