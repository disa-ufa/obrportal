import {
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AccountLearnerProfileCard } from "./AccountLearnerProfileCard";


function AccountValue({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-blue-600 ring-1 ring-slate-200">
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500">
            {label}
          </div>

          <div className="mt-1 break-words font-semibold text-slate-950">
            {value || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}


export function LearnerAccountProfile({
  accountUser,
}) {
  const fullName =
    accountUser?.full_name ||
    "Пользователь ОбрПортала";

  const loginEmail =
    accountUser?.email ||
    "—";

  return (
    <section
      data-testid="learner-account-profile-workspace"
      className="space-y-5"
    >
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <UserRound size={23} />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Учебный кабинет
            </div>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Мой профиль
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Персональные и контактные данные,
              которые используются при обучении
              и подготовке итоговых документов.
            </p>
          </div>
        </div>
      </div>

      <div
        data-testid="learner-profile-account-summary"
        className="grid gap-3 md:grid-cols-2"
      >
        <AccountValue
          icon={ShieldCheck}
          label="Учётная запись"
          value={fullName}
        />

        <AccountValue
          icon={Mail}
          label="E-mail для входа"
          value={loginEmail}
        />
      </div>

      <AccountLearnerProfileCard
        accountUser={accountUser}
      />
    </section>
  );
}
