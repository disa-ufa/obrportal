import { EmptyState } from "./EmptyState";

export function SmallTable({ columns, rows, emptyText }) {
  if (!rows?.length) {
    return (
      <EmptyState
        title={emptyText || "Данных нет"}
        description="После загрузки данные появятся в этой таблице."
      />
    );
  }

  return (
    <div className="overflow-auto rounded-2xl ring-1 ring-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700"
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, index) => (
            <tr key={row.id || `${row.code}-${index}`}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="max-w-md whitespace-normal break-words px-4 py-3 text-slate-700"
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
