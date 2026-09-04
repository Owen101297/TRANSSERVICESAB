"use client";

import React from "react";
import { TableSkeleton } from "./TableSkeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { Inbox } from "lucide-react";

export interface Column<T> {
  header: string | React.ReactNode;
  accessor: keyof T;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = "No se encontraron registros para mostrar con los filtros actuales.",
  emptyTitle = "No hay registros disponibles",
  emptyActionLabel,
  onEmptyAction,
  className = "",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <TableSkeleton
        rows={6}
        columns={columns.length}
        className={className}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar la tabla"
        message={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle}
        description={emptyMessage}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-apple-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80">
              {columns.map((col, idx) => (
                <th
                  key={String(col.accessor) + idx}
                  className={`px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {data.map((row, i) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50/80 transition-colors"
              >
                {columns.map((col, idx) => (
                  <td
                    key={String(col.accessor) + idx}
                    className={`px-4 py-3.5 align-middle ${col.className || ""}`}
                  >
                    {col.render
                      ? col.render(row[col.accessor], row)
                      : (row[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
