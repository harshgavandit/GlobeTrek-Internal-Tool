"use client";

import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState, LoadingState } from './primitives';

export interface DataColumn<T> {
  key: string;
  label: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  initialPageSize?: number;
  label?: string;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  emptyTitle,
  emptyDescription = 'Try another search or clear your filters.',
  emptyAction,
  initialPageSize = 20,
  label = 'Records',
}: DataTableProps<T>) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [sort, setSort] = React.useState<{
    key: string;
    descending: boolean;
  } | null>(null);

  React.useEffect(() => setPage(1), [data, pageSize]);

  const sorted = React.useMemo(() => {
    const column = columns.find((candidate) => candidate.key === sort?.key);
    if (!column?.sortValue || !sort) return data;
    const value = column.sortValue;
    return [...data].sort((a, b) => {
      const aValue = value(a);
      const bValue = value(b);
      const comparison =
        typeof aValue === 'number' && typeof bValue === 'number'
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), undefined, {
              numeric: true,
            });
      return comparison * (sort.descending ? -1 : 1);
    });
  }, [data, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);
  const sortableColumns = columns.filter((column) => column.sortValue);

  const setMobileSort = (value: string) => {
    if (!value) {
      setSort(null);
      return;
    }
    const [key, direction] = value.split(':');
    setSort({ key, descending: direction === 'desc' });
    setPage(1);
  };

  return (
    <div className="surface overflow-hidden" aria-busy={loading}>
      {loading ? (
        <LoadingState label={`Loading ${label.toLowerCase()}`} />
      ) : !data.length ? (
        <EmptyState
          title={emptyTitle || 'No results found'}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <>
          {sortableColumns.length > 0 && (
            <div className="border-b bg-slate-50/80 p-3 md:hidden">
              <label className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <span className="shrink-0">Sort by</span>
                <select
                  aria-label={`Sort ${label.toLowerCase()}`}
                  className="select-control h-9 min-w-0 flex-1 text-xs"
                  value={sort ? `${sort.key}:${sort.descending ? 'desc' : 'asc'}` : ''}
                  onChange={(event) => setMobileSort(event.target.value)}
                >
                  <option value="">Default order</option>
                  {sortableColumns.flatMap((column) => [
                    <option key={`${column.key}-asc`} value={`${column.key}:asc`}>
                      {column.label} · ascending
                    </option>,
                    <option key={`${column.key}-desc`} value={`${column.key}:desc`}>
                      {column.label} · descending
                    </option>,
                  ])}
                </select>
              </label>
            </div>
          )}

          <div className="divide-y md:hidden" role="list" aria-label={`${label} cards`}>
            {visible.map((row) => (
              <article key={rowKey(row)} role="listitem" className="space-y-3 p-4 even:bg-slate-50/50">
                {columns.map((column, index) => {
                  const content = column.cell(row);
                  if (!column.label || column.key === 'actions') {
                    return (
                      <div key={column.key} className="flex justify-end border-t pt-3">
                        {content}
                      </div>
                    );
                  }
                  if (index === 0) {
                    return (
                      <div key={column.key}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {column.label}
                        </p>
                        <div className="text-sm">{content}</div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={column.key}
                      className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] items-start gap-3 text-sm"
                    >
                      <span className="text-muted-foreground">{column.label}</span>
                      <div
                        className={cn(
                          'min-w-0 break-words font-medium text-foreground',
                          column.align === 'right' && 'text-right tabular-nums',
                        )}
                      >
                        {content}
                      </div>
                    </div>
                  );
                })}
              </article>
            ))}
          </div>

          <div className="hidden md:block">
            <Table aria-label={label}>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      scope="col"
                      aria-sort={
                        column.sortValue
                          ? sort?.key === column.key
                            ? sort.descending
                              ? 'descending'
                              : 'ascending'
                            : 'none'
                          : undefined
                      }
                      className={cn(
                        column.align === 'right'
                          ? 'text-right'
                          : column.align === 'center'
                            ? 'text-center'
                            : 'text-left',
                        column.className,
                      )}
                    >
                      {column.sortValue ? (
                        <button
                          className={cn(
                            'inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded px-1 -mx-1 hover:text-primary',
                            column.align === 'right' && 'justify-end',
                          )}
                          onClick={() => {
                            setSort({
                              key: column.key,
                              descending:
                                sort?.key === column.key ? !sort.descending : false,
                            });
                            setPage(1);
                          }}
                        >
                          {column.label}
                          {sort?.key === column.key ? (
                            sort.descending ? (
                              <ArrowDown className="size-3" />
                            ) : (
                              <ArrowUp className="size-3" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        column.label || <span className="sr-only">Actions</span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.align === 'right'
                            ? 'text-right tabular-nums'
                            : column.align === 'center'
                              ? 'text-center'
                              : '',
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-4 py-2.5 text-xs text-muted-foreground">
            <p aria-live="polite">
              {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, data.length)} of{' '}
              {data.length.toLocaleString()} {label.toLowerCase()}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                Rows
                <select
                  aria-label={`${label} per page`}
                  className="select-control h-9 w-20 px-2 text-sm"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  {Array.from(new Set([10, 20, 50, initialPageSize])).sort((a,b)=>a-b).map((size) => (
                    <option key={size}>{size}</option>
                  ))}
                </select>
              </label>
              <nav aria-label={`${label} pagination`} className="flex items-center gap-1">
                <Button type="button" aria-label={`First ${label.toLowerCase()} page`} variant="ghost" size="icon" className="size-9" disabled={current === 1} onClick={() => setPage(1)}><ChevronsLeft /></Button>
                <Button
                  aria-label={`Previous ${label.toLowerCase()} page`}
                  variant="outline"
                  size="icon"
                  className="size-9"
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft />
                </Button>
                <span className="px-2 tabular-nums">
                  Page {current} of {pageCount}
                </span>
                <Button
                  aria-label={`Next ${label.toLowerCase()} page`}
                  variant="outline"
                  size="icon"
                  className="size-9"
                  disabled={current === pageCount}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight />
                </Button>
                <Button type="button" aria-label={`Last ${label.toLowerCase()} page`} variant="ghost" size="icon" className="size-9" disabled={current === pageCount} onClick={() => setPage(pageCount)}><ChevronsRight /></Button>
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
