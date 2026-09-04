"use client";
import React from 'react';
import { Trash2,PackageOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState,FormField } from '@/components/workspace/primitives';
import { QuotationItemForm } from '@/types';
import { VarianceBadge } from '@/components/quotations/variance-badge';
import { formatCurrency } from '@/lib/utils';
export function QuotationItemsTable({items,currency,onItemChange,onItemRemove}:{items:QuotationItemForm[];currency:string;onItemChange:(index:number,updates:Partial<QuotationItemForm>)=>void;onItemRemove:(index:number)=>void}){
 const [expanded,setExpanded]=React.useState<string|null>(null);
 if(!items.length)return <EmptyState title="Your quotation is empty" description="Search above and add products. Current master prices will fill in automatically." icon={PackageOpen}/>;
 return <div className="quote-items"><div className="quote-item-head" aria-hidden="true"><span>Product</span><span>Qty</span><span className="text-right">Master</span><span>Quoted price</span><span>Variance</span><span>Disc %</span><span className="text-right">Amount</span><span/></div>{items.map((item,index)=><div key={item.product_id} className="border-t first:border-t-0"><div className="quote-item-row"><div className="quote-item-name min-w-0"><p className="font-medium text-[13px] line-clamp-2" title={item.product_name}>{item.product_name}</p><div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground"><span>{item.sku}</span><button type="button" aria-expanded={expanded===item.product_id} className="text-primary hover:underline" onClick={()=>setExpanded(expanded===item.product_id?null:item.product_id)}>{expanded===item.product_id?'Hide description':'Edit description'}</button></div></div>
 <div><span className="quote-item-label">Quantity</span><Input type="number" min="0.001" step="0.001" aria-label={`quantity ${item.sku}`} value={item.quantity} onChange={e=>onItemChange(index,{quantity:Number(e.target.value)})} className="h-9 px-2 text-right tabular-nums"/></div>
 <div className="text-right"><span className="quote-item-label">Master price</span><span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(item.master_price,currency)}</span></div>
 <div><span className="quote-item-label">Quoted price</span><Input type="number" min="0" step="0.01" aria-label={`unit price ${item.sku}`} value={item.unit_price} onChange={e=>onItemChange(index,{unit_price:Number(e.target.value)})} className="h-9 px-2 text-right font-medium tabular-nums"/></div>
 <div><span className="quote-item-label">Variance</span><VarianceBadge masterPrice={item.master_price} quotedPrice={item.unit_price} currency={currency}/></div>
 <div><span className="quote-item-label">Discount %</span><Input type="number" min="0" max="100" step="0.1" aria-label={`discount percent ${item.sku}`} value={item.discount_percent} onChange={e=>onItemChange(index,{discount_percent:Number(e.target.value)})} className="h-9 px-2 text-right tabular-nums"/></div>
 <div className="text-right"><span className="quote-item-label">Amount</span><span className="font-semibold text-xs tabular-nums">{formatCurrency(item.line_total,currency)}</span></div><Button type="button" variant="ghost" size="icon" className="quote-item-remove h-9 w-9 text-muted-foreground hover:text-destructive" aria-label={`Remove ${item.sku}`} onClick={()=>onItemRemove(index)}><Trash2 className="h-4 w-4"/></Button></div>{expanded===item.product_id&&<div className="p-4 bg-muted/30 border-t"><FormField label={`Description for ${item.sku}`} hint="Changes apply only to this quotation."><Textarea value={item.description||''} onChange={e=>onItemChange(index,{description:e.target.value})} rows={3}/></FormField></div>}</div>)}</div>;
}
