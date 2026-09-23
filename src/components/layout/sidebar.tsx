"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import {cn} from '@/lib/utils';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip';
import {UserNav} from './user-nav';
import {navigation,catalogNavigation,navIsActive} from './navigation';
export function Sidebar({collapsed,onToggle,onNavigate,mobile=false}:{collapsed:boolean;onToggle:()=>void;onNavigate?:()=>void;mobile?:boolean}){
 const pathname=usePathname(),user=db.getCurrentUser(),admin=user?.role==='admin';
 return <TooltipProvider delayDuration={150}><aside aria-label="Main navigation" className={cn('flex h-full shrink-0 flex-col border-r border-slate-200/80 bg-white',mobile?'w-full':collapsed?'w-[72px]':'w-[248px]')}>
 <Link href="/dashboard" onClick={onNavigate} aria-label="Globetrek dashboard" className={cn('flex h-20 shrink-0 items-center gap-2.5 border-b border-slate-200/60',collapsed?'justify-center':'px-5')}><Image src="/brand/globetrek-new-logo.png" alt="GlobeTrek Engineering Corporation" width={817} height={306} className={cn('h-auto shrink-0 object-contain',collapsed?'w-9':'w-[145px]')} priority/>{!collapsed&&<span className="ml-auto rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-700">Internal</span>}</Link>
 <div className="flex-1 space-y-6 overflow-y-auto px-3 pb-5 pt-5">{['Workspace','Catalog & customers','Administration'].map(section=>{const entries=navigation.filter(n=>n.section===section&&(!n.adminOnly||admin));return entries.length?<div key={section}>{!collapsed&&<p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{section}</p>}<nav aria-label={section} className="space-y-1">{entries.map(item=>{const active=navIsActive(pathname,item.href),Icon=item.icon;const link=<Link href={item.href} aria-label={item.title} aria-current={active?'page':undefined} onClick={onNavigate} className={cn('group relative flex min-h-11 items-center gap-3 rounded-xl text-sm transition-colors',collapsed?'justify-center':'px-3 py-2',active?'bg-blue-50 text-blue-800':'text-slate-600 hover:bg-slate-50 hover:text-foreground')}><span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',active?'bg-blue-50 text-primary':'text-slate-500 group-hover:bg-slate-100 group-hover:text-primary')}><Icon className="size-[17px]"/></span>{!collapsed&&<span className="min-w-0"><span className="block font-semibold leading-4">{item.title}</span></span>}{active&&<span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"/>}</Link>;return <React.Fragment key={item.href}>{collapsed?<Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right"><p className="font-medium">{item.title}</p><p className="text-xs opacity-70">{item.description}</p></TooltipContent></Tooltip>:link}{item.href==='/products'&&admin&&pathname.startsWith('/products')&&!collapsed&&<div className="ml-7 my-2 space-y-1 border-l border-blue-100 pl-4">{catalogNavigation.map(sub=><Link key={sub.href} href={sub.href} onClick={onNavigate} aria-current={pathname===sub.href?'page':undefined} className={cn('block rounded-lg px-2.5 py-2 text-xs',pathname===sub.href?'bg-blue-50 font-semibold text-primary':'text-muted-foreground hover:bg-white hover:text-foreground')}>{sub.title}</Link>)}</div>}</React.Fragment>;})}</nav></div>:null;})}</div>
 {!mobile&&<div className="px-3 pb-3"><Button variant="ghost" aria-expanded={!collapsed} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} onClick={onToggle} className={cn('w-full text-muted-foreground',!collapsed&&'justify-start px-2.5')}>{collapsed?<PanelLeftOpen/>:<><PanelLeftClose/><span className="text-xs">Collapse sidebar</span></>}</Button></div>}
 <div className={cn('border-t p-3',collapsed&&'px-2')}><UserNav expanded={!collapsed}/></div>
 </aside></TooltipProvider>;
}
