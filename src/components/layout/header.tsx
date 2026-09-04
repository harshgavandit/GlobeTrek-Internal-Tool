"use client";
import React from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {ChevronRight,Menu,Search,ArrowUpRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {SearchInput} from '@/components/workspace/primitives';
import {navigation,catalogNavigation} from './navigation';
import {db} from '@/lib/db';
import {cn} from '@/lib/utils';
export function Header({onToggleSidebar}:{onToggleSidebar:()=>void}){
 const pathname=usePathname(),router=useRouter(),[open,setOpen]=React.useState(false),[query,setQuery]=React.useState(''),[active,setActive]=React.useState(0);
 const all=[...navigation,...catalogNavigation].filter(n=>!n.adminOnly||db.getCurrentUser()?.role==='admin');
 const results=all.filter(n=>n.title.toLowerCase().includes(query.toLowerCase()));
 const current=all.find(n=>n.href===pathname)?.title||(pathname.endsWith('/edit')?'Edit quotation':pathname.startsWith('/quotations/')?'Quotation details':'Workspace');
 const parent=pathname.startsWith('/quotations/')?{name:'Quotations',href:'/quotations'}:pathname.startsWith('/products/')?{name:'Products',href:'/products'}:null;
 React.useEffect(()=>{const handler=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(v=>!v);}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[]);
 const go=(href:string)=>{setOpen(false);router.push(href);};
 return <><header className="flex h-[60px] shrink-0 items-center justify-between gap-4 border-b bg-white px-4 sm:px-7"><div className="flex min-w-0 items-center gap-3"><Button className="size-9 lg:hidden" variant="ghost" size="icon" aria-label="Open navigation" onClick={onToggleSidebar}><Menu/></Button><nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-xs">{parent&&<><Link href={parent.href} className="text-muted-foreground hover:text-foreground">{parent.name}</Link><ChevronRight className="size-3 shrink-0 text-muted-foreground"/></>}<span aria-current="page" className="truncate font-medium">{current}</span></nav></div><Button variant="ghost" onClick={()=>{setQuery('');setActive(0);setOpen(true);}} aria-label="Search workspace navigation" className="gap-2 text-muted-foreground"><Search className="size-4"/><span className="hidden sm:inline text-xs">Go to…</span><kbd className="hidden sm:inline rounded border bg-slate-50 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd></Button></header>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Go to a page</DialogTitle><DialogDescription>Find a workspace page. Use the arrow keys and Enter to navigate.</DialogDescription></DialogHeader><SearchInput autoFocus value={query} onValueChange={v=>{setQuery(v);setActive(0);}} placeholder="Search pages…" role="combobox" aria-expanded="true" aria-controls="workspace-pages" aria-activedescendant={results[active]?'workspace-page-'+active:undefined} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setActive(v=>Math.min(v+1,Math.max(0,results.length-1)));}if(e.key==='ArrowUp'){e.preventDefault();setActive(v=>Math.max(v-1,0));}if(e.key==='Enter'&&results[active]){e.preventDefault();go(results[active].href);}}}/><div id="workspace-pages" role="listbox" aria-label="Workspace pages" className="max-h-80 space-y-1 overflow-y-auto">{results.map((item,index)=><button key={item.href} id={'workspace-page-'+index} role="option" aria-selected={index===active} onClick={()=>go(item.href)} className={cn('flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm',index===active?'bg-blue-50 text-primary':'hover:bg-muted')}><item.icon className="size-4"/>{item.title}<ArrowUpRight className="ml-auto size-3 text-muted-foreground"/></button>)}{!results.length&&<p className="py-6 text-center text-sm text-muted-foreground">No matching pages. Try “products” or “quotations”.</p>}</div></DialogContent></Dialog></>;
}
