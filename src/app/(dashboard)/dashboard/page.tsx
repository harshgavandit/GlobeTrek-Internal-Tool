"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CircleCheckBig, FilePlus2, FileText, Package, Clock3, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineError, PageHeader, SearchInput, StatCard, StatusBadge } from '@/components/workspace/primitives';
import { DataColumn, DataTable } from '@/components/workspace/data-table';
import { useAsyncData } from '@/lib/ui-hooks';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { businessDate } from '@/lib/business-date';
import { Customer, Product, Quotation } from '@/types';

export default function DashboardPage() {
  const { data, loading, error, reload } = useAsyncData(async () => {
    const [quotes, products, customers] = await Promise.all([db.fetchQuotations(), db.fetchProducts(), db.fetchCustomers()]);
    return { quotes, products, customers };
  }, { quotes: [] as Quotation[], products: [] as Product[], customers: [] as Customer[] });
  const [query, setQuery] = React.useState('');
  const user = db.getCurrentUser(), admin = user?.role === 'admin', month = businessDate().slice(0, 7), firstName = user?.full_name.split(' ')[0] || 'there';
  const recent = React.useMemo(() => data.quotes.filter(q => [q.quotation_number, q.customer_name].some(v => v.toLowerCase().includes(query.toLowerCase()))).slice(0, 6), [data.quotes, query]);
  const drafts = React.useMemo(() => data.quotes.filter(q => q.status === 'draft'), [data.quotes]);
  const columns: DataColumn<Quotation>[] = [
    { key: 'number', label: 'Quotation', cell: q => <Link className="whitespace-nowrap font-medium text-primary underline-offset-4 hover:underline" href={`/quotations/${q.id}`}>{q.quotation_number}</Link> },
    { key: 'customer', label: 'Customer', cell: q => <div className="min-w-[140px]"><p className="font-medium text-foreground">{q.customer_name}</p><p className="mt-1 text-xs text-muted-foreground">{q.customer_country || 'Country not supplied'}</p></div> },
    { key: 'date', label: 'Created', cell: q => <span className="whitespace-nowrap text-muted-foreground">{formatDate(q.quotation_date)}</span> },
    { key: 'status', label: 'Status', cell: q => <StatusBadge status={q.status} /> },
    { key: 'total', label: 'Amount', align: 'right', cell: q => <span className="whitespace-nowrap font-semibold tabular-nums">{formatCurrency(q.total_amount, q.currency)}</span> },
  ];
  const quick = [
    { title: 'Create quotation', description: 'Build your next customer offer', href: '/quotations/new', icon: FilePlus2 },
    { title: admin ? 'Add product' : 'Browse products', description: 'Equipment, specifications and prices', href: admin ? '/products?create=1' : '/products', icon: Package },
    { title: 'Add customer', description: 'Company and contact details', href: '/customers?create=1', icon: Users },
    ...(admin ? [{ title: 'Import price list', description: 'Upload and review Excel or PDF', href: '/price-lists', icon: Upload }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${firstName}`}
        description="Your quotations, customers and catalog. One clear view."
        actions={<Button asChild><Link href="/quotations/new"><FilePlus2 className="size-4" />Create quotation</Link></Button>}
      >
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden />{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
      </PageHeader>
      <InlineError message={error} onRetry={reload} />

      <section aria-label="Workspace statistics" className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Quotations this month" value={data.quotes.filter(q => q.quotation_date.startsWith(month)).length} description={new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })} icon={CalendarDays} loading={loading} />
        <StatCard label="Accepted quotations" value={data.quotes.filter(q => q.status === 'accepted').length} description="Customer-confirmed offers" icon={CircleCheckBig} loading={loading} />
        <StatCard label="Active products" value={data.products.filter(p => p.is_active).length} description="Available in your catalog" icon={Package} loading={loading} />
        <StatCard label="Customer companies" value={data.customers.length} description="Your shared customer directory" icon={Users} loading={loading} />
      </section>

      <nav aria-label="Quick actions" className={`grid gap-3 sm:grid-cols-2 ${admin ? '2xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        {quick.map(action => <Link key={action.href} href={action.href} className="group flex min-w-0 items-center gap-3 rounded-lg border bg-white p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 transition-colors group-hover:border-blue-200 group-hover:bg-white group-hover:text-primary"><action.icon className="size-4" aria-hidden /></span>
          <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">{action.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.description}</span></span>
          <ArrowRight className="size-3.5 shrink-0 text-slate-400 group-hover:text-primary" aria-hidden />
        </Link>)}
      </nav>

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="surface min-w-0 overflow-hidden" aria-labelledby="recent-quotations-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div className="flex items-center gap-2.5"><FileText className="size-4 text-muted-foreground" aria-hidden /><h2 id="recent-quotations-heading" className="text-sm font-semibold">Recent quotations</h2></div>
            <Button asChild variant="ghost" size="sm" className="text-xs"><Link href="/quotations">View all quotations<ArrowRight className="size-3.5" /></Link></Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50/50 px-5 py-3">
            <SearchInput className="w-full sm:max-w-[320px]" placeholder="Search customer or quotation…" value={query} onValueChange={setQuery} />
            <p className="text-xs text-muted-foreground">{query ? 'Search results' : 'Your latest 6 quotations'}</p>
          </div>
          <div className="[&>.surface]:rounded-none [&>.surface]:border-0 [&>.surface]:shadow-none"><DataTable label="Recent quotations" data={recent} columns={columns} rowKey={q => q.id} loading={loading} emptyTitle={query ? 'No matching quotations' : 'Your first quotation starts here'} emptyDescription={query ? 'Try another customer or quotation number.' : 'Choose a customer, add products from a price list, and prepare a quotation.'} emptyAction={!query && <Button asChild><Link href="/quotations/new"><FilePlus2 className="size-4" />Create quotation</Link></Button>} /></div>
        </section>

        <aside className="surface overflow-hidden" aria-labelledby="drafts-heading">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <div className="flex items-center gap-2.5"><Clock3 className="size-4 text-muted-foreground" aria-hidden /><h2 id="drafts-heading" className="text-sm font-semibold">Continue a draft</h2></div>
            {!loading && !error && <span className="rounded-md border bg-slate-50 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">{drafts.length}</span>}
          </div>
          <p className="border-b bg-slate-50/50 px-5 py-3 text-xs leading-5 text-muted-foreground">Pick up where you left off.</p>
          {loading ? <div role="status" className="space-y-4 p-5"><span className="sr-only">Loading drafts…</span>{[0, 1, 2].map(i => <div key={i} className="space-y-2"><div className="skeleton h-3 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>)}</div> : error ? <p className="p-5 text-sm leading-6 text-muted-foreground">Drafts are unavailable. Retry loading the dashboard.</p> : drafts.length ? <ul className="divide-y">
            {drafts.slice(0, 3).map(q => <li key={q.id}><Link href={`/quotations/${q.id}/edit`} className="group block p-5 transition-colors hover:bg-slate-50">
              <div className="flex items-start gap-3"><p className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-5 group-hover:text-primary">{q.customer_name}</p><ArrowRight className="mt-0.5 size-3.5 shrink-0 text-slate-400 group-hover:text-primary" aria-hidden /></div>
              <p className="mt-1.5 break-all text-[11px] text-muted-foreground">{q.quotation_number}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[13px] font-semibold tabular-nums">{formatCurrency(q.total_amount, q.currency)}</p><StatusBadge status="draft" /></div>
            </Link></li>)}
          </ul> : <div className="px-5 py-8"><span className="mb-3 flex size-9 items-center justify-center rounded-lg border bg-slate-50"><CircleCheckBig className="size-4 text-slate-500" aria-hidden /></span><p className="text-sm font-medium">You’re all caught up</p><p className="mt-1.5 text-xs leading-6 text-muted-foreground">Saved drafts will appear here when there’s a quotation to finish.</p></div>}
          {drafts.length > 3 && <div className="border-t px-5 py-3"><Link href="/quotations" className="inline-flex min-h-9 items-center gap-2 text-xs font-medium text-primary hover:underline">View quotation history<ArrowRight className="size-3.5" aria-hidden /></Link></div>}
        </aside>
      </div>
    </div>
  );
}
