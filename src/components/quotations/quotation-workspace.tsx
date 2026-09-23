"use client";

import React from 'react';
import { CalendarRange, Check } from 'lucide-react';
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
      <nav aria-label="Quotation progress" className="surface mb-5 overflow-hidden p-2">
        <ol className="grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step,index)=><li key={step.label}><a href={step.href} aria-current={index===activeStep?'step':undefined} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition ${index===activeStep?'bg-blue-50 text-primary ring-1 ring-blue-100':'hover:bg-slate-50'}`}><span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.complete?'bg-emerald-100 text-emerald-700':index===activeStep?'bg-primary text-white':'bg-slate-100 text-slate-500'}`}>{step.complete?<Check className="size-4"/>:index+1}</span><span className="min-w-0"><span className="block text-xs font-semibold">{step.label}</span><span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">{step.hint}</span></span></a></li>)}
        </ol>
      </nav>
      <div id="quotation-setup" className="mb-5 grid scroll-mt-5 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.1fr_.9fr]">
        <CustomerSection
          customers={customers}
          selectedCustomerId={formState.customer_id}
          onSelectCustomer={onSelectCustomer}
          onCustomerCreated={onCustomerCreated}
        />
        <PriceListSection
          priceLists={priceLists}
          selectedPriceListId={formState.price_list_id}
          quotationType={formState.quotation_type}
          quotationCurrency={formState.currency}
          exchangeRate={formState.exchange_rate}
          onSelectPriceList={onSelectPriceList}
          onChangePricing={onChangePricing}
          onChangeQuotationType={onChangeQuotationType}
          hasItems={formState.items.length > 0}
        />
        <section className="surface min-w-0 space-y-3 p-4 md:col-span-2 xl:col-span-1">
          <SectionHeader title="Quotation dates" icon={CalendarRange} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <FormField label="Quotation date">
              <Input
                type="date"
                value={formState.quotation_date}
                onChange={(event) => updateForm({ quotation_date: event.target.value })}
              />
            </FormField>
            <FormField label="Valid until">
              <Input
                type="date"
                value={formState.valid_until}
                min={formState.quotation_date}
                onChange={(event) => updateForm({ valid_until: event.target.value })}
              />
            </FormField>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Your quotation reference is created when you save.
          </p>
        </section>
      </div>

      <div className="quote-grid">
        <div className="min-w-0 space-y-4">
          <section id="quotation-products" className="surface scroll-mt-5 p-4">
            <SectionHeader
              title="Search & add products"
              description="Find a catalog item, then review its current master price before adding it."
            />
            <div className="mt-4">
              <ProductSearchBar
                selectedPriceListId={formState.price_list_id}
                quotationCurrency={formState.currency}
                exchangeRate={formState.exchange_rate}
                onAddProduct={onAddProduct}
                selectedQuantities={Object.fromEntries(formState.items.map((item) => [item.product_id, item.quantity]))}
              />
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="p-4">
              <SectionHeader
                title="Selected products"
                description="Master prices stay visible while quoted prices remain editable."
                actions={
                  <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {formState.items.length} {formState.items.length === 1 ? 'item' : 'items'} ·{' '}
                    {formState.currency}
                  </span>
                }
              />
            </div>
            <QuotationItemsTable
              items={formState.items}
              currency={formState.currency}
              onItemChange={onItemChange}
              onItemRemove={onItemRemove}
            />
          </section>

          <CommercialTermsForm formState={formState} onChange={updateForm} />
        </div>

        <aside
          id="quotation-summary"
          className="quote-summary surface scroll-mt-5 overflow-hidden ring-1 ring-blue-50"
        >
          <div className="p-4">
            <SectionHeader title="Quotation summary" />
            <p className="mb-4 mt-2 text-xs text-muted-foreground">
              {selectedPriceList?.name || 'No price list selected'} · {formState.currency}
            </p>
            <div className="flex justify-between gap-2 border-t pb-4 pt-4">
              <span>Subtotal</span>
              <strong
                className="font-medium tabular-nums"
                data-testid="quotation-subtotal"
              >
                {formatCurrency(formState.subtotal, formState.currency)}
              </strong>
            </div>
            <CommercialChargesForm formState={formState} onChange={updateForm} />
            {isChargeVisible(formState, 'tax_percent') && (
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>Tax amount ({formState.tax_percent}%)</span>
                <span className="tabular-nums">
                  {formatCurrency(formState.tax_amount, formState.currency)}
                </span>
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Total payable
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-200">Grand total</span>
              <strong
                className="min-w-0 break-all text-right text-xl tracking-tight tabular-nums"
                data-testid="quotation-grand-total"
              >
                {formatCurrency(formState.total_amount, formState.currency)}
              </strong>
            </div>
            {formState.total_amount > 0 && (
              <p className="mt-3 text-[11px] leading-relaxed text-slate-300">
                {numberToWords(formState.total_amount, formState.currency)}
              </p>
            )}
          </div>
        </aside>
      </div>

      <div className="quote-mobile-total">
        <span className="min-w-0 text-xs text-muted-foreground">
          Grand total
          <strong className="ml-2 text-base text-foreground tabular-nums">
            {formatCurrency(formState.total_amount, formState.currency)}
          </strong>
        </span>
        <a
          href="#quotation-summary"
          className="shrink-0 text-xs font-medium text-primary"
        >
          Review summary ↑
        </a>
      </div>
    </fieldset>
  );
}
