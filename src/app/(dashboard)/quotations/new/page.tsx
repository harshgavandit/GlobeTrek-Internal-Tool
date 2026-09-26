"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CompanySettings, Customer, Product, price_lists as PriceListType, QuotationFormState, QuotationItemForm, QuotationType } from '@/types';
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
import { QUOTATION_CHARGE_FIELDS } from '@/lib/quotation-commercial';
import { convertListPrice, DEFAULT_INR_PER_USD, repriceQuotationAmount } from '@/lib/quotation-currency';
import { EXPORT_QUOTATION_DEFAULTS } from '@/lib/quotation-terms';

export default function NewQuotationPage() {
  const router = useRouter();
  const [preview,setPreview]=React.useState<Quotation|null>(null);
  const requestId=React.useRef<string>('');
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [priceLists, setPriceLists] = React.useState<PriceListType[]>([]);
  const [companySettings,setCompanySettings]=React.useState<CompanySettings|null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error,setError]=React.useState('');
  const [loading, setLoading] = React.useState(true);

  const [formState, setFormState] = React.useState<QuotationFormState>({
    customer_id: '',
    quotation_type: 'indian',
    price_list_id: '',
    currency: 'USD',
    exchange_rate: 1,
    quotation_date: businessDate(),
    valid_until: businessDate(30),
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
    validity_terms: '30 Days',
    freight_terms: '',
    visible_charges: [...QUOTATION_CHARGE_FIELDS],
    additional_clauses: [],
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
      setCompanySettings(settings);
      setPriceLists(pls.filter(p=>p.is_active));
      const defaultPl = pls.find(p=>p.is_active);
      setFormState((prev) => ({
        ...prev,
        customer_id: '',
        price_list_id: defaultPl?.id || '',
        currency: defaultPl?.currency || 'USD',
        exchange_rate: 1,
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
    const targetCurrency=pl.currency==='INR'&&formState.currency==='USD'?'USD':pl.currency;
    const rate=targetCurrency===pl.currency?1:(formState.exchange_rate>1?formState.exchange_rate:DEFAULT_INR_PER_USD);
    const newItems = formState.items.map((item) => {
      const prod = db.getProductById(item.product_id);
      const prec = prod?.prices?.find((p) => p.price_list_id === pl.id);
      const sourceMaster=prec!.unit_price;
      const newMaster=convertListPrice(sourceMaster,pl.currency,targetCurrency,rate);
      return { ...item,source_master_price:sourceMaster,master_price:newMaster,unit_price:newMaster };
    });
    updateForm({ price_list_id:pl.id,currency:targetCurrency,exchange_rate:rate,items:newItems });
  };

  const handleChangePricing = async (currency:string,rate:number) => {
    const priceList=priceLists.find(list=>list.id===formState.price_list_id);
    if(!priceList)throw new Error('Choose a price list before selecting a quotation currency.');
    await db.fetchProducts();
    const items=formState.items.map(item=>{
      const product=db.getProductById(item.product_id);
      const sourceMaster=product?.prices?.find(price=>price.price_list_id===priceList.id)?.unit_price;
      if(sourceMaster===undefined)throw new Error(`${item.sku} has no current price in this list.`);
      return {...item,source_master_price:sourceMaster,master_price:convertListPrice(sourceMaster,priceList.currency,currency,rate),unit_price:repriceQuotationAmount(item.unit_price,priceList.currency,formState.currency,formState.exchange_rate,currency,rate)};
    });
    const money=(value:number)=>repriceQuotationAmount(value,priceList.currency,formState.currency,formState.exchange_rate,currency,rate);
    updateForm({currency,exchange_rate:currency===priceList.currency?1:rate,items,packaging_charges:money(formState.packaging_charges),freight_charges:money(formState.freight_charges),insurance_charges:money(formState.insurance_charges),other_charges:money(formState.other_charges),discount_amount:money(formState.discount_amount||0)});
  };

  const handleChangeQuotationType = async (quotationType:QuotationType) => {
    const priceList=priceLists.find(list=>list.id===formState.price_list_id);
    if(quotationType==='export'&&priceList&&formState.currency!=='USD')await handleChangePricing('USD',formState.exchange_rate>1?formState.exchange_rate:DEFAULT_INR_PER_USD);
    if(quotationType==='indian'&&priceList?.currency==='INR'&&formState.currency!=='INR')await handleChangePricing('INR',1);
    updateForm(quotationType==='export'?{quotation_type:'export',...EXPORT_QUOTATION_DEFAULTS,visible_charges:['packaging_charges','freight_charges'],tax_percent:0}:{quotation_type:'indian',visible_charges:[...QUOTATION_CHARGE_FIELDS],payment_terms:companySettings?.payment_terms_default||formState.payment_terms,delivery_terms:companySettings?.delivery_terms_default||formState.delivery_terms,warranty_terms:companySettings?.warranty_terms_default||formState.warranty_terms,validity_terms:companySettings?.validity_days_default?`${companySettings.validity_days_default} Days`:formState.validity_terms,freight_terms:companySettings?.freight_terms_default||formState.freight_terms,notes:companySettings?.default_notes||formState.notes});
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
  return <div className="quote-builder-page space-y-5"><div id="quotation-actions"><PageHeader eyebrow="Quotation workspace" title="New quotation" description="Prepare a clear, accurate offer for your customer." actions={<><Button variant="outline" disabled={saving} onClick={async()=>{setError('');try{setPreview(await db.previewQuotation(formState));}catch(e){setError(e instanceof Error?e.message:'Could not preview quotation.');}}}><Eye className="mr-2 h-4 w-4"/>Preview</Button><Button disabled={saving} onClick={handleSaveAndPreview}><Save className="mr-2 h-4 w-4"/>{saving?'Saving…':'Save quotation'}</Button></>}/></div><InlineError message={error}/>
    <QuotationWorkspace formState={formState} customers={customers} priceLists={priceLists} updateForm={updateForm} onSelectCustomer={handleSelectCustomer} onCustomerCreated={c=>{setCustomers(prev=>[c,...prev]);updateForm({customer_id:c.id});}} onSelectPriceList={handleSelectPriceList} onChangePricing={handleChangePricing} onChangeQuotationType={handleChangeQuotationType} onAddProduct={handleAddProduct} onItemChange={handleItemChange} onItemRemove={handleItemRemove} disabled={saving}/>
    <Dialog open={!!preview} onOpenChange={v=>!v&&setPreview(null)}><DialogContent className="sm:max-w-5xl"><DialogHeader><DialogTitle>Quotation Preview</DialogTitle><DialogDescription>Unsaved preview. Review the customer, prices, and terms before saving.</DialogDescription></DialogHeader>{preview&&<QuotationPreviewSheet quotation={preview} showActions={false}/>}</DialogContent></Dialog>
  </div>;
}
