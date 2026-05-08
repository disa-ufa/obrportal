import { EmptyState } from "./EmptyState";

export function SmallTable({
  columns,
  rows,
  emptyText,
  getRowId = (row, index) => row.id || row.code || index,
  selectedRowId = null,
  minWidth = "760px",
}) {
  if (!rows?.length) {
    return (
      <EmptyState
        title={emptyText || "Данных нет"}
        description="После загрузки данные появятся в этой таблице."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200">
      <table
        className="w-full divide-y divide-slate-200 text-sm"
        style={{ minWidth }}
      >
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
          {rows.map((row, index) => {
            const rowId = String(getRowId(row, index));
            const isSelected = selectedRowId && rowId === String(selectedRowId);

            return (
              <tr
                key={rowId}
                className={`transition-colors ${
                  isSelected
                    ? "bg-blue-50"
                    : "hover:bg-slate-50"
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`max-w-md whitespace-normal break-words px-4 py-3 ${
                      isSelected ? "text-slate-950" : "text-slate-700"
                    }`}
                  >
                    {column.render ? column.render(row) : row[column.key] || "-"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
