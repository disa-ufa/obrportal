export const COMMON_API_ERROR_MESSAGES = {
  fallback: "Не удалось выполнить запрос.",
  notAuthenticated: "Необходимо войти в систему.",
  accessDenied: "Недостаточно прав для выполнения действия.",
  notFound: "Запрошенные данные не найдены.",
  conflict: "Действие конфликтует с уже существующими данными.",
  invalidRequest: "Проверьте корректность заполнения данных.",
  serverError: "Сервер временно не смог обработать запрос.",
  networkError: "Не удалось связаться с сервером. Проверьте соединение и повторите попытку.",
  technicalDetailsHidden: "Технические детали скрыты. При повторении ошибки передайте разработчику код статуса.",
};

const TECHNICAL_MESSAGE_PATTERNS = [
  /traceback/i,
  /stack trace/i,
  /sqlalchemy/i,
  /integrityerror/i,
  /operationalerror/i,
  /programmingerror/i,
  /database/i,
  /sqlite/i,
  /postgres/i,
  /psycopg/i,
  /asyncpg/i,
  /exception/i,
  /internal server error/i,
  /failed to fetch/i,
  /networkerror/i,
  /typeerror/i,
  /referenceerror/i,
  /syntaxerror/i,
  /\bat\s+[\w./\\-]+:\d+/i,
];

export function getApiErrorStatus(err) {
  if (err?.status !== undefined && err?.status !== null && err.status !== "") {
    return `${err.status}`;
  }

  if (err?.response?.status !== undefined && err?.response?.status !== null) {
    return `${err.response.status}`;
  }

  return "";
}

export function getApiErrorMessage(err) {
  const rawMessage = err?.detail ?? err?.message ?? err?.response?.data?.detail ?? "";

  if (Array.isArray(rawMessage)) {
    return rawMessage
      .map((item) => item?.msg || item?.message || JSON.stringify(item))
      .join("; ");
  }

  if (rawMessage && typeof rawMessage === "object") {
    return rawMessage.detail || rawMessage.message || JSON.stringify(rawMessage);
  }

  return `${rawMessage || ""}`.trim();
}

export function isTechnicalApiErrorMessage(message) {
  const normalized = `${message || ""}`.trim();

  if (!normalized) {
    return false;
  }

  return TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getSafeApiErrorMessage(message, fallback = COMMON_API_ERROR_MESSAGES.fallback) {
  const normalized = `${message || ""}`.trim();

  if (!normalized) {
    return fallback;
  }

  if (isTechnicalApiErrorMessage(normalized)) {
    return COMMON_API_ERROR_MESSAGES.technicalDetailsHidden;
  }

  return normalized;
}

export function formatApiError(err, fallback = COMMON_API_ERROR_MESSAGES.fallback) {
  const status = getApiErrorStatus(err);
  const message = getApiErrorMessage(err);
  const safeMessage = getSafeApiErrorMessage(message, fallback);

  let readableMessage = fallback;

  if (!status && message) {
    readableMessage = getSafeApiErrorMessage(message, COMMON_API_ERROR_MESSAGES.networkError);
  } else if (status === "400") {
    readableMessage = safeMessage || COMMON_API_ERROR_MESSAGES.invalidRequest;
  } else if (status === "401") {
    readableMessage = COMMON_API_ERROR_MESSAGES.notAuthenticated;
  } else if (status === "403") {
    readableMessage = COMMON_API_ERROR_MESSAGES.accessDenied;
  } else if (status === "404") {
    readableMessage = fallback || COMMON_API_ERROR_MESSAGES.notFound;
  } else if (status === "409") {
    readableMessage = safeMessage || COMMON_API_ERROR_MESSAGES.conflict;
  } else if (status === "422") {
    readableMessage = COMMON_API_ERROR_MESSAGES.invalidRequest;
  } else if (Number(status) >= 500) {
    readableMessage = COMMON_API_ERROR_MESSAGES.serverError;
  } else if (message) {
    readableMessage = safeMessage;
  }

  return `${status} ${readableMessage}`.trim();
}
