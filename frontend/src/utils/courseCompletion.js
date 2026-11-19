const fieldLabels = {
  "learner_profile.last_name": "Фамилия",
  "learner_profile.first_name": "Имя",
  "learner_profile.middle_name": "Отчество",
  "learner_profile.birth_date": "Дата рождения",
  "learner_profile.sex": "Пол",
  "learner_profile.citizenship_country_code": "Гражданство",
  "learner_profile.snils": "СНИЛС",
  "learner_profile.email": "E-mail для связи",
  "learner_profile.phone": "Телефон",
  "employer.profession_or_position": "Должность или профессия",
  "employer.employer_name": "Наименование работодателя",
  "employer.employer_inn": "ИНН работодателя",
  "employer.reporting_scenario": "Сценарий обучения для Минтруда",
  "employer": "Сведения о работодателе",
  "course.registry_policy": "Применимость реестров",
  "course.frdo_requirement_mode": "Применимость ФРДО",
  "course.mintrud_requirement_mode": "Применимость Минтруда",
  "enrollment": "Сведения о зачислении",
};

export function needsCourseFinalization(course) {
  return course?.status === "active"
    && Number.isInteger(course.required_lessons_total)
    && course.required_lessons_total >= 0
    && course.required_lessons_completed === course.required_lessons_total;
}

export function canFinalizeCourse(readiness) {
  return readiness?.is_ready === true && readiness.status === "ready"
    && Array.isArray(readiness.missing_fields) && readiness.missing_fields.length === 0
    && Array.isArray(readiness.invalid_fields) && readiness.invalid_fields.length === 0
    && readiness.requires_administrator_action === false && readiness.policy_unresolved === false;
}

export function describeCompletionIssues(readiness) {
  return [
    ...(Array.isArray(readiness?.missing_fields) ? readiness.missing_fields : []).map((issue) => ({ ...issue, invalid: false })),
    ...(Array.isArray(readiness?.invalid_fields) ? readiness.invalid_fields : []).map((issue) => ({ ...issue, invalid: true })),
  ].map(({ field, resolvable_by: owner, invalid }) => {
    const knownField = typeof field === "string" && Object.hasOwn(fieldLabels, field);
    const label = knownField ? fieldLabels[field] : "Сведения для оформления";
    let section = null;
    if (owner === "learner" && knownField) {
      if (field.startsWith("learner_profile.")) section = "profile";
      if (["employer.profession_or_position", "employer.employer_name", "employer.employer_inn"].includes(field)) {
        section = "employment";
      }
    }
    let instruction = section
      ? (invalid ? "Проверьте и исправьте это поле." : "Заполните это поле.")
      : "Уточните сведения у администратора.";
    if (field === "learner_profile.middle_name" && section && !invalid) {
      instruction = "Укажите отчество или отметьте его отсутствие.";
    }
    return { field, label, section, instruction, invalid };
  });
}
