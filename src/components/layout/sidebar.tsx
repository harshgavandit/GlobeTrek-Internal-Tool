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
 return <TooltipProvider delayDuration={150}><aside aria-label="Main navigation" className={cn('flex h-full shrink-0 flex-col border-r bg-[#f9fafb]',mobile?'w-full':collapsed?'w-[72px]':'w-[232px]')}>
 <Link href="/dashboard" onClick={onNavigate} aria-label="Globetrek dashboard" className={cn('flex h-[72px] shrink-0 items-center gap-2.5',collapsed?'justify-center':'px-5')}><Image src="/brand/globetrek-new-logo.png" alt="GlobeTrek Engineering Corporation" width={817} height={306} className={cn('h-auto shrink-0 object-contain',collapsed?'w-9':'w-[132px]')} priority/>{!collapsed&&<div className="sr-only">GlobeTrek quotation workspace</div>}</Link>
 <div className="flex-1 space-y-7 overflow-y-auto px-3 pb-5 pt-3">{['Workspace','Catalog & customers','Administration'].map(section=>{const entries=navigation.filter(n=>n.section===section&&(!n.adminOnly||admin));return entries.length?<div key={section}>{!collapsed&&<p className="eyebrow mb-2 px-2.5">{section}</p>}<nav aria-label={section} className="space-y-1">{entries.map(item=>{const active=navIsActive(pathname,item.href),Icon=item.icon;const link=<Link href={item.href} aria-label={item.title} aria-current={active?'page':undefined} onClick={onNavigate} className={cn('flex h-10 items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',collapsed?'justify-center':'px-2.5',active?'bg-white text-primary shadow-xs ring-1 ring-border':'text-slate-600 hover:bg-slate-100 hover:text-foreground')}><Icon className="size-[17px] shrink-0"/>{!collapsed&&item.title}</Link>;return <React.Fragment key={item.href}>{collapsed?<Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{item.title}</TooltipContent></Tooltip>:link}{item.href==='/products'&&admin&&pathname.startsWith('/products')&&!collapsed&&<div className="ml-5 my-1 border-l pl-3">{catalogNavigation.map(sub=><Link key={sub.href} href={sub.href} onClick={onNavigate} aria-current={pathname===sub.href?'page':undefined} className={cn('block rounded-md px-2 py-2 text-xs',pathname===sub.href?'font-semibold text-primary bg-blue-50/70':'text-muted-foreground hover:text-foreground')}>{sub.title}</Link>)}</div>}</React.Fragment>;})}</nav></div>:null;})}</div>
 {!mobile&&<div className="px-3 pb-3"><Button variant="ghost" aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} onClick={onToggle} className={cn('w-full text-muted-foreground',!collapsed&&'justify-start px-2.5')}>{collapsed?<PanelLeftOpen/>:<><PanelLeftClose/><span className="text-xs">Collapse sidebar</span></>}</Button></div>}
 <div className={cn('border-t p-3',collapsed&&'px-2')}><UserNav expanded={!collapsed}/></div>
 </aside></TooltipProvider>;
}
