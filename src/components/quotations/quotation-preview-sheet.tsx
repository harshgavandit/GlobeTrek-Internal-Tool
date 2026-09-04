"use client";

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Quotation } from '@/types';
import { generateQuotationPDF } from '@/lib/pdf-generator';
import { generateQuotationExcel } from '@/lib/excel-generator';
import { formatCurrency, formatDate } from '@/lib/utils';
import { numberToWords } from '@/lib/number-to-words';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface QuotationPreviewSheetProps {
  quotation: Quotation;
  showActions?: boolean;
}

export function QuotationPreviewSheet({ quotation, showActions = true }: QuotationPreviewSheetProps) {
  const settings = quotation.company_snapshot;
  const [isPdfGenerating, setIsPdfGenerating] = React.useState(false);
  const [isExcelGenerating, setIsExcelGenerating] = React.useState(false);

  const handleDownloadPDF = async () => {
    setIsPdfGenerating(true);
    try {
      await generateQuotationPDF(quotation, settings);
      toast.success(`PDF downloaded: ${quotation.quotation_number}.pdf`);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Excel file');
    } finally {
      setIsExcelGenerating(false);
    }
  };

  const words = numberToWords(quotation.total_amount, quotation.currency);

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="flex items-center justify-end gap-2.5">
          <Button
            onClick={handleDownloadExcel}
            disabled={isExcelGenerating}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isExcelGenerating ? 'Exporting…' : 'Export Excel'}</span>
          </Button>

          <Button
            onClick={handleDownloadPDF}
            disabled={isPdfGenerating}
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isPdfGenerating ? 'Generating…' : 'Download PDF'}</span>
          </Button>
        </div>
      )}

      {/* A4 Paper Container Sheet */}
      <div className="bg-white border border-border rounded-lg p-4 sm:p-8 shadow-xs max-w-5xl min-w-0 mx-auto space-y-6 break-words text-foreground font-sans">
        {/* Top Header */}
        <div className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:justify-between">
          <div className="min-w-0 flex-1">
            {settings.logo_path ? (
              <Image src={settings.logo_path} alt="GlobeTrek Engineering Corporation logo" width={817} height={306} className="h-auto w-full max-w-[330px] object-contain" priority />
            ) : (
              <h2 className="text-base font-semibold tracking-tight text-foreground">{settings.company_name}</h2>
            )}
            <div className="mt-3 max-w-2xl space-y-0.5 text-xs leading-5 text-muted-foreground">
              <p>{settings.address}</p>
              <p><span className="font-medium text-foreground">Mob.</span> {settings.phone}</p>
              <p><span className="font-medium text-foreground">Email:</span> {settings.email}</p>
              {settings.website ? <p><span className="font-medium text-foreground">Web:</span> {settings.website}</p> : null}
              <p><span className="font-medium text-foreground">GSTIN:</span> <span className="font-mono">{settings.gstin}</span></p>
            </div>
          </div>

          <div className="sm:text-right space-y-1 shrink-0">
            <span className="inline-block bg-muted text-foreground text-xs font-semibold px-2.5 py-1 rounded">
              PROFORMA QUOTATION
            </span>
            <div className="text-xs font-mono font-bold text-foreground pt-1">
              {quotation.quotation_number}
            </div>
            <div className="text-xs text-muted-foreground">
              Date: {formatDate(quotation.quotation_date)}
            </div>
            <div className="text-xs text-muted-foreground">
              Valid Till: {formatDate(quotation.valid_until)}
            </div>
          </div>
        </div>

        {/* Customer & Spec Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md border border-border text-xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
              QUOTATION ISSUED TO:
            </span>
            <div className="font-semibold text-sm text-foreground">{quotation.customer_name}</div>
            {quotation.customer_contact_person && (
              <div className="text-muted-foreground mt-0.5">Attn: {quotation.customer_contact_person}</div>
            )}
            {(quotation.customer_address||quotation.customer_city||quotation.customer_country) && (
              <div className="text-muted-foreground mt-0.5 leading-relaxed">
                {quotation.customer_address}
                {quotation.customer_city ? `, ${quotation.customer_city}` : ''}
                {quotation.customer_country ? `, ${quotation.customer_country}` : ''}
              </div>
            )}
            {quotation.customer_tax_number && (
              <div className="font-mono text-muted-foreground mt-1">
                Tax/PIN: {quotation.customer_tax_number}
              </div>
            )}
          </div>

          <div className="sm:border-l sm:border-border sm:pl-4 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">
              COMMERCIAL DETAILS:
            </span>
            <div className="flex justify-between gap-3 break-words">
              <span className="text-muted-foreground">Price List:</span>
              <span className="font-medium text-foreground">{quotation.price_list_name}</span>
            </div>
            <div className="flex justify-between gap-3 break-words">
              <span className="text-muted-foreground">Currency:</span>
              <span className="font-mono font-medium text-foreground">{quotation.currency}</span>
            </div>
            <div className="flex justify-between gap-3 break-words">
              <span className="text-muted-foreground">Prepared By:</span>
              <span className="font-medium text-foreground">{quotation.created_by_name}</span>
            </div>
            <div className="flex justify-between gap-3 break-words">
              <span className="text-muted-foreground">Payment Terms:</span>
              <span className="font-medium text-foreground text-right">{quotation.payment_terms}</span>
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs" aria-label="Quotation line items">
            <thead>
              <tr className="bg-muted/60 text-foreground border-b border-border">
                <th className="p-2.5 text-center w-10 font-medium">#</th>
                <th className="p-2.5 text-left font-medium">Equipment Description &amp; Specifications</th>
                <th className="p-2.5 text-center w-16 font-medium">Qty</th>
                <th className="p-2.5 text-right w-28 font-medium">Unit Price ({quotation.currency})</th>
                <th className="p-2.5 text-center w-16 font-medium">Disc %</th>
                <th className="p-2.5 text-right w-32 font-medium">Total ({quotation.currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotation.items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                  <td className="p-2.5 text-center text-muted-foreground font-mono align-top">{idx + 1}</td>
                  <td className="p-2.5 space-y-1 align-top">
                    <div className="font-semibold text-foreground text-sm">{item.product_name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">Code: {item.sku}</span>
                      {item.model_number && <span>| Model: {item.model_number}</span>}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-line pt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="p-2.5 text-center font-mono font-medium align-top">{item.quantity}</td>
                  <td className="p-2.5 text-right font-mono align-top tabular-nums">
                    {formatCurrency(item.unit_price, quotation.currency)}
                  </td>
                  <td className="p-2.5 text-center font-mono align-top">
                    {item.discount_percent > 0 ? `${item.discount_percent}%` : '—'}
                  </td>
                  <td className="p-2.5 text-right font-mono font-semibold text-foreground align-top tabular-nums">
                    {formatCurrency(item.line_total, quotation.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Commercial Summary & Totals */}
        <div className="flex justify-end pt-2">
          <div className="w-full max-w-sm space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {formatCurrency(quotation.subtotal, quotation.currency)}
              </span>
            </div>

            <div className="flex justify-between text-xs"><span>Discount</span><span>{formatCurrency(quotation.discount_amount,quotation.currency)}</span></div>
            {quotation.packaging_charges > 0 && (
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Packaging &amp; Forwarding</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(quotation.packaging_charges, quotation.currency)}
                </span>
              </div>
            )}

            {quotation.freight_charges > 0 && (
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Freight Charges</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(quotation.freight_charges, quotation.currency)}
                </span>
              </div>
            )}

            {quotation.insurance_charges > 0 && (
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Transit Insurance</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(quotation.insurance_charges, quotation.currency)}
                </span>
              </div>
            )}

            {quotation.other_charges > 0 && (
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Other Charges</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(quotation.other_charges, quotation.currency)}
                </span>
              </div>
            )}

            {quotation.tax_amount > 0 && (
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Tax / GST ({quotation.tax_percent}%)</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(quotation.tax_amount, quotation.currency)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-2 border-t border-border font-semibold text-sm text-foreground bg-muted/30 px-2.5 rounded">
              <span>Grand Total ({quotation.currency})</span>
              <span className="font-mono text-foreground tabular-nums">
                {formatCurrency(quotation.total_amount, quotation.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="bg-muted/30 p-3 rounded-md border border-border text-xs italic text-muted-foreground">
          <span className="font-semibold not-italic text-foreground">Amount in Words: </span>
          {words}
        </div>

        {/* Terms & Bank Details Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-border">
          <div className="space-y-1">
            <span className="font-semibold text-foreground uppercase block text-[11px]">TERMS &amp; CONDITIONS:</span>
            <ul className="space-y-0.5 text-muted-foreground list-disc list-inside">
              <li>Payment Terms: {quotation.payment_terms}</li>
              <li>Delivery Period: {quotation.delivery_terms}</li>
              <li>Warranty: {quotation.warranty_terms}</li>
              <li>Quotation Validity: {quotation.validity_terms}</li>
              <li>Dispatch Terms: {quotation.freight_terms}</li>
            </ul>
            {quotation.notes && (
              <p className="text-muted-foreground pt-1 italic">{quotation.notes}</p>
            )}
          </div>

          <div className="bg-muted/30 p-3.5 rounded-md border border-border space-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground uppercase block text-[11px]">BANK &amp; WIRE DETAILS:</span>
            <div>Bank: <span className="font-medium text-foreground">{settings.bank_name}</span></div>
            <div>A/C Name: <span className="font-medium text-foreground">{settings.bank_account_name}</span></div>
            <div>A/C No: <span className="font-mono font-medium text-foreground">{settings.bank_account_no}</span></div>
            <div>IFSC: <span className="font-mono font-medium text-foreground">{settings.bank_ifsc}</span></div>
            {settings.bank_swift && (
              <div>SWIFT: <span className="font-mono font-medium text-foreground">{settings.bank_swift}</span></div>
            )}
            {settings.bank_branch && <div>Branch: {settings.bank_branch}</div>}
          </div>
        </div>

        {/* Signature Stamp */}
        <div className="flex flex-wrap gap-5 justify-between items-end pt-6 text-xs text-muted-foreground">
          <div>This is a computer-generated quotation.</div>
          <div className="text-right space-y-6">
            <div className="font-semibold text-foreground">For {settings.company_name}</div>
            <div className="border-t border-border pt-1 text-[11px]">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
