export function ActionButton({
  children,
  onClick,
  type = "button",
  tone = "dark",
  disabled = false,
}) {
  const tones = {
    dark: "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300",
    light: "bg-white text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50 disabled:text-slate-400 disabled:ring-slate-200",
    blue: "bg-blue-700 text-white hover:bg-blue-800 disabled:bg-blue-300",
    red: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-xs font-black transition-colors disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
