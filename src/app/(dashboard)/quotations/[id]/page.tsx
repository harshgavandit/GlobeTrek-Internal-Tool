"use client";
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader,InlineError,LoadingState,EmptyState,StatusBadge } from '@/components/workspace/primitives';
import { QuotationPreviewSheet } from '@/components/quotations/quotation-preview-sheet';
import { QuotationActions } from '@/components/quotations/quotation-actions';
import { Quotation } from '@/types';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
export default function QuotationDetailPage(){
 const {id}=useParams<{id:string}>();const [quotation,setQuotation]=React.useState<Quotation|null>(null);const [loading,setLoading]=React.useState(true);const [error,setError]=React.useState('');
 const load=React.useCallback(async()=>{setError('');try{await db.fetchQuotations();setQuotation(db.getQuotationById(id)||null);}catch(e){setError(e instanceof Error?e.message:'Could not load quotation.');}finally{setLoading(false);}},[id]);
 React.useEffect(()=>{void load();},[load]);
 if(loading)return <LoadingState label="Loading saved quotation…"/>;
 if(!quotation)return <><InlineError message={error} onRetry={load}/><EmptyState title="Quotation unavailable" description="Choose an existing quotation from history." action={<Button variant="outline" asChild><Link href="/quotations">View Quotations</Link></Button>}/></>;
 return <div className="space-y-6">
  <PageHeader eyebrow="Saved quotation" title={<span className="flex flex-wrap items-center gap-3"><span className="break-words">{quotation.quotation_number}</span><StatusBadge status={quotation.status}/></span>} description={`${quotation.customer_name} · ${formatDate(quotation.quotation_date)} · Revision ${quotation.revision}`}/>
  <InlineError message={error} onDismiss={()=>setError('')}/>
  <section className="surface" aria-label="Quotation information and actions">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5"><p className="text-[13px] font-medium text-slate-600">Manage this quotation</p><QuotationActions quotation={quotation} onChanged={load} onError={setError} detail/></div>
   <dl className="grid gap-x-6 gap-y-5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Quotation format</dt><dd className="mt-1.5 text-[13px] font-medium text-slate-900">{quotation.quotation_type==='export'?'Export quotation':'Indian quotation'}</dd></div>
    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Prepared by</dt><dd className="mt-1.5 break-words text-[13px] font-medium text-slate-900">{quotation.created_by_name}</dd></div>
    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Price list</dt><dd className="mt-1.5 break-words text-[13px] font-medium text-slate-900">{quotation.price_list_name} · {quotation.currency}</dd>{quotation.currency==='USD'&&quotation.price_list_currency==='INR'&&<dd className="mt-1 text-xs text-muted-foreground">1 USD = {quotation.exchange_rate} INR</dd>}</div>
    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Valid until</dt><dd className="mt-1.5 text-[13px] font-medium text-slate-900">{formatDate(quotation.valid_until)}</dd></div>
   </dl>
  </section>
  <section aria-label="Saved quotation document" className="space-y-4">
   <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2.5"><FileText className="size-4 text-slate-500"/><h2 className="text-sm font-semibold">Document preview</h2><span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Revision {quotation.revision}</span></div>{quotation.status==='draft'&&<Button asChild variant="outline" size="sm"><Link href={`/quotations/${id}/edit`}><Pencil className="size-3.5"/>Edit draft</Link></Button>}</div>
   <QuotationPreviewSheet quotation={quotation} showActions={false}/>
  </section>
 </div>;
}
