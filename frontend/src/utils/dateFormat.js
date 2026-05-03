export function formatRuDateTime(value, fallback = "-") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatRuDateTimeDash(value) {
  return formatRuDateTime(value, "\u2014");
}

export function formatRuDateTimeNative(value, fallback = "-") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString("ru-RU");
}

export function formatRuDateTimeNativeUnsafe(value, fallback = "-") {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleString("ru-RU");
}

export function formatRuLongDate(value, fallback = "-") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
  }).format(date);
}
