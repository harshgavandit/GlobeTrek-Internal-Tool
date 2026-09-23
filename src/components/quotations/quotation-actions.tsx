"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal,Copy,Download,FileSpreadsheet,FileText,Pencil,Send,Trash2,Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmationDialog } from '@/components/workspace/primitives';
import { Quotation } from '@/types';
import { db } from '@/lib/db';
import { generateQuotationPDF } from '@/lib/pdf-generator';
import { generateQuotationExcel } from '@/lib/excel-generator';
import { generateQuotationWord } from '@/lib/word-generator';
import { toast } from 'sonner';
export function QuotationActions({quotation:q,onChanged,onError,detail=false}:{quotation:Quotation;onChanged:()=>void|Promise<void>;onError:(message:string)=>void;detail?:boolean}){
 const router=useRouter();const [busy,setBusy]=React.useState('');const [remove,setRemove]=React.useState(false);
 async function run(name:string,action:()=>Promise<void>){setBusy(name);onError('');try{await action();}catch(e){onError(e instanceof Error?e.message:`Could not ${name.toLowerCase()}.`);}finally{setBusy('');}}
 const pdf=()=>run('Generate PDF',async()=>{await generateQuotationPDF(q,q.company_snapshot);toast.success('PDF downloaded');});
 const excel=()=>run('Generate Excel',async()=>{await generateQuotationExcel(q,q.company_snapshot);toast.success('Excel downloaded');});
 const word=()=>run('Generate Word',async()=>{await generateQuotationWord(q,q.company_snapshot);toast.success('Editable Word file downloaded');});
 const duplicate=()=>run('Duplicate',async()=>{const result=await db.duplicateQuotation(q.id);toast.success(`Created ${result.quotation_number}`);router.push(`/quotations/${result.id}/edit`);});
 const status=(value:Quotation['status'])=>run('Update status',async()=>{await db.updateQuotation(q.id,{status:value});await onChanged();toast.success(`Quotation marked ${value}`);});
 return <><div className="flex flex-wrap gap-2 items-center">{detail&&<><Button disabled={!!busy} onClick={pdf}><Download className="mr-2 h-4 w-4"/>{busy==='Generate PDF'?'Generating…':'Download PDF'}</Button><Button variant="outline" disabled={!!busy} onClick={excel}><FileSpreadsheet className="mr-2 h-4 w-4"/>{busy==='Generate Excel'?'Generating…':'Download Excel'}</Button><Button variant="outline" disabled={!!busy} onClick={word}><FileText className="mr-2 h-4 w-4"/>{busy==='Generate Word'?'Generating…':'Download Word'}</Button><Button variant="outline" disabled={!!busy} onClick={duplicate}><Copy className="mr-2 h-4 w-4"/>{busy==='Duplicate'?'Duplicating…':'Duplicate'}</Button></>}
 <DropdownMenu><DropdownMenuTrigger asChild><Button variant={detail?'outline':'ghost'} size="icon" disabled={!!busy} aria-label={`Actions for ${q.quotation_number}`}><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48">{!detail&&<DropdownMenuItem asChild><Link href={`/quotations/${q.id}`}><Eye className="mr-2 h-4 w-4"/>View quotation</Link></DropdownMenuItem>}{q.status==='draft'&&<DropdownMenuItem asChild><Link href={`/quotations/${q.id}/edit`}><Pencil className="mr-2 h-4 w-4"/>Edit draft</Link></DropdownMenuItem>}{!detail&&<><DropdownMenuItem onSelect={duplicate}><Copy className="mr-2 h-4 w-4"/>Duplicate</DropdownMenuItem><DropdownMenuItem onSelect={pdf}><Download className="mr-2 h-4 w-4"/>Download PDF</DropdownMenuItem><DropdownMenuItem onSelect={excel}><FileSpreadsheet className="mr-2 h-4 w-4"/>Download Excel</DropdownMenuItem><DropdownMenuItem onSelect={word}><FileText className="mr-2 h-4 w-4"/>Download Word</DropdownMenuItem></>}{q.status==='draft'&&<DropdownMenuItem onSelect={()=>status('sent')}><Send className="mr-2 h-4 w-4"/>Mark Sent</DropdownMenuItem>}{q.status==='sent'&&<><DropdownMenuItem onSelect={()=>status('accepted')}>Mark Accepted</DropdownMenuItem><DropdownMenuItem onSelect={()=>status('rejected')}>Mark Rejected</DropdownMenuItem></>}{db.getCurrentUser()?.role==='admin'&&<><DropdownMenuSeparator/><DropdownMenuItem className="text-destructive" onSelect={()=>setRemove(true)}><Trash2 className="mr-2 h-4 w-4"/>Delete quotation</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></div>
 <ConfirmationDialog open={remove} onOpenChange={setRemove} title="Delete quotation?" description={`Permanently remove ${q.quotation_number} and its saved revisions? This cannot be undone.`} confirmLabel="Delete Quotation" onConfirm={async()=>{await db.deleteQuotation(q.id);toast.success('Quotation deleted');if(detail)router.push('/quotations');else await onChanged();}}/></>;
}
