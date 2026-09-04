"use client";
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/workspace/primitives';
import { QuotationFormState } from '@/types';
const fields=[['payment_terms','Payment terms'],['delivery_terms','Delivery period'],['warranty_terms','Warranty'],['validity_terms','Quotation validity'],['freight_terms','Dispatch / Port terms']] as const;
export function CommercialTermsForm({formState,onChange}:{formState:QuotationFormState;onChange:(updates:Partial<QuotationFormState>)=>void}){
 return <details className="surface group"><summary className="cursor-pointer px-4 py-4 text-sm font-semibold">Commercial terms & notes <span className="ml-2 text-xs text-muted-foreground font-normal">Review defaults</span></summary><div className="p-4 pt-0 grid gap-4 sm:grid-cols-2"><FormField label="Customer enquiry reference" className="sm:col-span-2"><Input value={formState.customer_reference||''} onChange={e=>onChange({customer_reference:e.target.value})} placeholder="Email enquiry, tender, or RFQ reference"/></FormField>{fields.map(([key,label])=><FormField key={key} label={label}><Input value={formState[key]} onChange={e=>onChange({[key]:e.target.value})}/></FormField>)}<FormField label="Additional notes" className="sm:col-span-2"><Textarea rows={3} value={formState.notes||''} onChange={e=>onChange({notes:e.target.value})}/></FormField></div></details>;
}
