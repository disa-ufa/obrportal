export function JsonBlock({ value }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100 ring-1 ring-slate-800">
      {JSON.stringify(value || {}, null, 2)}
    </pre>
  );
}
