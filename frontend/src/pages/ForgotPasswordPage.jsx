import { useState } from "react";
import { Link } from "react-router-dom";

import { requestPasswordReset } from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";
import { formatApiError } from "../utils/apiErrors";

const TEXT = {
  pageTitle: "Восстановление пароля",
  pageSubtitle: "Укажите e-mail, который используется для входа в портал.",
  emailLabel: "E-mail",
  emailPlaceholder: "name@example.com",
  emailRequired: "Укажите e-mail.",
  submitButton: "Отправить ссылку",
  loadingButton: "Отправляем...",
  errorTitle: "Не удалось отправить запрос",
  errorFallback: "Не удалось отправить запрос восстановления пароля.",
  successTitle: "Запрос принят",
  successBody:
    "Если учётная запись существует, инструкции по восстановлению пароля отправлены на указанный адрес.",
  goLogin: "Вернуться ко входу",
  securityTitle: "Безопасность",
  securitySubtitle: "Система не раскрывает наличие учётной записи.",
  securityOne:
    "Одинаковый ответ показывается для существующих и неизвестных адресов.",
  securityTwo:
    "Ссылка из письма одноразовая и действует ограниченное время.",
  securityThree:
    "Если письмо не пришло, проверьте папку «Спам» и правильность введённого адреса.",
};

export function ForgotPasswordPage({ onPageChange }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim();

    setError("");
    setSuccess(false);

    if (!normalizedEmail) {
      setError(TEXT.emailRequired);
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(normalizedEmail);
      setSuccess(true);
    } catch (err) {
      setError(formatApiError(err, TEXT.errorFallback));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <SectionCard title={TEXT.pageTitle} subtitle={TEXT.pageSubtitle}>
        {success ? (
          <div className="space-y-5">
            <Alert title={TEXT.successTitle} tone="green">
              {TEXT.successBody}
            </Alert>

            <Link
              to="/login"
              onClick={() => onPageChange?.("login")}
              className="portal-btn-primary"
            >
              {TEXT.goLogin}
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <Alert title={TEXT.errorTitle} tone="red">
                {error}
              </Alert>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                {TEXT.emailLabel}
              </span>
              <input
                type="email"
                className="portal-input mt-2"
                value={email}
                autoComplete="email"
                placeholder={TEXT.emailPlaceholder}
                disabled={loading}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <button
              type="submit"
              className="portal-btn-primary w-full"
              disabled={loading}
            >
              {loading ? TEXT.loadingButton : TEXT.submitButton}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                onClick={() => onPageChange?.("login")}
                className="text-sm font-semibold text-blue-700 transition hover:text-blue-900"
              >
                {TEXT.goLogin}
              </Link>
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title={TEXT.securityTitle}
        subtitle={TEXT.securitySubtitle}
      >
        <div className="space-y-4 text-sm leading-6 text-slate-600">
          <div className="rounded-2xl bg-blue-50 p-4 text-blue-800 ring-1 ring-blue-200">
            {TEXT.securityOne}
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            {TEXT.securityTwo}
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            {TEXT.securityThree}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
