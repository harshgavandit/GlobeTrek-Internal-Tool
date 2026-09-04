"use client";
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
 return <div className="space-y-5"><PageHeader eyebrow="Saved quotation" title={<span className="flex flex-wrap items-center gap-3">{quotation.quotation_number}<StatusBadge status={quotation.status}/></span>} description={`${quotation.customer_name} · ${formatDate(quotation.quotation_date)} · Revision ${quotation.revision}`} actions={<QuotationActions quotation={quotation} onChanged={load} onError={setError} detail/>}/><InlineError message={error} onDismiss={()=>setError('')}/><div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground"><span>Prepared by <strong className="text-foreground font-medium">{quotation.created_by_name}</strong></span><span>Price list <strong className="text-foreground font-medium">{quotation.price_list_name} · {quotation.currency}</strong></span><span>Valid until <strong className="text-foreground font-medium">{formatDate(quotation.valid_until)}</strong></span>{quotation.status==='draft'&&<Button asChild variant="outline" size="sm"><Link href={`/quotations/${id}/edit`}>Edit Draft</Link></Button>}</div><QuotationPreviewSheet quotation={quotation} showActions={false}/></div>;
}
