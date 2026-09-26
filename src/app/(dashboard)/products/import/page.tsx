"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PageHeader,InlineError,ConfirmationDialog,LoadingState } from '@/components/workspace/primitives';
import { ExcelDiffTable } from '@/components/products/excel-diff-table';
import { parseExcelPriceList, applyImportDiffs, generateSampleExcelBuffer, ImportDiffsSummary } from '@/lib/excel-importer';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductImportPage() {
  const [error,setError]=React.useState('');
  const [confirmOpen,setConfirmOpen]=React.useState(false);
  const [complete,setComplete]=React.useState('');
  const [isParsing, setIsParsing] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);
  const [diffSummary, setDiffSummary] = React.useState<ImportDiffsSummary | null>(null);
  const [fileName, setFileName] = React.useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if(!file.name.toLowerCase().endsWith('.xlsx')){setError('Choose an .xlsx workbook.');return;}
    setError('');setComplete('');setFileName(file.name);
    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const summary = await parseExcelPriceList(buffer);
      setDiffSummary(summary);

    } catch (err: any) {
      setError(err.message || 'Failed to parse Excel file');
      setDiffSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyImport = async () => {
    if (!diffSummary) return;

    setIsApplying(true);setError('');
    try {
      const result = await applyImportDiffs(diffSummary);
      toast.success(
        `Successfully imported: ${result.newCount} new products, ${result.updatedCount} prices/details updated.`
      );
      setComplete(`${result.newCount} new products and ${result.updatedCount} updates saved. Price changes are recorded in history.`);
      setDiffSummary(null);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');throw err;
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = () => {
    setDiffSummary(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError('');
  };

  const handleDownloadTemplate = async () => {
    try {
      const buffer = await generateSampleExcelBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Globetrek_Pricing_Import_Template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded sample Excel template');
    } catch (err) {
      toast.error('Failed to generate template');
    }
  };

  const step=isParsing?1:diffSummary?2:complete?3:0;
  return <div className="space-y-5"><PageHeader eyebrow="Product catalog" title="Import products & prices" description="Validate your spreadsheet and review every change before saving." actions={<Button variant="outline" onClick={handleDownloadTemplate}><Download className="mr-2 h-4 w-4"/>Download Template</Button>}/>
    <ol className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs sm:grid-cols-4 sm:gap-4" aria-label="Import progress">{['Upload Excel','Validate','Preview changes','Complete'].map((label,index)=><li key={label} aria-current={index===step?'step':undefined} className={`flex items-center gap-3 ${index===step?'font-semibold text-slate-900':'text-muted-foreground'}`}><span className={`grid size-7 shrink-0 place-items-center rounded-full border text-[11px] ${index===step?'border-blue-200 bg-blue-50 text-primary':index<step?'border-emerald-100 bg-emerald-50 text-emerald-700':'border-slate-200 bg-slate-50 text-slate-500'}`}>{index<step?'✓':index+1}</span>{label}</li>)}</ol>
    <InlineError message={error}/>{complete&&<div className="surface p-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700"/>Import complete</h2><p className="mt-2 text-sm text-muted-foreground">{complete}</p></div><Button variant="outline" asChild><Link href="/products">View Products</Link></Button></div>}
    {!diffSummary&&<section className="surface grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="p-5 sm:p-8"><div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-5 py-10 text-center sm:py-14"><span className="mx-auto grid size-12 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm"><FileSpreadsheet className="size-6 text-primary"/></span><h2 className="mt-5 text-base font-semibold">Upload your pricing workbook</h2><p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-muted-foreground">Choose an Excel file to compare products and prices with your existing catalog.</p><input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileUpload} className="sr-only" tabIndex={-1} aria-label="Excel workbook" disabled={isParsing}/><Button className="mt-5" disabled={isParsing} onClick={()=>fileInputRef.current?.click()}><Upload className="size-4"/>{isParsing?'Validating…':'Choose Excel file'}</Button><p className="mt-3 text-xs text-muted-foreground">Excel workbook (.xlsx)</p></div>{isParsing&&<div className="mt-5"><LoadingState rows={2} label="Validating rows and comparing current prices…"/></div>}</div>
      <aside className="border-t border-slate-200 bg-slate-50/60 p-6 lg:border-l lg:border-t-0"><h2 className="text-sm font-semibold">Before you import</h2><ul className="mt-4 space-y-4 text-[13px] leading-6 text-muted-foreground"><li>Start with the Excel template for the correct columns and price-list names.</li><li>Review new products, price changes, and validation errors before saving.</li><li>Existing quotations stay unchanged. Price updates are recorded in history.</li></ul><p className="mt-6 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600">No catalog data changes until you confirm the import.</p></aside>
    </section>}
    {diffSummary&&<><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold break-all">{fileName}</h2><p className="mt-1 text-[13px] leading-6 text-muted-foreground">{diffSummary.totalRows} rows reviewed · {diffSummary.errors?`${diffSummary.errors} errors must be corrected in the file before importing.`:'Review the changes below, then confirm the import.'}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={isApplying} onClick={handleCancel}>Choose Another File</Button><Button disabled={isApplying||diffSummary.errors>0||!(diffSummary.newProducts+diffSummary.priceUpdates+diffSummary.detailUpdates)} onClick={()=>setConfirmOpen(true)}>Confirm Import</Button></div></div><ExcelDiffTable diffSummary={diffSummary}/></>}
    <ConfirmationDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Apply these import changes?" description={`${diffSummary?.newProducts||0} new products and ${(diffSummary?.priceUpdates||0)+(diffSummary?.detailUpdates||0)} updates will be saved to the shared catalog. Price changes are recorded in history; existing quotations stay unchanged.`} confirmLabel="Apply Import" destructive={false} onConfirm={handleApplyImport}/>
  </div>;
}
