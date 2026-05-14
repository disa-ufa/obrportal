export function OrganizationCabinetErrorAlert({ error }) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-3xl bg-red-50 p-5 text-sm text-red-800 ring-1 ring-red-200">
      {error}
    </div>
  );
}
