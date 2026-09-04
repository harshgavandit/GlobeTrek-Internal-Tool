"use client";

import React from 'react';
import { CalendarRange } from 'lucide-react';
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
} from '@/types';
import { formatCurrency } from '@/lib/utils';
import { numberToWords } from '@/lib/number-to-words';

interface QuotationWorkspaceProps {
  formState: QuotationFormState;
  customers: Customer[];
  priceLists: PriceList[];
  updateForm: (updates: Partial<QuotationFormState>) => void;
  onSelectCustomer: (customer: Customer) => void;
  onCustomerCreated: (customer: Customer) => void;
  onSelectPriceList: (priceList: PriceList) => Promise<void>;
  onAddProduct: (product: Product, price: number) => void;
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
  onAddProduct,
  onItemChange,
  onItemRemove,
  disabled,
}: QuotationWorkspaceProps) {
  const selectedPriceList = priceLists.find(
    (priceList) => priceList.id === formState.price_list_id,
  );

  return (
    <fieldset disabled={disabled} className="min-w-0 pb-16 xl:pb-0">
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_.9fr]">
        <CustomerSection
          customers={customers}
          selectedCustomerId={formState.customer_id}
          onSelectCustomer={onSelectCustomer}
          onCustomerCreated={onCustomerCreated}
        />
        <PriceListSection
          priceLists={priceLists}
          selectedPriceListId={formState.price_list_id}
          onSelectPriceList={onSelectPriceList}
          hasItems={formState.items.length > 0}
        />
        <section className="surface min-w-0 space-y-3 p-4 md:col-span-2 xl:col-span-1">
          <SectionHeader title="Quotation dates" icon={CalendarRange} />
          <div className="grid grid-cols-2 gap-3">
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
            The quotation number is assigned safely when you save.
          </p>
        </section>
      </div>

      <div className="quote-grid">
        <div className="min-w-0 space-y-4">
          <section className="surface p-4">
            <SectionHeader
              title="Search & add products"
              description="Find a catalog item, then review its current master price before adding it."
            />
            <div className="mt-4">
              <ProductSearchBar
                selectedPriceListId={formState.price_list_id}
                onAddProduct={onAddProduct}
                excludedProductIds={formState.items.map((item) => item.product_id)}
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
          className="quote-summary surface scroll-mt-4 overflow-hidden"
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
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>Tax amount ({formState.tax_percent}%)</span>
              <span className="tabular-nums">
                {formatCurrency(formState.tax_amount, formState.currency)}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
              Total payable
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-sm text-white/75">Grand total</span>
              <strong
                className="text-xl tracking-tight tabular-nums"
                data-testid="quotation-grand-total"
              >
                {formatCurrency(formState.total_amount, formState.currency)}
              </strong>
            </div>
            {formState.total_amount > 0 && (
              <p className="mt-3 text-[11px] leading-relaxed text-white/55">
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
