import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { setPasswordWithToken } from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";
import { formatApiError } from "../utils/apiErrors";

const TEXT = {
  fillBoth: "Заполните оба поля пароля.",
  minLength: "Пароль должен содержать не менее 8 символов.",
  mismatch: "Пароли не совпадают.",
  missingToken: "Ссылка установки пароля некорректна: отсутствует token.",
  apiFallback: "Не удалось установить пароль. Проверьте ссылку или запросите новое приглашение.",
  pageTitle: "Установка пароля",
  pageSubtitle: "Задайте пароль для входа в личный кабинет ObrPortal.",
  badLinkTitle: "Некорректная ссылка",
  badLinkBody: "В ссылке отсутствует token. Откройте полную ссылку из приглашения или запросите новое приглашение у администратора.",
  successTitle: "Пароль успешно установлен.",
  successPrefix: "Аккаунт",
  successFallbackUser: "пользователя",
  successSuffix: "активирован. Теперь можно войти в систему с новым паролем.",
  goLogin: "Перейти ко входу",
  submitErrorTitle: "Не удалось установить пароль",
  newPassword: "Новый пароль",
  repeatPassword: "Повторите пароль",
  loadingButton: "Устанавливаем пароль...",
  submitButton: "Установить пароль",
  securityTitle: "Безопасность ссылки",
  securitySubtitle: "Одноразовая ссылка действует ограниченное время.",
  securityOne: "Ссылка используется только один раз. После успешной установки пароля повторно применить ее нельзя.",
  securityTwo: "Если срок действия истек или ссылка уже была использована, запросите новое приглашение у администратора.",
  securityThree: "Пароль должен содержать не менее 8 символов. Не используйте очевидные пароли и не передавайте их другим людям.",
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

export function SetPasswordPage({ onPageChange }) {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [successPayload, setSuccessPayload] = useState(null);
  const [error, setError] = useState("");

  const hasToken = Boolean(token);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validationError = getPasswordValidationError(password, passwordConfirmation);
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
      const payload = await setPasswordWithToken(token, password);
      setSuccessPayload(payload);
      setPassword("");
      setPasswordConfirmation("");
    } catch (err) {
      setSuccessPayload(null);
      setError(formatApiError(err, TEXT.apiFallback));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <SectionCard
        title={TEXT.pageTitle}
        subtitle={TEXT.pageSubtitle}
      >
        {!hasToken && (
          <Alert title={TEXT.badLinkTitle} tone="red">
            {TEXT.badLinkBody}
          </Alert>
        )}

        {successPayload ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-green-50 p-5 text-sm leading-6 text-green-800 ring-1 ring-green-200">
              <div className="text-base font-bold text-green-900">
                {TEXT.successTitle}
              </div>
              <div className="mt-2">
                {TEXT.successPrefix} {successPayload.email || TEXT.successFallbackUser} {TEXT.successSuffix}
              </div>
            </div>

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
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </label>

            <button
              type="submit"
              className="portal-btn-primary w-full"
              disabled={loading || !hasToken}
            >
              {loading ? TEXT.loadingButton : TEXT.submitButton}
            </button>
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
