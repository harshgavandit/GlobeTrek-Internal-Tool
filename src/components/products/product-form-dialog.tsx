"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, InlineError, LoadingState } from '@/components/workspace/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Product, price_lists as PriceListType, Category } from '@/types';
import { db } from '@/lib/db';
import { toast } from 'sonner';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSaved: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [priceLists, setPriceLists] = React.useState<PriceListType[]>([]);

  const [sku, setSku] = React.useState('');
  const [name, setName] = React.useState('');
  const [modelNumber, setModelNumber] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [specifications, setSpecifications] = React.useState('');
  const [hsnCode, setHsnCode] = React.useState('');

  const [prices, setPrices] = React.useState<Record<string, number>>({});
  const [saving, setSaving] = React.useState(false);
  const [error,setError]=React.useState('');
  const [tab,setTab]=React.useState('basic');
  const [loading,setLoading]=React.useState(false);

  React.useEffect(() => {
    async function loadMasters() {
      const [cats, pls] = await Promise.all([
        db.fetchCategories(),
        db.fetchPriceLists(),
      ]);
      setCategories(cats);
      setPriceLists(pls.filter(p=>p.is_active));
    }
    if (open) {
      setError('');setTab('basic');setLoading(true);loadMasters().catch(e=>setError(e.message)).finally(()=>setLoading(false));
    }
  }, [open]);

  React.useEffect(() => {
    if (product) {
      setSku(product.sku);
      setName(product.name);
      setModelNumber(product.model_number || '');
      setCategoryId(product.category_id || '');
      setDescription(product.description || '');
      setSpecifications(product.specifications || '');
      setHsnCode(product.hsn_code || '');

      const priceMap: Record<string, number> = {};
      product.prices?.forEach((p) => {
        priceMap[p.price_list_id] = p.unit_price;
      });
      setPrices(priceMap);
    } else {
      setSku('');
      setName('');
      setModelNumber('');
      setCategoryId('');
      setDescription('');
      setSpecifications('');
      setHsnCode('');
      setPrices({});
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      toast.error('SKU and Product Name are required');
      return;
    }

    setSaving(true);setError('');
    try {
      const activePrices=Object.fromEntries(Object.entries(prices).filter(([id])=>priceLists.some(p=>p.id===id)));
      if (product) {
        await db.updateProduct(product.id, {
          updated_at:product.updated_at,
          sku: sku.trim(),
          name: name.trim(),
          model_number: modelNumber.trim() || undefined,
          category_id: categoryId || undefined,
          description: description.trim() || undefined,
          specifications: specifications.trim() || undefined,
          hsn_code: hsnCode.trim() || undefined,
        }, activePrices);
        toast.success(`Product "${name}" updated`);
      } else {
        await db.createProduct({
          sku: sku.trim(),
          name: name.trim(),
          model_number: modelNumber.trim() || undefined,
          category_id: categoryId || undefined,
          description: description.trim() || undefined,
          specifications: specifications.trim() || undefined,
          hsn_code: hsnCode.trim() || undefined,
        }, activePrices);
        toast.success(`Product "${name}" created`);
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={v=>!saving&&onOpenChange(v)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{product?'Edit Product':'Add Product'}</DialogTitle><DialogDescription>Manage product details and master prices. Saved quotations stay unchanged.</DialogDescription></DialogHeader>
    <form onInvalid={()=>setTab('basic')} onSubmit={handleSubmit} className="space-y-5"><InlineError message={error}/>{loading?<LoadingState rows={3} label="Loading product fields…"/>:<fieldset disabled={saving}><Tabs value={tab} onValueChange={setTab}><TabsList className="mb-5 w-full"><TabsTrigger value="basic" className="flex-1">Basic information</TabsTrigger><TabsTrigger value="details" className="flex-1">Descriptions</TabsTrigger><TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger></TabsList>
      <TabsContent value="basic" forceMount className="data-[state=inactive]:hidden space-y-5"><div className="grid gap-4 sm:grid-cols-2"><FormField label="SKU / Item code *"><Input value={sku} onChange={e=>setSku(e.target.value)} required/></FormField><FormField label="Model number"><Input value={modelNumber} onChange={e=>setModelNumber(e.target.value)}/></FormField></div><FormField label="Product name *"><Input value={name} onChange={e=>setName(e.target.value)} required/></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField label="Category"><select className="select-control" value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">Uncategorized</option>{categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></FormField><FormField label="HSN / Harmonized code"><Input value={hsnCode} onChange={e=>setHsnCode(e.target.value)}/></FormField></div><p className="rounded-md bg-slate-50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">Tax is applied at quotation level. {product?`This product is ${product.is_active?'active':'archived'}.`: 'New products are active by default.'}</p></TabsContent>
      <TabsContent value="details" forceMount className="data-[state=inactive]:hidden space-y-5"><FormField label="Description" hint="Included in quotation line details."><Textarea rows={5} value={description} onChange={e=>setDescription(e.target.value)}/></FormField><FormField label="Technical specifications"><Textarea rows={5} value={specifications} onChange={e=>setSpecifications(e.target.value)}/></FormField></TabsContent>
      <TabsContent value="pricing" forceMount className="data-[state=inactive]:hidden space-y-5"><p className="rounded-md border border-blue-100 bg-blue-50/50 px-3 py-2.5 text-xs leading-5 text-blue-900">Changes are recorded in price history. Leave a price blank to keep it unchanged; enter 0 only for a free item.</p>{priceLists.length===0&&<p className="rounded-lg border border-dashed p-5 text-muted-foreground">Create an active price list before adding master prices.</p>}<div className="grid gap-4 sm:grid-cols-2">{priceLists.map(pl=><FormField key={pl.id} label={`${pl.name} · ${pl.currency}`}><Input type="number" min="0" step="0.01" aria-label={`Master price ${pl.name}`} value={prices[pl.id]??''} placeholder="Not priced" className="text-right tabular-nums" onChange={e=>{const value=e.target.value;setPrices(prev=>{const next={...prev};if(value==='')delete next[pl.id];else next[pl.id]=Number(value);return next;});}}/></FormField>)}</div></TabsContent>
    </Tabs></fieldset>}<DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={()=>onOpenChange(false)}>Cancel</Button><Button disabled={saving||loading}>{saving?'Saving…':product?'Save Changes':'Create Product'}</Button></DialogFooter></form></DialogContent></Dialog>;
}
