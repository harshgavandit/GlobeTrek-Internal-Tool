"use client";
import React from 'react';
import { Input } from '@/components/ui/input';
import { QuotationFormState } from '@/types';
const fields=[['discount_amount','Discount','discount amount'],['packaging_charges','Packing','packaging charges'],['freight_charges','Freight','freight charges'],['insurance_charges','Insurance','insurance charges'],['other_charges','Other charges','other charges'],['tax_percent','GST / Tax (%)','tax percent']] as const;
export function CommercialChargesForm({formState,onChange}:{formState:QuotationFormState;onChange:(updates:Partial<QuotationFormState>)=>void}){
 const id=React.useId();return <div className="space-y-2.5">{fields.map(([key,label,aria])=><div key={key} className="flex items-center justify-between gap-3"><label htmlFor={`${id}-${key}`} className="text-xs text-muted-foreground">{label}</label><Input id={`${id}-${key}`} aria-label={aria} type="number" min="0" max={key==='tax_percent'?100:undefined} step="0.01" value={formState[key]||0} onChange={e=>onChange({[key]:Number(e.target.value)})} className="h-9 w-28 text-right text-xs tabular-nums"/></div>)}</div>;
}
