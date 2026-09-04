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
  return <div className="space-y-5"><PageHeader eyebrow="Product catalog" title="Import Products & Prices" description="Validate your spreadsheet and review every change before saving." actions={<Button variant="outline" onClick={handleDownloadTemplate}><Download className="mr-2 h-4 w-4"/>Download Template</Button>}/>
    <ol className="surface flex flex-wrap gap-4 p-4 text-xs sm:gap-8" aria-label="Import progress">{['Upload Excel','Validate','Preview changes','Complete'].map((label,index)=><li key={label} aria-current={index===step?'step':undefined} className={`flex items-center gap-2 ${index===step?'font-semibold text-foreground':'text-muted-foreground'}`}><span className={`grid h-6 w-6 place-items-center rounded-full border ${index===step?'border-primary bg-primary/5 text-primary':''}`}>{index<step?'✓':index+1}</span>{label}</li>)}</ol>
    <InlineError message={error}/>{complete&&<div className="surface p-6 flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700"/>Import complete</h2><p className="mt-2 text-sm text-muted-foreground">{complete}</p></div><Button variant="outline" asChild><Link href="/products">View Products</Link></Button></div>}
    {!diffSummary&&<section className="surface border-dashed px-5 py-12 text-center"><FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground"/><h2 className="mt-4 text-base font-semibold">Upload a pricing workbook</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Use the template for the correct columns and price-list names. No business data changes until you confirm the preview.</p><input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileUpload} className="sr-only" tabIndex={-1} aria-label="Excel workbook" disabled={isParsing}/><Button className="mt-6" disabled={isParsing} onClick={()=>fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4"/>{isParsing?'Validating…':'Select Spreadsheet File'}</Button>{isParsing&&<div className="mt-6 text-left"><LoadingState rows={2} label="Validating rows and comparing current prices…"/></div>}</section>}
    {diffSummary&&<><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold break-all">{fileName}</h2><p className="mt-1 text-xs text-muted-foreground">{diffSummary.totalRows} rows reviewed · {diffSummary.errors?`${diffSummary.errors} errors must be corrected in the file before importing.`:'Review the changes below, then confirm the import.'}</p></div><div className="flex gap-2"><Button variant="outline" disabled={isApplying} onClick={handleCancel}>Choose Another File</Button><Button disabled={isApplying||diffSummary.errors>0||!(diffSummary.newProducts+diffSummary.priceUpdates+diffSummary.detailUpdates)} onClick={()=>setConfirmOpen(true)}>Confirm Import</Button></div></div><ExcelDiffTable diffSummary={diffSummary}/></>}
    <ConfirmationDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Apply these import changes?" description={`${diffSummary?.newProducts||0} new products and ${(diffSummary?.priceUpdates||0)+(diffSummary?.detailUpdates||0)} updates will be saved to the shared catalog. Price changes are recorded in history; existing quotations stay unchanged.`} confirmLabel="Apply Import" destructive={false} onConfirm={handleApplyImport}/>
  </div>;
}
