export function adminPostLoginDestination(value) {
  if (typeof value !== "string" || value.length > 2048) {
    return "/admin";
  }

  if (!/^\/admin(?:\/|[?#]|$)/.test(value)) {
    return "/admin";
  }

  if (value.startsWith("//") || /[\\\x00-\x20\x7f]/.test(value)) {
    return "/admin";
  }

  return value;
}
