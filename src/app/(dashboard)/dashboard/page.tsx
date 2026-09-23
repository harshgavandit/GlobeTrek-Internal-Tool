"use client";

import React from 'react';
import Link from 'next/link';
import {ArrowRight,CalendarDays,CircleCheckBig,FilePlus2,FileText,Package,Clock3,Upload,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {InlineError,PageHeader,SearchInput,SectionHeader,StatCard,StatusBadge} from '@/components/workspace/primitives';
import {DataColumn,DataTable} from '@/components/workspace/data-table';
import {useAsyncData} from '@/lib/ui-hooks';
import {db} from '@/lib/db';
import {formatCurrency,formatDate} from '@/lib/utils';
import {businessDate} from '@/lib/business-date';
import {Customer,Product,Quotation} from '@/types';

export default function DashboardPage(){
 const {data,loading,error,reload}=useAsyncData(async()=>{const [quotes,products,customers]=await Promise.all([db.fetchQuotations(),db.fetchProducts(),db.fetchCustomers()]);return {quotes,products,customers};},{quotes:[] as Quotation[],products:[] as Product[],customers:[] as Customer[]});
 const [query,setQuery]=React.useState('');
 const user=db.getCurrentUser(),admin=user?.role==='admin',month=businessDate().slice(0,7),firstName=user?.full_name.split(' ')[0]||'there';
 const recent=React.useMemo(()=>data.quotes.filter(q=>[q.quotation_number,q.customer_name].some(v=>v.toLowerCase().includes(query.toLowerCase()))).slice(0,6),[data.quotes,query]);
 const drafts=React.useMemo(()=>data.quotes.filter(q=>q.status==='draft'),[data.quotes]);
 const columns:DataColumn<Quotation>[]=[
  {key:'number',label:'Quotation',cell:q=><Link className="whitespace-nowrap font-semibold text-primary hover:underline" href={`/quotations/${q.id}`}>{q.quotation_number}</Link>},
  {key:'customer',label:'Customer',cell:q=><div><p className="font-semibold">{q.customer_name}</p><p className="mt-0.5 text-xs text-muted-foreground">{q.customer_country||'Country not supplied'}</p></div>},
  {key:'date',label:'Date',cell:q=><span className="whitespace-nowrap text-muted-foreground">{formatDate(q.quotation_date)}</span>},
  {key:'status',label:'Status',cell:q=><StatusBadge status={q.status}/>},
  {key:'total',label:'Total',align:'right',cell:q=><span className="whitespace-nowrap font-semibold tabular-nums">{formatCurrency(q.total_amount,q.currency)}</span>}
 ];
 const quick=[
  {title:'Create quotation',description:'Choose a customer and start an offer',href:'/quotations/new',icon:FilePlus2,accent:'bg-blue-50 text-blue-700'},
  {title:admin?'Add product':'Browse products',description:'Open equipment and current prices',href:admin?'/products?create=1':'/products',icon:Package,accent:'bg-violet-50 text-violet-700'},
  {title:'Add customer',description:'Save company and contact details',href:'/customers?create=1',icon:Users,accent:'bg-emerald-50 text-emerald-700'},
  ...(admin?[{title:'Import prices',description:'Review an Excel or PDF price list',href:'/price-lists',icon:Upload,accent:'bg-amber-50 text-amber-700'}]:[])
 ];
 return <div className="space-y-7">
  <PageHeader eyebrow="Workspace overview" title={`Welcome back, ${firstName}`} description="Prepare your next quotation, find recent work, or update your catalog." actions={<Button asChild size="lg"><Link href="/quotations/new"><FilePlus2/>Create quotation</Link></Button>}>
   <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden/>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'})}</p>
  </PageHeader>
  <InlineError message={error} onRetry={reload}/>
  <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-4 xl:grid-cols-4">
   <StatCard label="Quotations this month" value={data.quotes.filter(q=>q.quotation_date.startsWith(month)).length} description={new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'})} icon={CalendarDays} loading={loading}/>
   <StatCard label="Accepted quotations" value={data.quotes.filter(q=>q.status==='accepted').length} description="Confirmed customer offers" icon={CircleCheckBig} loading={loading}/>
   <StatCard label="Products available" value={data.products.filter(p=>p.is_active).length} description="Active shared catalog items" icon={Package} loading={loading}/>
   <StatCard label="Customer companies" value={data.customers.length} description="Available to your entire team" icon={Users} loading={loading}/>
  </div>
  <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
   <section className="surface overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5"><SectionHeader title="Recent quotations" description="Open your latest work or search by customer and quotation number." icon={FileText}/><Button asChild variant="ghost" size="sm"><Link href="/quotations">View all<ArrowRight/></Link></Button></div><div className="border-b p-5"><SearchInput className="max-w-md" placeholder="Search recent quotations…" value={query} onValueChange={setQuery}/></div><DataTable label="Recent quotations" data={recent} columns={columns} rowKey={q=>q.id} loading={loading} emptyTitle={query?'No matching quotations':'Your first quotation starts here'} emptyDescription={query?'Try another customer or quotation number.':'Choose a customer, add products from a price list, and prepare a quotation.'} emptyAction={!query&&<Button asChild><Link href="/quotations/new"><FilePlus2/>Create quotation</Link></Button>}/></section>
   <aside className="space-y-5"><section className="surface overflow-hidden"><div className="border-b p-5"><SectionHeader title="Quick actions" description="Start a common task."/></div><nav aria-label="Quick actions" className="divide-y">{quick.map(action=><Link key={action.href} href={action.href} className="group flex items-center gap-3 p-4 transition hover:bg-blue-50/45"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${action.accent}`}><action.icon className="size-4"/></span><span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">{action.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{action.description}</span></span><ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary"/></Link>)}</nav></section>
    <section className="surface overflow-hidden" aria-labelledby="drafts-heading">
     <div className="flex items-center justify-between gap-3 border-b p-5"><div className="flex items-center gap-2"><Clock3 className="size-4 text-amber-700" aria-hidden/><h2 id="drafts-heading" className="text-base font-semibold">Continue a draft</h2></div>{!loading&&<span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{drafts.length}</span>}</div>
     {loading?<p role="status" className="p-5 text-sm text-muted-foreground">Loading drafts…</p>:error?<p className="p-5 text-sm text-muted-foreground">Drafts are unavailable. Retry loading the dashboard.</p>:drafts.length?<ul className="divide-y">{drafts.slice(0,3).map(q=><li key={q.id}><Link href={`/quotations/${q.id}/edit`} className="group flex items-center gap-3 p-5 hover:bg-slate-50"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold group-hover:text-primary">{q.customer_name}</p><p className="mt-1 break-all text-xs text-muted-foreground">{q.quotation_number}</p><p className="mt-2 text-sm font-medium tabular-nums">{formatCurrency(q.total_amount,q.currency)}</p></div><ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden/></Link></li>)}</ul>:<div className="p-5"><p className="text-sm font-medium">No drafts to finish</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Saved drafts appear here so you can return to them quickly.</p></div>}
    </section>
   </aside>
  </div>
 </div>;
}
