// Pure presentation policy: do not expose PII or infer identities from a 409.
export const REGISTRY_PROFILE_APPROVAL_FIELDS = Object.freeze([
  "last_name", "first_name", "middle_name", "birth_date",
  "sex", "citizenship_country_code", "snils",
]);

export function registryProfileMayAffectApprovals(changes = {}) {
  return REGISTRY_PROFILE_APPROVAL_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(changes, field)
  );
}

export function registryLearnerProfileSaveError(error) {
  const status = Number(error?.status);
  const detail = error?.payload?.detail;
  const code = detail && typeof detail === "object" ? detail.code : null;
  const message = typeof detail === "string" ? detail : error?.message;

  if (status === 409 && (
    code === "learner_profile.snils_duplicate"
    || message === "Learner profile with this SNILS already exists"
  )) {
    return "Этот СНИЛС уже закреплён за другим профилем. Сверьте его с документом и проверьте, не создана ли вторая учётная запись. Не подставляйте случайный СНИЛС и не удаляйте профиль без отдельной сверки.";
  }
  if (status === 409) {
    return "Данные изменились или возник конфликт сохранения. Обновите карточку, проверьте актуальные значения и повторите только после сверки.";
  }
  if (status === 422) {
    return "Проверьте заполнение полей: формат, контрольную сумму СНИЛС и допустимые значения справочников. Данные не сохранены.";
  }
  if (status === 401) {
    return "Сеанс завершён. Войдите повторно; несохранённые данные остаются в форме.";
  }
  if (status === 403) {
    return "Нет прав на изменение персональных данных слушателя. Обратитесь к администратору.";
  }
  return "Не удалось сохранить данные. Ничего не исправляйте повторным утверждением: проверьте соединение и статус карточки.";
}
