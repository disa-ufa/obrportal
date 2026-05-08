import { SectionCard } from "../ui/SectionCard";

export function RbacResult({ rbac }) {
  return (
    <SectionCard title="RBAC result">
      {!rbac ? (
        <p className="text-slate-600">
          RBAC-проверка ещё не запускалась.
        </p>
      ) : (
        <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">
          {JSON.stringify(rbac, null, 2)}
        </pre>
      )}
    </SectionCard>
  );
}
