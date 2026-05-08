export const COMMON_API_ERROR_MESSAGES = {
  fallback: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0437\u0430\u043f\u0440\u043e\u0441.",
  notAuthenticated: "\u041d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e \u0432\u043e\u0439\u0442\u0438 \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0443.",
  accessDenied: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f.",
  notFound: "\u0417\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
  conflict: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043a\u043e\u043d\u0444\u043b\u0438\u043a\u0442\u0443\u0435\u0442 \u0441 \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u043c\u0438 \u0434\u0430\u043d\u043d\u044b\u043c\u0438.",
  invalidRequest: "\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u043e\u0441\u0442\u044c \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f \u0434\u0430\u043d\u043d\u044b\u0445.",
  serverError: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435 \u0441\u043c\u043e\u0433 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u0437\u0430\u043f\u0440\u043e\u0441.",
};

function getApiErrorMessage(err) {
  const rawMessage = err?.detail || err?.message || "";

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

export function formatApiError(err, fallback = COMMON_API_ERROR_MESSAGES.fallback) {
  const status = err?.status ? `${err.status}` : "";
  const message = getApiErrorMessage(err);

  let readableMessage = fallback;

  if (status === "401") {
    readableMessage = COMMON_API_ERROR_MESSAGES.notAuthenticated;
  } else if (status === "403") {
    readableMessage = COMMON_API_ERROR_MESSAGES.accessDenied;
  } else if (status === "404") {
    readableMessage = fallback || COMMON_API_ERROR_MESSAGES.notFound;
  } else if (status === "409") {
    readableMessage = message || COMMON_API_ERROR_MESSAGES.conflict;
  } else if (status === "422") {
    readableMessage = COMMON_API_ERROR_MESSAGES.invalidRequest;
  } else if (Number(status) >= 500) {
    readableMessage = COMMON_API_ERROR_MESSAGES.serverError;
  } else if (message) {
    readableMessage = message;
  }

  return `${status} ${readableMessage}`.trim();
}
