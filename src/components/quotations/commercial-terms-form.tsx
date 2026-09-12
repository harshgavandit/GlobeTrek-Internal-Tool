"use client";
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/workspace/primitives';
import { QuotationFormState } from '@/types';
const fields=[['payment_terms','Payment terms'],['delivery_terms','Delivery period'],['warranty_terms','Warranty'],['validity_terms','Quotation validity'],['freight_terms','Dispatch / Port terms']] as const;
export function CommercialTermsForm({formState,onChange}:{formState:QuotationFormState;onChange:(updates:Partial<QuotationFormState>)=>void}){
 const clauses=formState.additional_clauses||[];
 const updateClause=(index:number,key:'title'|'text',value:string)=>onChange({additional_clauses:clauses.map((clause,clauseIndex)=>clauseIndex===index?{...clause,[key]:value}:clause)});
 const removeClause=(index:number)=>onChange({additional_clauses:clauses.filter((_,clauseIndex)=>clauseIndex!==index)});
 return <details className="surface group"><summary className="cursor-pointer px-4 py-4 text-sm font-semibold">Commercial terms & notes <span className="ml-2 text-xs text-muted-foreground font-normal">Review defaults</span></summary><div className="p-4 pt-0 grid gap-4 sm:grid-cols-2"><FormField label="Customer enquiry reference" className="sm:col-span-2"><Input value={formState.customer_reference||''} onChange={e=>onChange({customer_reference:e.target.value})} placeholder="Email enquiry, tender, or RFQ reference"/></FormField>{fields.map(([key,label])=><FormField key={key} label={label}><Input value={formState[key]} onChange={e=>onChange({[key]:e.target.value})}/></FormField>)}<FormField label="Additional notes" className="sm:col-span-2"><Textarea rows={3} value={formState.notes||''} onChange={e=>onChange({notes:e.target.value})}/></FormField>
  <section className="sm:col-span-2 space-y-3 border-t pt-4" aria-labelledby="additional-clauses-heading">
   <div className="flex items-center justify-between gap-3"><div><h3 id="additional-clauses-heading" className="text-sm font-semibold">Additional clauses</h3><p className="mt-0.5 text-xs text-muted-foreground">Each clause is saved with the quotation and added to its PDF and Excel terms.</p></div><Button type="button" variant="outline" size="sm" disabled={clauses.length>=30} onClick={()=>onChange({additional_clauses:[...clauses,{title:'',text:''}]})}><Plus className="mr-1.5 size-3.5"/>Add clause</Button></div>
   {clauses.map((clause,index)=><div key={index} className="rounded-lg border bg-muted/20 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Clause {index+1}</span><Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" aria-label={`Remove clause ${index+1}`} onClick={()=>removeClause(index)}><Trash2 className="size-3.5"/></Button></div><div className="grid gap-3"><FormField label="Clause heading"><Input value={clause.title} maxLength={200} onChange={event=>updateClause(index,'title',event.target.value)} placeholder="For example: Inspection"/></FormField><FormField label="Clause text"><Textarea rows={3} value={clause.text} maxLength={5000} onChange={event=>updateClause(index,'text',event.target.value)} placeholder="Enter the clause. Put each bullet on a new line."/></FormField></div></div>)}
  </section>
 </div></details>;
}
