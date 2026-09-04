"use client";
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, InlineError } from '@/components/workspace/primitives';
import { Customer } from '@/types';
import { db } from '@/lib/db';
import { toast } from 'sonner';
const blank = {name:'',contact_person:'',email:'',phone:'',city:'',country:'',address:'',tax_number:''};
export function QuickCustomerDialog({open,customer,onOpenChange,onCustomerCreated}:{open:boolean;customer?:Customer|null;onOpenChange:(open:boolean)=>void;onCustomerCreated:(customer:Customer)=>void}) {
  const [form,setForm]=React.useState(blank);
  const [saving,setSaving]=React.useState(false);
  const [error,setError]=React.useState('');
  React.useEffect(()=>{if(open){setForm(Object.fromEntries(Object.keys(blank).map(key=>[key,customer?.[key as keyof Customer]||''])) as typeof blank);setError('');}},[open,customer]);
  const field=(key:keyof typeof blank,label:string,type='text')=><FormField label={label}><Input type={type} value={form[key]} required={key==='name'} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/></FormField>;
  async function save(e:React.FormEvent){e.preventDefault();setSaving(true);setError('');try{const data=Object.fromEntries(Object.entries(form).map(([key,value])=>[key,value.trim()])) as typeof blank;const result=customer?await db.updateCustomer(customer.id,data):await db.createCustomer(data);toast.success(customer?'Customer updated':'Customer created');onCustomerCreated(result);onOpenChange(false);}catch(e){setError(e instanceof Error?e.message:'Could not save customer. Try again.');}finally{setSaving(false);}}
  return <Dialog open={open} onOpenChange={v=>!saving&&onOpenChange(v)}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{customer?'Edit Customer':'Add Customer'}</DialogTitle><DialogDescription>Company and contact details used on your quotations.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-5"><InlineError message={error}/><fieldset disabled={saving} className="space-y-5">
    {field('name','Company name *')}
    <div className="grid gap-4 sm:grid-cols-2">{field('contact_person','Contact person')}{field('email','Email address','email')}{field('phone','Phone','tel')}{field('tax_number','Tax number')}</div>
    <div className="border-t pt-4 space-y-4"><p className="form-section-title">Billing address</p><FormField label="Street address"><Textarea rows={2} value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></FormField><div className="grid gap-4 sm:grid-cols-2">{field('city','City')}{field('country','Country')}</div></div>
  </fieldset><DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={()=>onOpenChange(false)}>Cancel</Button><Button disabled={saving}>{saving?'Saving…':'Save Customer'}</Button></DialogFooter></form></DialogContent></Dialog>;
}
