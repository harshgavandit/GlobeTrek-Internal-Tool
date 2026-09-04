"use client";

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Customer, Product, price_lists as PriceListType, QuotationFormState, QuotationItemForm } from '@/types';
import { db } from '@/lib/db';
import { recalculateQuotation } from '@/lib/quotation-calculator';
import { toast } from 'sonner';
import { QuotationWorkspace } from '@/components/quotations/quotation-workspace';
import { PageHeader,InlineError,LoadingState,EmptyState } from '@/components/workspace/primitives';
import { Save } from 'lucide-react';

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [priceLists, setPriceLists] = React.useState<PriceListType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error,setError]=React.useState('');
  const [quotationNumber, setQuotationNumber] = React.useState('');

  const [formState, setFormState] = React.useState<QuotationFormState>({
    customer_id: '',
    price_list_id: '',
    currency: 'USD',
    quotation_date: '',
    valid_until: '',
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
    validity_terms: '',
    freight_terms: '',
    customer_reference: '',
    notes: '',
  });

  React.useEffect(() => {
    async function loadData() {
      const [custs, pls, quotes] = await Promise.all([
        db.fetchCustomers(),
        db.fetchPriceLists(),
        db.fetchQuotations(),
      ]);

      setCustomers(custs);

      const qtn = quotes.find((q) => q.id === id);
      if (qtn) {
        setPriceLists(pls.filter(p=>p.is_active||p.id===qtn.price_list_id));
        setQuotationNumber(qtn.quotation_number);
        setFormState({
          revision:qtn.revision,
          discount_amount:qtn.discount_amount,
          customer_id: qtn.customer_id,
          price_list_id: qtn.price_list_id,
          currency: qtn.currency,
          quotation_date: qtn.quotation_date,
          valid_until: qtn.valid_until,
          items: qtn.items.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            description: i.description || '',
            sku: i.sku,
            model_number: i.model_number,
            master_price: i.master_price,
            unit_price: i.unit_price,
            quantity: i.quantity,
            discount_percent: i.discount_percent,
            line_total: i.line_total,
          })),
          subtotal: qtn.subtotal,
          packaging_charges: qtn.packaging_charges,
          freight_charges: qtn.freight_charges,
          insurance_charges: qtn.insurance_charges,
          other_charges: qtn.other_charges,
          tax_percent: qtn.tax_percent,
          tax_amount: qtn.tax_amount,
          total_amount: qtn.total_amount,
          payment_terms: qtn.payment_terms || '',
          delivery_terms: qtn.delivery_terms || '',
          warranty_terms: qtn.warranty_terms || '',
          validity_terms: qtn.validity_terms || '',
          freight_terms: qtn.freight_terms || '',
          customer_reference: qtn.customer_reference || '',
          notes: qtn.notes || '',
        });
      } else {
        toast.error('Quotation not found');
      }
      setLoading(false);
    }
    loadData().catch(e=>{setError(e.message);setLoading(false);});
  }, [id]);

  const updateForm = (updates: Partial<QuotationFormState>) => {
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
      return {
        ...item,
        master_price: newMaster,
        unit_price: newMaster,
      };
    });

    updateForm({
      price_list_id: pl.id,
      currency: pl.currency,
      items: newItems,
    });
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

    updateForm({
      items: [...formState.items, newItem],
    });

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

  const handleSave = async () => {
    setSaving(true);setError('');
    try {
      await db.updateQuotation(id, formState as any);
      toast.success(`Quotation ${quotationNumber} updated`);
      router.push(`/quotations/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quotation');
    } finally {
      setSaving(false);
    }
  };

  if(loading)return <LoadingState label="Loading saved quotation…"/>;
  if(!quotationNumber)return <><InlineError message={error}/><EmptyState title="Quotation unavailable" description="Return to quotation history and select an existing quotation." action={<Button asChild variant="outline"><Link href="/quotations">View Quotations</Link></Button>}/></>;
  return <div className="space-y-5"><PageHeader eyebrow="Edit quotation" title={quotationNumber} description="Update this draft. Previous saved revisions remain in the audit trail." actions={<><Button variant="outline" asChild><Link href={`/quotations/${id}`}>Cancel</Link></Button><Button disabled={saving} onClick={handleSave}><Save className="mr-2 h-4 w-4"/>{saving?'Saving…':'Save Changes'}</Button></>}/><InlineError message={error}/>
    <QuotationWorkspace formState={formState} customers={customers} priceLists={priceLists} updateForm={updateForm} onSelectCustomer={handleSelectCustomer} onCustomerCreated={c=>{setCustomers(prev=>[c,...prev]);updateForm({customer_id:c.id});}} onSelectPriceList={handleSelectPriceList} onAddProduct={handleAddProduct} onItemChange={handleItemChange} onItemRemove={handleItemRemove} disabled={saving}/>
  </div>;
}
