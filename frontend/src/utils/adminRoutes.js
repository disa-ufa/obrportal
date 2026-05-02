export const ADMIN_ROUTE_ITEMS = [
  { key: "dashboard", label: "\u041e\u0431\u0437\u043e\u0440", path: "/admin" },
  { key: "users", label: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438", path: "/admin/users" },
  { key: "organizations", label: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438", path: "/admin/organizations" },
  { key: "groups", label: "\u0413\u0440\u0443\u043f\u043f\u044b", path: "/admin/groups" },
  { key: "courses", label: "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b", path: "/admin/courses" },
  { key: "enrollments", label: "\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f", path: "/admin/enrollments" },
  { key: "documents", label: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b", path: "/admin/documents" },
  { key: "roles", label: "\u0420\u043e\u043b\u0438", path: "/admin/roles" },
  { key: "permissions", label: "\u041f\u0440\u0430\u0432\u0430", path: "/admin/permissions" },
  { key: "audit", label: "\u0410\u0443\u0434\u0438\u0442", path: "/admin/audit-events" },
];

export const ADMIN_ROUTE_PAGE_MAP = ADMIN_ROUTE_ITEMS.reduce((acc, item) => {
  acc[item.path] = item.key;
  return acc;
}, {});

export function getAdminPageFromPathname(pathname) {
  return ADMIN_ROUTE_PAGE_MAP[pathname] || null;
}

export function getAdminPathForPage(pageKey) {
  return ADMIN_ROUTE_ITEMS.find((item) => item.key === pageKey)?.path || "/admin";
}
