"use client";

import React from 'react';
import { Check, FileText, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormField, SectionHeader } from '@/components/workspace/primitives';
import { CustomerSection } from './customer-step';
import { PriceListSection } from './price-list-step';
import { ProductSearchBar } from './product-search-bar';
import { QuotationItemsTable } from './quotation-items-table';
import { CommercialChargesForm } from './commercial-charges-form';
import { CommercialTermsForm } from './commercial-terms-form';
import {
  Customer,
  Product,
  price_lists as PriceList,
  QuotationFormState,
  QuotationItemForm,
  QuotationType,
} from '@/types';
import { formatCurrency } from '@/lib/utils';
import { numberToWords } from '@/lib/number-to-words';
import { isChargeVisible } from '@/lib/quotation-commercial';

interface QuotationWorkspaceProps {
  formState: QuotationFormState;
  customers: Customer[];
  priceLists: PriceList[];
  updateForm: (updates: Partial<QuotationFormState>) => void;
  onSelectCustomer: (customer: Customer) => void;
  onCustomerCreated: (customer: Customer) => void;
  onSelectPriceList: (priceList: PriceList) => Promise<void>;
  onChangePricing: (currency: string, rate: number) => Promise<void>;
  onChangeQuotationType: (quotationType: QuotationType) => Promise<void>;
  onAddProduct: (product: Product, price: number, quantity: number, sourcePrice: number) => void;
  onItemChange: (index: number, updates: Partial<QuotationItemForm>) => void;
  onItemRemove: (index: number) => void;
  disabled?: boolean;
}

export function QuotationWorkspace({
  formState,
  customers,
  priceLists,
  updateForm,
  onSelectCustomer,
  onCustomerCreated,
  onSelectPriceList,
  onChangePricing,
  onChangeQuotationType,
  onAddProduct,
  onItemChange,
  onItemRemove,
  disabled,
}: QuotationWorkspaceProps) {
  const selectedPriceList = priceLists.find(
    (priceList) => priceList.id === formState.price_list_id,
  );
  const workflowSteps=[
    {label:'Customer & format',hint:'Who and which template',href:'#quotation-setup',complete:Boolean(formState.customer_id&&formState.price_list_id)},
    {label:'Add products',hint:'Choose equipment and quantity',href:'#quotation-products',complete:formState.items.length>0},
    {label:'Review pricing',hint:'Check prices and charges',href:'#quotation-summary',complete:formState.items.length>0&&formState.total_amount>=0},
    {label:'Preview & save',hint:'Create the official record',href:'#quotation-actions',complete:false}
  ];
  const activeStep=Math.min(workflowSteps.findIndex(step=>!step.complete),workflowSteps.length-1);

  return (
    <fieldset disabled={disabled} className="min-w-0 pb-24 xl:pb-0">
      <nav aria-label="Quotation progress" className="quote-step-nav">
        <ol>
          {workflowSteps.map((step,index)=><li key={step.label}><a href={step.href} aria-current={index===activeStep?'step':undefined} title={step.hint}><span className="quote-step-index">{step.complete?<Check className="size-3 text-emerald-700"/>:index+1}</span><span>{step.label}</span></a></li>)}
        </ol>
      </nav>
      <div className="quote-grid">
        <div className="min-w-0 space-y-5">
          <div className="quote-canvas">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50/60 px-5 py-3">
              <div className="flex items-center gap-2 text-xs font-medium"><FileText className="size-4 text-primary" aria-hidden/>Quotation details</div>
              <span className="text-[11px] text-muted-foreground">{formState.quotation_type==='export'?'Export quotation':'Indian quotation'} · {formState.currency}</span>
            </div>
            <section id="quotation-setup" className="quote-canvas-section scroll-mt-28">
              <p className="quote-section-label"><span>01</span>Customer & commercial setup</p>
              <div className="quote-setup-grid">
                <CustomerSection customers={customers} selectedCustomerId={formState.customer_id} onSelectCustomer={onSelectCustomer} onCustomerCreated={onCustomerCreated}/>
                <PriceListSection priceLists={priceLists} selectedPriceListId={formState.price_list_id} quotationType={formState.quotation_type} quotationCurrency={formState.currency} exchangeRate={formState.exchange_rate} onSelectPriceList={onSelectPriceList} onChangePricing={onChangePricing} onChangeQuotationType={onChangeQuotationType} hasItems={formState.items.length>0}/>
              </div>
              <div className="mt-5 grid items-end gap-4 border-t pt-4 sm:grid-cols-2">
                <FormField label="Quotation date"><Input type="date" value={formState.quotation_date} onChange={event=>updateForm({quotation_date:event.target.value})}/></FormField>
                <FormField label="Valid until"><Input type="date" value={formState.valid_until} min={formState.quotation_date} onChange={event=>updateForm({valid_until:event.target.value})}/></FormField>
              </div>
            </section>
            <section id="quotation-products" className="quote-canvas-section scroll-mt-28">
              <p className="quote-section-label"><span>02</span>Build your quotation</p>
              <SectionHeader title="Search & add products" description="Choose equipment, set the quantity, and add it to your quotation."/>
              <div className="mt-4"><ProductSearchBar selectedPriceListId={formState.price_list_id} quotationCurrency={formState.currency} exchangeRate={formState.exchange_rate} onAddProduct={onAddProduct} selectedQuantities={Object.fromEntries(formState.items.map(item=>[item.product_id,item.quantity]))}/></div>
            </section>
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <SectionHeader title="Line items" description="Master prices are your reference. Adjust quoted prices for this quotation."/>
                <span className="rounded-md border bg-slate-50 px-2 py-1 text-xs tabular-nums text-muted-foreground">{formState.items.length} {formState.items.length===1?'item':'items'}</span>
              </div>
              <QuotationItemsTable items={formState.items} currency={formState.currency} onItemChange={onItemChange} onItemRemove={onItemRemove}/>
            </section>
          </div>
          <CommercialTermsForm formState={formState} onChange={updateForm}/>
        </div>
        <aside id="quotation-summary" className="quote-summary surface scroll-mt-28 overflow-hidden">
          <div className="border-b px-5 py-4"><p className="quote-section-label mb-2"><span>03</span>Review pricing</p><SectionHeader title="Quotation summary"/><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{selectedPriceList?.name||'No price list selected'}</p><span className="mt-3 inline-flex rounded border bg-slate-50 px-2 py-0.5 text-[11px] font-semibold">{formState.currency}</span></div>
          <div className="p-5">
            <div className="mb-5 flex justify-between gap-3 border-b pb-4 text-[13px]"><span className="text-muted-foreground">Subtotal</span><strong className="font-semibold tabular-nums" data-testid="quotation-subtotal">{formatCurrency(formState.subtotal,formState.currency)}</strong></div>
            <CommercialChargesForm formState={formState} onChange={updateForm}/>
            {isChargeVisible(formState,'tax_percent')&&<div className="mt-4 flex justify-between gap-3 text-xs text-muted-foreground"><span>Tax amount ({formState.tax_percent}%)</span><span className="tabular-nums">{formatCurrency(formState.tax_amount,formState.currency)}</span></div>}
          </div>
          <div className="quote-summary-total">
            <p className="text-xs font-medium text-muted-foreground">Grand total</p>
            <strong className="mt-1 block break-all text-[28px] font-semibold tracking-tight tabular-nums text-slate-900" data-testid="quotation-grand-total">{formatCurrency(formState.total_amount,formState.currency)}</strong>
            {formState.total_amount>0&&<p className="mt-2 text-[11px] leading-5 text-muted-foreground">{numberToWords(formState.total_amount,formState.currency)}</p>}
          </div>
          <div className="border-t p-5"><a href="#quotation-actions" className="flex min-h-9 items-center justify-between gap-2 rounded text-xs font-semibold text-primary">Preview & save quotation<ArrowUpRight className="size-4" aria-hidden/></a><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Review the document before saving. PDF, Excel and Word exports are available from the saved quotation.</p></div>
        </aside>
      </div>
      <div className="quote-mobile-total"><span className="min-w-0 text-xs text-muted-foreground">Grand total<strong className="ml-2 text-base text-foreground tabular-nums">{formatCurrency(formState.total_amount,formState.currency)}</strong></span><a href="#quotation-summary" className="flex min-h-9 shrink-0 items-center text-xs font-medium text-primary">Review summary ↑</a></div>
    </fieldset>
  );
}
