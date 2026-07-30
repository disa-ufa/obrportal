import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { resetPasswordWithToken } from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";
import { formatApiError } from "../utils/apiErrors";

const TEXT = {
  fillBoth: "Заполните оба поля пароля.",
  minLength: "Пароль должен содержать не менее 8 символов.",
  mismatch: "Пароли не совпадают.",
  missingToken: "Ссылка восстановления пароля некорректна: отсутствует token.",
  apiFallback:
    "Не удалось изменить пароль. Проверьте ссылку или запросите новую.",
  pageTitle: "Новый пароль",
  pageSubtitle: "Задайте новый пароль для входа в ObrPortal.",
  badLinkTitle: "Некорректная ссылка",
  badLinkBody:
    "В ссылке отсутствует token. Откройте полную ссылку из письма или запросите восстановление пароля повторно.",
  successTitle: "Пароль успешно изменён",
  successBody: "Теперь можно войти в систему с новым паролем.",
  goLogin: "Перейти ко входу",
  requestAgain: "Запросить новую ссылку",
  submitErrorTitle: "Не удалось изменить пароль",
  newPassword: "Новый пароль",
  repeatPassword: "Повторите пароль",
  loadingButton: "Сохраняем пароль...",
  submitButton: "Сохранить новый пароль",
  securityTitle: "Безопасность ссылки",
  securitySubtitle: "Ссылка одноразовая и действует ограниченное время.",
  securityOne:
    "После успешной смены пароля повторно использовать эту ссылку нельзя.",
  securityTwo:
    "Если срок действия истёк, запросите новую ссылку восстановления.",
  securityThree:
    "Используйте уникальный пароль длиной не менее 8 символов и не передавайте его другим людям.",
};

function getPasswordValidationError(password, passwordConfirmation) {
  if (!password || !passwordConfirmation) {
    return TEXT.fillBoth;
  }

  if (password.length < 8) {
    return TEXT.minLength;
  }

  if (password !== passwordConfirmation) {
    return TEXT.mismatch;
  }

  return "";
}

export function ResetPasswordPage({ onPageChange }) {
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() || "",
    [searchParams]
  );

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const hasToken = Boolean(token);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validationError = getPasswordValidationError(
      password,
      passwordConfirmation
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!hasToken) {
      setError(TEXT.missingToken);
      return;
    }

    setLoading(true);

    try {
      await resetPasswordWithToken(token, password);
      setSuccess(true);
      setPassword("");
      setPasswordConfirmation("");
    } catch (err) {
      setSuccess(false);
      setError(formatApiError(err, TEXT.apiFallback));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <SectionCard title={TEXT.pageTitle} subtitle={TEXT.pageSubtitle}>
        {!hasToken && (
          <Alert title={TEXT.badLinkTitle} tone="red">
            {TEXT.badLinkBody}
          </Alert>
        )}

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
              <Alert title={TEXT.submitErrorTitle} tone="red">
                {error}
              </Alert>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                {TEXT.newPassword}
              </span>
              <input
                type="password"
                className="portal-input mt-2"
                value={password}
                minLength={8}
                autoComplete="new-password"
                disabled={loading || !hasToken}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                {TEXT.repeatPassword}
              </span>
              <input
                type="password"
                className="portal-input mt-2"
                value={passwordConfirmation}
                minLength={8}
                autoComplete="new-password"
                disabled={loading || !hasToken}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
              />
            </label>

            <button
              type="submit"
              className="portal-btn-primary w-full"
              disabled={loading || !hasToken}
            >
              {loading ? TEXT.loadingButton : TEXT.submitButton}
            </button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                onClick={() => onPageChange?.("forgot-password")}
                className="text-sm font-semibold text-blue-700 transition hover:text-blue-900"
              >
                {TEXT.requestAgain}
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
