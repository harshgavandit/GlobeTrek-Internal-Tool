"use client";

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CompanySettings, Customer, Product, price_lists as PriceListType, QuotationFormState, QuotationItemForm, QuotationType } from '@/types';
import { db } from '@/lib/db';
import { recalculateQuotation } from '@/lib/quotation-calculator';
import { toast } from 'sonner';
import { QuotationWorkspace } from '@/components/quotations/quotation-workspace';
import { PageHeader,InlineError,LoadingState,EmptyState } from '@/components/workspace/primitives';
import { Save } from 'lucide-react';
import { normalizeVisibleCharges, QUOTATION_CHARGE_FIELDS } from '@/lib/quotation-commercial';
import { convertListPrice, DEFAULT_INR_PER_USD, repriceQuotationAmount, sourcePriceFromSnapshot } from '@/lib/quotation-currency';
import { EXPORT_QUOTATION_DEFAULTS } from '@/lib/quotation-terms';

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
  const [quotationSettings,setQuotationSettings]=React.useState<CompanySettings|null>(null);

  const [formState, setFormState] = React.useState<QuotationFormState>({
    customer_id: '',
    quotation_type: 'indian',
    price_list_id: '',
    currency: 'USD',
    exchange_rate: 1,
    quotation_date: '',
    valid_until: '',
    items: [],
    subtotal: 0,
    discount_amount: 0,
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
    visible_charges: [...QUOTATION_CHARGE_FIELDS],
    additional_clauses: [],
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
        setQuotationSettings(qtn.company_snapshot);
        setFormState({
          revision:qtn.revision,
          discount_amount:qtn.discount_amount,
          customer_id: qtn.customer_id,
          quotation_type: qtn.quotation_type || 'indian',
          price_list_id: qtn.price_list_id,
          currency: qtn.currency,
          exchange_rate: qtn.exchange_rate || 1,
          quotation_date: qtn.quotation_date,
          valid_until: qtn.valid_until,
          items: qtn.items.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            description: i.description || '',
            sku: i.sku,
            model_number: i.model_number,
            master_price: i.master_price,
            source_master_price: i.source_master_price,
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
          visible_charges: normalizeVisibleCharges(qtn.visible_charges),
          additional_clauses: qtn.additional_clauses || [],
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
    const targetCurrency=pl.currency==='INR'&&formState.currency==='USD'?'USD':pl.currency;
    const rate=targetCurrency===pl.currency?1:(formState.exchange_rate>1?formState.exchange_rate:DEFAULT_INR_PER_USD);
    const newItems = formState.items.map((item) => {
      const prod = db.getProductById(item.product_id);
      const prec = prod?.prices?.find((p) => p.price_list_id === pl.id);
      const sourceMaster=prec!.unit_price;
      const newMaster=convertListPrice(sourceMaster,pl.currency,targetCurrency,rate);
      return {
        ...item,
        source_master_price: sourceMaster,
        master_price: newMaster,
        unit_price: newMaster,
      };
    });

    updateForm({
      price_list_id: pl.id,
      currency: targetCurrency,
      exchange_rate: rate,
      items: newItems,
    });
  };

  const handleChangePricing = async (currency:string,rate:number) => {
    const priceList=priceLists.find(list=>list.id===formState.price_list_id);
    if(!priceList)throw new Error('Choose a price list before selecting a quotation currency.');
    const items=formState.items.map(item=>{
      const sourceMaster=item.source_master_price??sourcePriceFromSnapshot(item.master_price,priceList.currency,formState.currency,formState.exchange_rate);
      return {...item,source_master_price:sourceMaster,master_price:convertListPrice(sourceMaster,priceList.currency,currency,rate),unit_price:repriceQuotationAmount(item.unit_price,priceList.currency,formState.currency,formState.exchange_rate,currency,rate)};
    });
    const money=(value:number)=>repriceQuotationAmount(value,priceList.currency,formState.currency,formState.exchange_rate,currency,rate);
    updateForm({currency,exchange_rate:currency===priceList.currency?1:rate,items,packaging_charges:money(formState.packaging_charges),freight_charges:money(formState.freight_charges),insurance_charges:money(formState.insurance_charges),other_charges:money(formState.other_charges),discount_amount:money(formState.discount_amount||0)});
  };

  const handleChangeQuotationType = async (quotationType:QuotationType) => {
    const priceList=priceLists.find(list=>list.id===formState.price_list_id);
    if(quotationType==='export'&&priceList&&formState.currency!=='USD')await handleChangePricing('USD',formState.exchange_rate>1?formState.exchange_rate:DEFAULT_INR_PER_USD);
    if(quotationType==='indian'&&priceList?.currency==='INR'&&formState.currency!=='INR')await handleChangePricing('INR',1);
    updateForm(quotationType==='export'?{quotation_type:'export',...EXPORT_QUOTATION_DEFAULTS,visible_charges:['packaging_charges','freight_charges'],tax_percent:0}:{quotation_type:'indian',visible_charges:[...QUOTATION_CHARGE_FIELDS],payment_terms:quotationSettings?.payment_terms_default||formState.payment_terms,delivery_terms:quotationSettings?.delivery_terms_default||formState.delivery_terms,warranty_terms:quotationSettings?.warranty_terms_default||formState.warranty_terms,validity_terms:quotationSettings?.validity_days_default?`${quotationSettings.validity_days_default} Days`:formState.validity_terms,freight_terms:quotationSettings?.freight_terms_default||formState.freight_terms,notes:quotationSettings?.default_notes||formState.notes});
  };

  const handleAddProduct = (product: Product, masterPrice: number, quantity: number, sourceMasterPrice: number) => {
    const existingIndex = formState.items.findIndex((item) => item.product_id === product.id);
    if (existingIndex >= 0) {
      const items = [...formState.items];
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: Math.min(1_000_000, items[existingIndex].quantity + quantity),
      };
      updateForm({ items });
      return;
    }
    const newItem: QuotationItemForm = {
      product_id: product.id,
      product_name: product.name,
      description: product.description || '',
      sku: product.sku,
      model_number: product.model_number,
      master_price: masterPrice,
      source_master_price: sourceMasterPrice,
      unit_price: masterPrice,
      quantity,
      discount_percent: 0,
      line_total: masterPrice * quantity,
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
  return <div className="quote-builder-page space-y-5"><div id="quotation-actions"><PageHeader eyebrow="Edit quotation draft" title={quotationNumber} description="Review each step before saving. Previous revisions remain unchanged in the quotation history." actions={<><Button variant="outline" asChild><Link href={`/quotations/${id}`}>Cancel</Link></Button><Button disabled={saving} onClick={handleSave}><Save className="mr-2 h-4 w-4"/>{saving?'Saving…':'Save changes'}</Button></>}/></div><InlineError message={error}/>
    <QuotationWorkspace formState={formState} customers={customers} priceLists={priceLists} updateForm={updateForm} onSelectCustomer={handleSelectCustomer} onCustomerCreated={c=>{setCustomers(prev=>[c,...prev]);updateForm({customer_id:c.id});}} onSelectPriceList={handleSelectPriceList} onChangePricing={handleChangePricing} onChangeQuotationType={handleChangeQuotationType} onAddProduct={handleAddProduct} onItemChange={handleItemChange} onItemRemove={handleItemRemove} disabled={saving}/>
  </div>;
}
