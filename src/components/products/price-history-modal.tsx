"use client";
import React from 'react';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { InlineError } from '@/components/workspace/primitives';
import { DataTable,DataColumn } from '@/components/workspace/data-table';
import { Product,product_price_history as History } from '@/types';
import { db } from '@/lib/db';
import { formatCurrency,formatDate } from '@/lib/utils';
export function PriceHistoryModal({open,onOpenChange,product}:{open:boolean;onOpenChange:(open:boolean)=>void;product:Product}){
 const [history,setHistory]=React.useState<History[]>([]);const [loading,setLoading]=React.useState(true);const [error,setError]=React.useState('');
 const refresh=React.useCallback(async()=>{setLoading(true);setError('');try{setHistory(await db.getProductPriceHistory(product.id));}catch(e){setError(e instanceof Error?e.message:'Could not load price history.');}finally{setLoading(false);}},[product.id]);
 React.useEffect(()=>{if(open)void refresh();},[open,refresh]);
 const columns:DataColumn<History>[]=[{key:'date',label:'Date',sortValue:h=>h.changed_at,cell:h=><span className="whitespace-nowrap">{formatDate(h.changed_at)}</span>},{key:'list',label:'Price list',cell:h=>h.price_list?.name||'—'},{key:'change',label:'Price change',cell:h=><span className="whitespace-nowrap tabular-nums"><span className="text-muted-foreground">{h.old_price===null?'Not priced':formatCurrency(h.old_price,h.price_list?.currency)}</span> → <strong className="font-medium">{formatCurrency(h.new_price,h.price_list?.currency)}</strong></span>},{key:'by',label:'Changed by',cell:h=>h.changed_by?.full_name||'System'},{key:'reason',label:'Reason',cell:h=><span className="text-muted-foreground">{h.change_reason||'—'}</span>}];
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Price History</DialogTitle><DialogDescription className="line-clamp-2">{product.sku} · {product.name}</DialogDescription></DialogHeader><InlineError message={error} onRetry={refresh}/><DataTable label="price revisions" data={history} columns={columns} rowKey={h=>h.id} loading={loading} initialPageSize={10} emptyTitle="No price changes yet" emptyDescription="Price updates and their audit notes will appear here."/></DialogContent></Dialog>;
}
