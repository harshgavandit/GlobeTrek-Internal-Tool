"use client";

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QuotationChargeField, QuotationFormState } from '@/types';
import { normalizeVisibleCharges, QUOTATION_CHARGE_FIELDS, QUOTATION_CHARGE_LABELS } from '@/lib/quotation-commercial';

const ariaLabels: Record<QuotationChargeField, string> = {
  discount_amount: 'discount amount',
  packaging_charges: 'packaging charges',
  freight_charges: 'freight charges',
  insurance_charges: 'insurance charges',
  other_charges: 'other charges',
  tax_percent: 'tax percent',
};

export function CommercialChargesForm({formState,onChange}:{formState:QuotationFormState;onChange:(updates:Partial<QuotationFormState>)=>void}){
 const id=React.useId();
 const visible=normalizeVisibleCharges(formState.visible_charges);
 const hidden=QUOTATION_CHARGE_FIELDS.filter(field=>!visible.includes(field));
 const remove=(field:QuotationChargeField)=>onChange({visible_charges:visible.filter(candidate=>candidate!==field),[field]:0} as Partial<QuotationFormState>);
 const restore=(field:QuotationChargeField)=>onChange({visible_charges:[...visible,field]});
 return <div className="space-y-2.5">
  {visible.map(field=><div key={field} className="flex items-center justify-between gap-2">
   <label htmlFor={`${id}-${field}`} className="min-w-0 flex-1 text-xs text-muted-foreground">{QUOTATION_CHARGE_LABELS[field]}{field==='tax_percent'?' (%)':''}</label>
   <Input id={`${id}-${field}`} aria-label={ariaLabels[field]} type="number" min="0" max={field==='tax_percent'?100:undefined} step="0.01" value={formState[field]||0} onChange={event=>onChange({[field]:Number(event.target.value)})} className="h-9 w-24 text-right text-xs tabular-nums"/>
   <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Remove ${QUOTATION_CHARGE_LABELS[field]}`} title={`Remove ${QUOTATION_CHARGE_LABELS[field]}`} onClick={()=>remove(field)}><Trash2 className="size-3.5"/></Button>
  </div>)}
  {hidden.length>0&&<div className="border-t pt-3"><p className="mb-2 text-[11px] font-medium text-muted-foreground">Add a charge row</p><div className="flex flex-wrap gap-1.5">{hidden.map(field=><Button key={field} type="button" variant="outline" size="sm" className="h-9 px-2.5 text-xs" onClick={()=>restore(field)}><Plus className="mr-1 size-3"/>{QUOTATION_CHARGE_LABELS[field]}</Button>)}</div></div>}
 </div>;
}
