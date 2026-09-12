"use client";
import React from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {db} from '@/lib/db';
import {UserProfile} from '@/types';
import {Sidebar} from './sidebar';
import {Header} from './header';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {InlineError,LoadingState,EmptyState} from '@/components/workspace/primitives';
import {ShieldCheck} from 'lucide-react';
export default function DashboardLayout({children,user}:{children:React.ReactNode;user:UserProfile}){
 const [collapsed,setCollapsed]=React.useState(false),[mobileOpen,setMobileOpen]=React.useState(false),[ready,setReady]=React.useState(false),[error,setError]=React.useState('');const pathname=usePathname();
 React.useEffect(()=>{db.setCurrentUser(user);setReady(true);const failed=(e:Event)=>setError((e as CustomEvent).detail);const rejected=(e:PromiseRejectionEvent)=>{e.preventDefault();setError(e.reason?.message||'The request failed. Please retry.');};window.addEventListener('api-error',failed);window.addEventListener('unhandledrejection',rejected);return()=>{window.removeEventListener('api-error',failed);window.removeEventListener('unhandledrejection',rejected);};},[user]);
 React.useEffect(()=>{setError('');setMobileOpen(false);},[pathname]);
 if(!ready)return <LoadingState/>;
 const restricted=user.role!=='admin'&&['/settings','/users','/products/import','/products/categories','/price-lists'].includes(pathname);
 return <div className="flex h-dvh overflow-hidden bg-background font-sans"><a href="#main-content" className="skip-link">Skip to content</a><div className="hidden lg:block"><Sidebar collapsed={collapsed} onToggle={()=>setCollapsed(v=>!v)}/></div><Dialog open={mobileOpen} onOpenChange={setMobileOpen}><DialogContent className="left-0 top-0 h-dvh max-h-none w-[300px] max-w-[88vw] translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0 sm:p-0"><DialogTitle className="sr-only">Workspace navigation</DialogTitle><DialogDescription className="sr-only">Choose a page in the Globetrek workspace.</DialogDescription><Sidebar mobile collapsed={false} onToggle={()=>setMobileOpen(false)} onNavigate={()=>setMobileOpen(false)}/></DialogContent></Dialog><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><Header onToggleSidebar={()=>setMobileOpen(true)}/><main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto outline-none"><div key={pathname} className="workspace-content animate-fade-in">{error&&<div className="mb-5"><InlineError message={error} onDismiss={()=>setError('')}/></div>}{restricted?<div className="surface"><EmptyState icon={ShieldCheck} title="Administrator permission required" description="Your account can manage customers and quotations. Contact an administrator for access to this page." action={<Button asChild variant="outline"><Link href="/dashboard">Back to dashboard</Link></Button>}/></div>:children}</div></main></div></div>;
}
