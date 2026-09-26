"use client";
import React from 'react';
import { Plus, MoreHorizontal, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader,SearchInput,InlineError,ConfirmationDialog } from '@/components/workspace/primitives';
import { DataTable,DataColumn } from '@/components/workspace/data-table';
import { QuickCustomerDialog } from '@/components/customers/quick-customer-dialog';
import { useAsyncData } from '@/lib/ui-hooks';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { Customer } from '@/types';
import { toast } from 'sonner';
export default function CustomersPage(){
 const {data,loading,error,reload}=useAsyncData(()=>db.fetchCustomers(),[] as Customer[]);
 const [query,setQuery]=React.useState('');const [country,setCountry]=React.useState('all');const [open,setOpen]=React.useState(false);const [editing,setEditing]=React.useState<Customer|null>(null);const [deleting,setDeleting]=React.useState<Customer|null>(null);
 React.useEffect(()=>{if(new URLSearchParams(window.location.search).get('create')==='1')setOpen(true);},[]);
 const create=()=>{setEditing(null);setOpen(true);};
 const rows=React.useMemo(()=>data.filter(c=>(country==='all'||c.country===country)&&[c.name,c.contact_person,c.country,c.email,c.phone].join(' ').toLowerCase().includes(query.toLowerCase())),[data,query,country]);
 const columns:DataColumn<Customer>[]=[
 {key:'name',label:'Company',sortValue:c=>c.name,cell:c=><button className="group flex max-w-72 items-center gap-3 text-left" onClick={()=>{setEditing(c);setOpen(true);}}><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500" aria-hidden="true"><Building2 className="size-4"/></span><span className="font-medium leading-5 text-slate-900 transition-colors group-hover:text-primary">{c.name}</span></button>},
 {key:'contact',label:'Contact',sortValue:c=>c.contact_person||'',cell:c=>c.contact_person||'—'},
 {key:'country',label:'Country',sortValue:c=>c.country||'',cell:c=>c.country||'—'},
 {key:'email',label:'Email',cell:c=>c.email?<a className="break-all text-muted-foreground underline-offset-4 hover:text-primary hover:underline" href={`mailto:${c.email}`}>{c.email}</a>:'—'},
 {key:'phone',label:'Phone',cell:c=>c.phone||'—'},
 {key:'added',label:'Added',sortValue:c=>c.created_at,cell:c=><span className="whitespace-nowrap text-muted-foreground">{formatDate(c.created_at)}</span>},
 {key:'actions',label:'Actions',align:'right',cell:c=><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Actions for ${c.name}`}><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>{setEditing(c);setOpen(true);}}>Edit customer</DropdownMenuItem>{db.getCurrentUser()?.role==='admin'&&<DropdownMenuItem className="text-destructive" onSelect={()=>setDeleting(c)}>Delete customer</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>}
 ];
 return <div className="space-y-5"><PageHeader eyebrow="Catalog & customers" title="Customers" description="Manage the companies and contacts behind every quotation." actions={<Button onClick={create}><Plus className="mr-2 h-4 w-4"/>Add Customer</Button>}/><InlineError message={error} onRetry={reload}/><div className="surface overflow-hidden"><div className="table-toolbar"><SearchInput value={query} onValueChange={setQuery} placeholder="Search company, contact, email…" className="sm:max-w-sm"/><select className="select-control sm:w-48" aria-label="Filter customer country" value={country} onChange={e=>setCountry(e.target.value)}><option value="all">All countries</option>{[...new Set(data.map(c=>c.country).filter(Boolean))].sort().map(c=><option key={c}>{c}</option>)}</select>{(query||country!=='all')&&<Button variant="ghost" size="sm" onClick={()=>{setQuery('');setCountry('all');}}>Clear filters</Button>}</div><DataTable label="customers" data={rows} columns={columns} rowKey={c=>c.id} loading={loading} emptyTitle="No customers found" emptyDescription={query||country!=='all'?'Try a different search or country.':'Add a customer to start preparing quotations.'} emptyAction={<Button variant="outline" onClick={create}>Add Customer</Button>}/></div><QuickCustomerDialog open={open} onOpenChange={setOpen} customer={editing} onCustomerCreated={()=>void reload()}/><ConfirmationDialog open={!!deleting} onOpenChange={v=>!v&&setDeleting(null)} title="Delete customer?" description={`Remove ${deleting?.name}? Customers linked to saved quotations cannot be deleted.`} confirmLabel="Delete Customer" onConfirm={async()=>{if(deleting){await db.deleteCustomer(deleting.id);await reload();toast.success('Customer deleted');}}}/></div>;
}
