import type { Key, ReactNode } from "react";

export interface ResponsiveTableColumn<Row> {
  id: string;
  label: string;
  header?: ReactNode;
  render: (row: Row, index: number) => ReactNode;
  action?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

interface ResponsiveTableProps<Row> {
  rows: Row[];
  columns: ResponsiveTableColumn<Row>[];
  getRowKey: (row: Row) => Key;
  ariaLabel: string;
  emptyMessage: ReactNode;
  mobileHeader?: ReactNode;
  tableMinWidthClassName?: string;
  tableClassName?: string;
}

export default function ResponsiveTable<Row>({
  rows,
  columns,
  getRowKey,
  ariaLabel,
  emptyMessage,
  mobileHeader,
  tableMinWidthClassName = "min-w-full",
  tableClassName = "text-sm text-[#34362f]",
}: ResponsiveTableProps<Row>) {
  const detailColumns = columns.filter((column) => !column.action);
  const actionColumns = columns.filter((column) => column.action);

  return (
    <>
      <div className="space-y-3 md:hidden">
        {mobileHeader}
        {rows.length === 0 ? (
          <div className="rounded-xl border border-[#e5dfd3] bg-white px-4 py-8 text-center text-sm leading-relaxed text-[#625f54]">
            <p className="mx-auto max-w-prose whitespace-normal break-words">{emptyMessage}</p>
          </div>
        ) : rows.map((row, index) => (
          <article key={getRowKey(row)} className="min-w-0 rounded-xl border border-[#e5dfd3] bg-white p-4 shadow-sm">
            <dl className="space-y-3">
              {detailColumns.map((column) => (
                <div key={column.id} className="grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] gap-3 border-b border-[#eee8dc] pb-3 last:border-b-0 last:pb-0">
                  <dt className="min-w-0 text-xs font-bold leading-5 text-[#625f54]">{column.label}</dt>
                  <dd className={`min-w-0 whitespace-normal break-words text-sm leading-5 text-[#20251f] ${column.cellClassName || ""}`}>
                    {column.render(row, index)}
                  </dd>
                </div>
              ))}
            </dl>
            {actionColumns.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#e5dfd3] pt-3">
                {actionColumns.map((column) => (
                  <div key={column.id} className={`min-w-0 ${column.cellClassName || ""}`}>
                    {column.label && <span className="sr-only">{column.label}: </span>}
                    {column.render(row, index)}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[#e5dfd3] bg-white md:block">
        <table aria-label={ariaLabel} className={`w-full ${tableMinWidthClassName} border-collapse text-left ${tableClassName}`}>
          <thead className="border-b border-[#e5dfd3] bg-[#f8f3e9] text-xs font-bold uppercase tracking-wide text-[#514b3e]">
            <tr>
              {columns.map((column) => (
                <th key={column.id} scope="col" className={`whitespace-normal px-4 py-3 align-bottom ${column.headerClassName || ""}`}>
                  {column.header ?? column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5dfd3]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="whitespace-normal break-words px-4 py-10 text-center align-middle text-sm leading-relaxed text-[#625f54]">
                  <span className="mx-auto block max-w-prose">{emptyMessage}</span>
                </td>
              </tr>
            ) : rows.map((row, index) => (
              <tr key={getRowKey(row)} className="align-top transition-colors hover:bg-[#fbf8f1]">
                {columns.map((column) => (
                  <td key={column.id} className={`min-w-0 whitespace-normal px-4 py-3 align-top ${column.cellClassName || ""}`}>
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
