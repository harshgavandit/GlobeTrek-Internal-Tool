"use client";

import React from 'react';
import Image from 'next/image';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { generateQuotationExcel } from '@/lib/excel-generator';
import { generateQuotationPDF } from '@/lib/pdf-generator';
import { productDescriptionDetail } from '@/lib/product-description';
import {
  quotationBankAccounts,
  quotationTermSections,
  type QuotationTermSection,
} from '@/lib/quotation-terms';
import type { Quotation } from '@/types';

interface QuotationPreviewSheetProps {
  quotation: Quotation;
  showActions?: boolean;
}

const NAVY = '#112a46';

function amount(value: number, currency: string) {
  return value.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function quantity(value: number) {
  return Number.isInteger(value)
    ? String(value).padStart(2, '0')
    : value.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

function longDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date).toUpperCase();
}

function Terms({ sections }: { sections: QuotationTermSection[] }) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section key={section.number} className="break-inside-avoid">
          <h3 className="text-[12px] font-bold leading-5">
            {section.number}. {section.title}:
          </h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-8 text-[11px] leading-[1.55]">
            {section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function QuotationPreviewSheet({ quotation, showActions = true }: QuotationPreviewSheetProps) {
  const settings = quotation.company_snapshot;
  const terms = quotationTermSections(quotation);
  const paymentIndex = terms.findIndex((section) => section.number === 10);
  const termsBeforeBank = paymentIndex >= 0 ? terms.slice(0, paymentIndex + 1) : terms;
  const termsAfterBank = paymentIndex >= 0 ? terms.slice(paymentIndex + 1) : [];
  const bankAccounts = quotationBankAccounts(quotation);
  const bankAccountRows = Array.from(
    { length: Math.ceil(bankAccounts.length / 2) },
    (_, index) => bankAccounts.slice(index * 2, index * 2 + 2),
  );
  const [isPdfGenerating, setIsPdfGenerating] = React.useState(false);
  const [isExcelGenerating, setIsExcelGenerating] = React.useState(false);

  const handleDownloadPDF = async () => {
    setIsPdfGenerating(true);
    try {
      await generateQuotationPDF(quotation, settings);
      toast.success(`PDF downloaded: ${quotation.quotation_number}.pdf`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF document');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsExcelGenerating(true);
    try {
      await generateQuotationExcel(quotation, settings);
      toast.success(`Excel file downloaded: ${quotation.quotation_number}.xlsx`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate Excel file');
    } finally {
      setIsExcelGenerating(false);
    }
  };

  const customerAddress = [
    quotation.customer_address,
    quotation.customer_city,
    quotation.customer_country,
  ].filter(Boolean).join(', ');

  const totals = [
    ['Sub Total', quotation.subtotal],
    ['Packing Charge', quotation.packaging_charges],
    ['Freight Charge', quotation.freight_charges],
    ['Insurance', quotation.insurance_charges],
    ['Other Charges', quotation.other_charges],
    ['Discount', quotation.discount_amount],
    [`GST @${quotation.tax_percent}%`, quotation.tax_amount],
    ['Grand Total', quotation.total_amount],
  ] as const;

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="flex items-center justify-end gap-2.5">
          <Button onClick={handleDownloadExcel} disabled={isExcelGenerating} variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isExcelGenerating ? 'Exporting…' : 'Export Excel'}</span>
          </Button>
          <Button onClick={handleDownloadPDF} disabled={isPdfGenerating} size="sm" className="h-8 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>{isPdfGenerating ? 'Generating…' : 'Download PDF'}</span>
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-sm border border-slate-300 bg-slate-100/60 p-2 sm:p-5">
        <article className="mx-auto min-w-[760px] max-w-[900px] bg-white text-[#141414] shadow-sm [font-family:Arial,sans-serif]">
          <div className="px-12 pb-8 pt-5">
            <header className="flex items-center justify-between gap-10 border-b-2 pb-3" style={{ borderColor: NAVY }}>
              <div className="w-[275px] shrink-0">
                <Image src="/brand/globetrek-new-logo.png" alt="GlobeTrek Engineering Corporation logo" width={817} height={306} className="h-auto w-full object-contain" priority />
              </div>
              <h2 className="font-serif text-[28px] font-bold tracking-wide">SALES QUOTATION</h2>
            </header>

            <div className="mt-3 flex justify-between gap-6 text-[12px] font-bold">
              <p>REFERENCE NO- {quotation.quotation_number}</p>
              <p>DATE: {longDate(quotation.quotation_date)}</p>
            </div>

            <section className="mt-7 text-[12px] leading-[1.55]">
              <p className="font-bold">To,</p>
              <div className="ml-1 mt-1">
                <p className="font-bold uppercase">{quotation.customer_name}</p>
                {customerAddress && <p>{customerAddress}</p>}
                {quotation.customer_phone && <p>Contact No : {quotation.customer_phone}</p>}
                {quotation.customer_email && <p>Email : {quotation.customer_email}</p>}
              </div>
              <p className="mt-6 font-bold">Ref: {quotation.customer_reference?.trim() || quotation.quotation_number}</p>
              <p className="mt-6">Dear Sir,</p>
              <p className="mt-5">With reference to above, we are pleased to submit our quotation as follows.</p>
            </section>

            <table className="mt-3 w-full table-fixed border-collapse text-[11px]" aria-label="Quotation line items">
              <colgroup>
                <col className="w-[7%]" />
                <col className="w-[59.5%]" />
                <col className="w-[6%]" />
                <col className="w-[13.75%]" />
                <col className="w-[13.75%]" />
              </colgroup>
              <thead>
                <tr className="text-white" style={{ backgroundColor: NAVY }}>
                  <th className="border border-black px-1 py-3 text-center leading-tight">Sr.<br />No.</th>
                  <th className="border border-black px-2 py-3 text-center font-bold">PRODUCT DESCRIPTION</th>
                  <th className="border border-black px-1 py-3 text-center">QTY</th>
                  <th className="border border-black px-1 py-3 text-center leading-tight">UNIT COST<br />EX-WORKS<br />MUMBAI IN<br />{quotation.currency}</th>
                  <th className="border border-black px-1 py-3 text-center leading-tight">TOTAL<br />AMOUNT {quotation.currency}</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, index) => {
                  const detail = productDescriptionDetail(item.product_name, item.description);
                  return (
                    <tr key={item.id || index} className="break-inside-avoid">
                      <td className="border border-black px-1.5 py-2 text-center align-top font-bold">{String(index + 1).padStart(2, '0')}</td>
                      <td className="border border-black px-2 py-2 align-top leading-[1.45]">
                        <p className="font-bold">{item.product_name}</p>
                        {item.model_number && <p className="mt-1">Model: {item.model_number}</p>}
                        {detail && <p className="mt-1 whitespace-pre-line">{detail}</p>}
                      </td>
                      <td className="border border-black px-1 py-2 text-center align-top font-bold">{quantity(item.quantity)}</td>
                      <td className="border border-black px-1.5 py-2 text-right align-top font-bold tabular-nums">{amount(item.unit_price, quotation.currency)}</td>
                      <td className="border border-black px-1.5 py-2 text-right align-top font-bold tabular-nums">{amount(item.line_total, quotation.currency)}</td>
                    </tr>
                  );
                })}
                {totals.map(([label, value]) => (
                  <tr key={label} className="break-inside-avoid font-bold">
                    <td colSpan={4} className="border border-black px-2 py-1.5 text-right">{label}</td>
                    <td className="border border-black px-1.5 py-1.5 text-center tabular-nums">{amount(value, quotation.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="mt-4 py-1.5 text-center text-[12px] font-bold text-white" style={{ backgroundColor: NAVY }}>
              TERMS &amp; CONDITIONS
            </h2>
            <div className="mt-3">
              <Terms sections={termsBeforeBank} />

              {bankAccounts.length > 0 && (
                <section className="mt-4 break-inside-avoid">
                  <h3 className="mb-2 text-[12px] font-bold">Bank Details:</h3>
                  <div className="space-y-0 text-[11px] font-bold leading-[1.4]">
                    {bankAccountRows.map((row, rowIndex) => (
                      <div key={rowIndex} className={`grid border-l border-t border-black ${row.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {row.map((account, index) => (
                          <div key={`${account.bank_name}-${account.account_no}-${index}`} className="border-b border-r border-black">
                            <p className="border-b border-black px-2 py-2">For Credit to - {account.account_name || settings.company_name}</p>
                            <p className="border-b border-black px-2 py-2">Bank Name: {account.bank_name}</p>
                            <p className="border-b border-black px-2 py-2">Account No: {account.account_no}</p>
                            <p className="border-b border-black px-2 py-2">IFSC Code: {account.ifsc}</p>
                            {account.branch && <p className="border-b border-black px-2 py-2 last:border-b-0">Branch: {account.branch}</p>}
                            {account.swift && <p className="px-2 py-2">SWIFT: {account.swift}</p>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {termsAfterBank.length > 0 && <div className="mt-4"><Terms sections={termsAfterBank} /></div>}
            </div>

            <section className="mt-7 text-[11px] leading-[1.55]">
              <p>If you require any further clarification or additional information, please feel free to contact us at your convenience.</p>
              <p className="mt-2">Thanking you, and always assuring you of our best services and attention, we remain.</p>
              <div className="mt-4 font-bold">
                <p>Yours faithfully,</p>
                <div className="h-10" aria-hidden="true" />
                <p>{quotation.created_by_name}</p>
                <p>(Authorized Representative)</p>
                <p>Contact: {settings.phone}</p>
                <p>{settings.company_name}</p>
              </div>
            </section>
          </div>

          <footer className="mx-12 mb-4 px-3 py-2 text-center text-[9px] font-bold leading-[1.4] text-white" style={{ backgroundColor: NAVY }}>
            <p>Address: {settings.address}</p>
            <p>Mobile - {settings.phone}</p>
            <p>Email - {settings.email}{settings.website ? `   Web - ${settings.website}` : ''}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
