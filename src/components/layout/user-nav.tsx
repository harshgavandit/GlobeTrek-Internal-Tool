"use client";
import React from 'react';
import {useRouter} from 'next/navigation';
import {ChevronsUpDown,LogOut,Settings} from 'lucide-react';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Button} from '@/components/ui/button';
import {db} from '@/lib/db';
import {toast} from 'sonner';
export function UserNav({expanded=false}:{expanded?:boolean}){
 const router=useRouter(),currentUser=db.getCurrentUser(),[busy,setBusy]=React.useState(false);
 const signOut=async()=>{setBusy(true);try{const r=await fetch('/api/auth/logout',{method:'POST'});if(!r.ok)throw new Error('Could not revoke your session. Please try signing out again.');db.clear();router.push('/login');router.refresh();}catch(e){toast.error(e instanceof Error?e.message:'Sign out failed. Please retry.');}finally{setBusy(false);}};
 return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" aria-label="Account menu" className={expanded?'h-auto w-full justify-start gap-2.5 rounded-lg px-1.5 py-2 hover:bg-slate-200/50':'size-10 rounded-lg p-0'}><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700">{currentUser?.full_name?.split(' ').map(n=>n[0]).slice(0,2).join('')||'U'}</span>{expanded&&<><span className="min-w-0 flex-1 text-left"><span className="block truncate text-[13px] font-semibold text-slate-800">{currentUser?.full_name}</span><span className="mt-0.5 block text-[11px] font-normal text-slate-500">{currentUser?.role==='admin'?'Administrator':'Team member'}</span></span><ChevronsUpDown className="size-3 text-muted-foreground"/></>}</Button></DropdownMenuTrigger><DropdownMenuContent align="start" side="top" sideOffset={12} className="w-64"><DropdownMenuLabel className="space-y-1 px-3 py-3"><p className="text-sm font-medium">{currentUser?.full_name}</p><p className="break-all text-xs font-normal text-muted-foreground">{currentUser?.email}</p></DropdownMenuLabel><DropdownMenuSeparator/>{currentUser?.role==='admin'&&<DropdownMenuItem onClick={()=>router.push('/settings')} className="gap-2"><Settings className="size-4"/>Workspace settings</DropdownMenuItem>}<DropdownMenuItem disabled={busy} onClick={signOut} className="gap-2 text-destructive focus:text-destructive"><LogOut className="size-4"/>{busy?'Signing out…':'Sign out'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
