"use client";
import React from 'react';
import Link from 'next/link';
import { CalendarDays, FileText, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader,SearchInput,InlineError,StatusBadge } from '@/components/workspace/primitives';
import { DataTable,DataColumn } from '@/components/workspace/data-table';
import { QuotationActions } from '@/components/quotations/quotation-actions';
import { useAsyncData } from '@/lib/ui-hooks';
import { db } from '@/lib/db';
import { Quotation } from '@/types';
import { formatCurrency,formatDate } from '@/lib/utils';
export default function QuotationsHistoryPage(){
 const {data,loading,error,reload}=useAsyncData(()=>db.fetchQuotations(),[] as Quotation[]);const [actionError,setActionError]=React.useState('');const [query,setQuery]=React.useState('');const [status,setStatus]=React.useState('all');const [author,setAuthor]=React.useState('all');const [from,setFrom]=React.useState('');const [to,setTo]=React.useState('');
 const rows=React.useMemo(()=>data.filter(q=>(status==='all'||q.status===status)&&(author==='all'||q.created_by_user_id===author)&&(!from||q.quotation_date>=from)&&(!to||q.quotation_date<=to)&&`${q.quotation_number} ${q.customer_name} ${q.customer_contact_person} ${q.customer_country}`.toLowerCase().includes(query.toLowerCase())),[data,query,status,author,from,to]);
 const authors=[...new Map(data.map(q=>[q.created_by_user_id,q.created_by_name])).entries()];
 const columns:DataColumn<Quotation>[]=[{key:'number',label:'Quotation',sortValue:q=>q.quotation_number,cell:q=><Link className="font-semibold text-slate-900 whitespace-nowrap hover:text-primary hover:underline underline-offset-4" href={`/quotations/${q.id}`}>{q.quotation_number}</Link>},{key:'customer',label:'Customer',sortValue:q=>q.customer_name,cell:q=><span className="block min-w-32 max-w-52 line-clamp-2 font-medium">{q.customer_name}</span>},{key:'format',label:'Format',cell:q=><span className="inline-flex whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{q.quotation_type==='export'?'Export':'Indian'}</span>},{key:'country',label:'Country',sortValue:q=>q.customer_country||'',cell:q=>q.customer_country||'—'},{key:'date',label:'Date',sortValue:q=>q.quotation_date,cell:q=><span className="whitespace-nowrap text-muted-foreground">{formatDate(q.quotation_date)}</span>},{key:'author',label:'Created by',sortValue:q=>q.created_by_name,cell:q=><span className="text-muted-foreground whitespace-nowrap">{q.created_by_name}</span>},{key:'total',label:'Total',align:'right',sortValue:q=>q.total_amount,cell:q=><span className="block whitespace-nowrap text-right"><span className="font-semibold tabular-nums text-slate-900">{formatCurrency(q.total_amount,q.currency)}</span><span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">{q.currency}</span></span>},{key:'status',label:'Status',cell:q=><StatusBadge status={q.status}/>},{key:'actions',label:'Actions',align:'right',cell:q=><QuotationActions quotation={q} onChanged={reload} onError={setActionError}/>}];
 return <div className="space-y-6">
  <PageHeader eyebrow="Sales workspace" title="Quotations" description="Every customer offer, from first draft to final decision." actions={<Button asChild><Link href="/quotations/new"><Plus className="size-4"/>New quotation</Link></Button>}/>
  <InlineError message={error||actionError} onRetry={error?reload:undefined} onDismiss={actionError?()=>setActionError(''):undefined}/>
  <section className="surface" aria-label="Quotation history">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
    <div className="flex items-center gap-2.5"><FileText className="size-4 text-slate-500"/><h2 className="text-sm font-semibold">Quotation history</h2>{!loading&&<span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">{data.length}</span>}</div>
    <p className="text-xs text-muted-foreground">View, revise, and download your saved offers</p>
   </div>
   <div className="table-toolbar">
    <SearchInput value={query} onValueChange={setQuery} placeholder="Search quotation or customer…" className="sm:max-w-sm"/>
    <select className="select-control sm:w-36" aria-label="Quotation status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{['draft','sent','accepted','rejected'].map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select>
    <select className="select-control sm:w-40" aria-label="Created by" value={author} onChange={e=>setAuthor(e.target.value)}><option value="all">All team members</option>{authors.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>
   </div>
   <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-5">
    <span className="flex items-center gap-2 text-xs font-medium text-slate-600"><CalendarDays className="size-3.5"/>Quotation date</span>
    <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs text-muted-foreground">From<Input type="date" aria-label="From date" value={from} onChange={e=>setFrom(e.target.value)} className="h-9 w-36 bg-white"/></label><span aria-hidden className="hidden text-slate-400 sm:inline">–</span><label className="flex items-center gap-2 text-xs text-muted-foreground">To<Input type="date" aria-label="To date" min={from} value={to} onChange={e=>setTo(e.target.value)} className="h-9 w-36 bg-white"/></label></div>
    {(query||status!=='all'||author!=='all'||from||to)&&<Button variant="ghost" size="sm" className="sm:ml-auto" onClick={()=>{setQuery('');setStatus('all');setAuthor('all');setFrom('');setTo('');}}><X className="size-3.5"/>Clear filters</Button>}
   </div>
   <DataTable label="quotations" data={rows} columns={columns} rowKey={q=>q.id} loading={loading} emptyTitle={data.length?'No quotations match':'Your first offer starts here'} emptyDescription={data.length?'Adjust your search, status, or date filters.':'Choose a customer and add products to prepare your first quotation.'} emptyAction={!data.length?<Button asChild variant="outline"><Link href="/quotations/new">Create quotation</Link></Button>:undefined}/>
  </section>
 </div>;
}
