export interface Column<T> {
  header: string | React.ReactNode;
  accessor: keyof T;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  emptyMessage = "No hay registros para mostrar.",
}: {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line-600">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line-600 bg-asphalt-800">
            {columns.map((col) => (
              <th
                key={String(col.accessor)}
                className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-fog-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-fog-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-line-600/60 last:border-0 hover:bg-asphalt-800/60 ${
                  i % 2 === 0 ? "bg-asphalt-900" : "bg-asphalt-900/60"
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.accessor)}
                    className={`px-4 py-3 text-mist-200 ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(row[col.accessor], row)
                      : String(row[col.accessor] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
