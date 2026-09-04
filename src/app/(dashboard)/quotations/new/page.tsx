"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Customer, Product, price_lists as PriceListType, QuotationFormState, QuotationItemForm } from '@/types';
import { db } from '@/lib/db';
import { recalculateQuotation } from '@/lib/quotation-calculator';
import { QuotationPreviewSheet } from '@/components/quotations/quotation-preview-sheet';
import { Quotation } from '@/types';
import { toast } from 'sonner';
import { QuotationWorkspace } from '@/components/quotations/quotation-workspace';
import { PageHeader,InlineError,LoadingState,EmptyState } from '@/components/workspace/primitives';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { Save,Eye } from 'lucide-react';
import { businessDate } from '@/lib/business-date';

export default function NewQuotationPage() {
  const router = useRouter();
  const [preview,setPreview]=React.useState<Quotation|null>(null);
  const requestId=React.useRef<string>('');
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [priceLists, setPriceLists] = React.useState<PriceListType[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error,setError]=React.useState('');
  const [loading, setLoading] = React.useState(true);

  const [formState, setFormState] = React.useState<QuotationFormState>({
    customer_id: '',
    price_list_id: '',
    currency: 'USD',
    quotation_date: businessDate(),
    valid_until: businessDate(30),
    items: [],
    subtotal: 0,
    packaging_charges: 0,
    freight_charges: 0,
    insurance_charges: 0,
    other_charges: 0,
    tax_percent: 0,
    tax_amount: 0,
    total_amount: 0,
    payment_terms: '',
    delivery_terms: '',
    warranty_terms: '',
    validity_terms: '30 Days',
    freight_terms: '',
    customer_reference: '',
    notes: '',
  });

  React.useEffect(() => {
    async function init() {
      const [custs, pls, settings] = await Promise.all([
        db.fetchCustomers(),
        db.fetchPriceLists(),
        db.fetchCompanySettings(),
      ]);
      setCustomers(custs);
      setPriceLists(pls.filter(p=>p.is_active));
      const defaultPl = pls.find(p=>p.is_active);
      setFormState((prev) => ({
        ...prev,
        customer_id: '',
        price_list_id: defaultPl?.id || '',
        currency: defaultPl?.currency || 'USD',
        payment_terms: settings?.payment_terms_default || prev.payment_terms,
        delivery_terms: settings?.delivery_terms_default || prev.delivery_terms,
        warranty_terms: settings?.warranty_terms_default || prev.warranty_terms,
        validity_terms: settings?.validity_days_default ? `${settings.validity_days_default} Days` : prev.validity_terms,
        freight_terms: settings?.freight_terms_default || '',
        valid_until:businessDate(settings.validity_days_default),
        notes:settings.default_notes||'',
      }));
      setLoading(false);
    }
    init().catch(e=>{setError(e.message);setLoading(false);});
  }, []);

  const updateForm = (updates: Partial<QuotationFormState>) => {
    setPreview(null);
    requestId.current='';
    setFormState((prev) => {
      const merged = { ...prev, ...updates };
      return recalculateQuotation(merged);
    });
  };

  const handleSelectCustomer = (customer: Customer) => {
    updateForm({ customer_id: customer.id });
  };

  const handleSelectPriceList = async (pl: PriceListType) => {
    await db.fetchProducts();
    if(formState.items.some(item=>!db.getProductById(item.product_id)?.prices?.some(p=>p.price_list_id===pl.id))){toast.error('Some products have no price in this list. Remove those items or assign prices first.');return;}
    const newItems = formState.items.map((item) => {
      const prod = db.getProductById(item.product_id);
      const prec = prod?.prices?.find((p) => p.price_list_id === pl.id);
      const newMaster = prec!.unit_price;
      return { ...item, master_price: newMaster, unit_price: newMaster };
    });
    updateForm({ price_list_id: pl.id, currency: pl.currency, items: newItems });
  };

  const handleAddProduct = (product: Product, masterPrice: number) => {
    const newItem: QuotationItemForm = {
      product_id: product.id,
      product_name: product.name,
      description: product.description || '',
      sku: product.sku,
      model_number: product.model_number,
      master_price: masterPrice,
      unit_price: masterPrice,
      quantity: 1,
      discount_percent: 0,
      line_total: masterPrice,
    };
    updateForm({ items: [...formState.items, newItem] });

  };

  const handleItemChange = (index: number, updates: Partial<QuotationItemForm>) => {
    const copy = [...formState.items];
    copy[index] = { ...copy[index], ...updates };
    updateForm({ items: copy });
  };

  const handleItemRemove = (index: number) => {
    const copy = [...formState.items];
    copy.splice(index, 1);
    updateForm({ items: copy });
  };

  const handleSaveQuotation = async (status: 'draft' | 'sent' = 'draft'): Promise<string | null> => {
    if (!formState.customer_id) {
      toast.error('Please select a customer');
      return null;
    }
    if (formState.items.length === 0) {
      toast.error('Please add at least one product');
      return null;
    }
    setSaving(true);setError('');
    try {
      if(!requestId.current)requestId.current=crypto.randomUUID();
      const newQuote = await db.createQuotation(formState,requestId.current);
      if (status !== 'draft') {
        await db.updateQuotation(newQuote.id, { status: 'sent' });
      }
      toast.success(`Quotation "${newQuote.quotation_number}" saved`);
      return newQuote.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quotation');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPreview = async () => {
    const quoteId = await handleSaveQuotation('draft');
    if (quoteId) {
      router.push(`/quotations/${quoteId}`);
    }
  };

  if(loading)return <LoadingState label="Loading quotation workspace…"/>;
  return <div className="space-y-5"><PageHeader eyebrow="Quotations" title="New Quotation" description="Choose your customer, add products, and review the total." actions={<><Button variant="outline" disabled={saving} onClick={async()=>{setError('');try{setPreview(await db.previewQuotation(formState));}catch(e){setError(e instanceof Error?e.message:'Could not preview quotation.');}}}><Eye className="mr-2 h-4 w-4"/>Preview</Button><Button disabled={saving} onClick={handleSaveAndPreview}><Save className="mr-2 h-4 w-4"/>{saving?'Saving…':'Save Quotation'}</Button></>}/><InlineError message={error}/>
    <QuotationWorkspace formState={formState} customers={customers} priceLists={priceLists} updateForm={updateForm} onSelectCustomer={handleSelectCustomer} onCustomerCreated={c=>{setCustomers(prev=>[c,...prev]);updateForm({customer_id:c.id});}} onSelectPriceList={handleSelectPriceList} onAddProduct={handleAddProduct} onItemChange={handleItemChange} onItemRemove={handleItemRemove} disabled={saving}/>
    <Dialog open={!!preview} onOpenChange={v=>!v&&setPreview(null)}><DialogContent className="sm:max-w-5xl"><DialogHeader><DialogTitle>Quotation Preview</DialogTitle><DialogDescription>Unsaved preview. Review the customer, prices, and terms before saving.</DialogDescription></DialogHeader>{preview&&<QuotationPreviewSheet quotation={preview} showActions={false}/>}</DialogContent></Dialog>
  </div>;
}
