import { useState } from "react";
import { Alert } from "../components/ui/Alert";
import { SectionCard } from "../components/ui/SectionCard";

export function RegisterPage({ onPageChange }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        title="Регистрация"
        subtitle="Frontend-экран для будущего self-service signup пользователя."
      >
        {submitted && (
          <Alert title="Регистрация пока не подключена" tone="blue">
            На текущем этапе это UX-страница. Backend signup ещё не реализован, поэтому
            саморегистрация пока не отправляет данные в систему.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ФИО
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Иванов Иван Иванович"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Телефон
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7 (900) 000-00-00"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум для будущего signup flow"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              Я подтверждаю ознакомление с публичной политикой ПДн и понимаю, что на
              этом этапе экран регистрации ещё не подключён к backend.
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Зарегистрироваться
            </button>
            <button
              type="button"
              onClick={() => onPageChange("login")}
              className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              У меня уже есть аккаунт
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Что будет на следующем этапе"
        subtitle="Следующий проход уже будет про настоящий signup flow."
      >
        <div className="space-y-4 text-sm leading-6 text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            Публичный backend endpoint регистрации
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            Валидация формы и обработка ошибок
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            Создание пользователя ФЛ и перевод в личный кабинет
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            Связка с согласием на ПДн и пользовательскими документами
          </div>

          <div className="rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
            Сейчас это честный UX-stub: маршрут и экран готовы, но сохранение данных
            ещё не реализовано.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}