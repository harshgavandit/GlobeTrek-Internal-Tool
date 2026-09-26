"use client";

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, FileText, Package, Users, ArrowRight, Loader2, LockKeyhole, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, InlineError } from '@/components/workspace/primitives';
import { db } from '@/lib/db';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter(), [email, setEmail] = React.useState(''), [password, setPassword] = React.useState(''), [visible, setVisible] = React.useState(false), [loading, setLoading] = React.useState(false), [error, setError] = React.useState('');
  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
      const j = await r.json();
      if (!r.ok || !j.success) { setError(j.error || 'Check your email and password, then try again.'); return; }
      db.setCurrentUser(j.user); toast.success(`Welcome back, ${j.user.full_name}`); router.push('/dashboard'); router.refresh();
    } catch { setError('Unable to connect. Check your connection and try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-5 sm:px-10 lg:px-12">
        <Image src="/brand/globetrek-new-logo.png" alt="GlobeTrek Engineering Corporation" width={817} height={306} className="h-auto w-[152px] object-contain sm:w-[172px]" priority />
        <span className="hidden items-center gap-2 rounded-md border bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex"><LockKeyhole className="size-3.5" aria-hidden />Internal workspace</span>
      </header>
      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <aside className="relative hidden flex-col justify-center overflow-hidden border-r bg-[#f5f7fa] px-12 py-10 lg:flex xl:px-20">
          <div className="mx-auto w-full max-w-[480px]">
            <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-blue-100 bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-700"><FileText className="size-3.5" aria-hidden />Quotation workspace</div>
            <h2 className="max-w-[450px] text-[36px] font-semibold leading-[1.2] tracking-[-0.04em] text-slate-900 xl:text-[42px]">Every detail.<br />One clear quotation.</h2>
            <p className="mt-4 max-w-[400px] text-sm leading-7 text-slate-600">Bring your customers, product catalog and pricing together. Prepare professional quotations with confidence.</p>

            <div aria-hidden="true" className="relative my-9 max-w-[420px] rounded-lg border border-slate-200 bg-white p-6 shadow-[0_8px_32px_-16px_rgba(15,23,42,0.2)] xl:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5"><div><div className="text-[13px] font-bold tracking-tight text-blue-800">GlobeTrek</div><div className="mt-1 text-[8px] uppercase tracking-widest text-slate-400">Engineering Corporation</div></div><span className="pt-1 text-[10px] font-semibold tracking-[0.06em] text-slate-700">SALES QUOTATION</span></div>
              <div className="my-5 flex items-start justify-between"><div className="space-y-2"><div className="h-1.5 w-24 rounded-sm bg-slate-200" /><div className="h-1.5 w-32 rounded-sm bg-slate-100" /><div className="h-1.5 w-20 rounded-sm bg-slate-100" /></div><div className="h-1.5 w-20 rounded-sm bg-slate-200" /></div>
              <div className="overflow-hidden rounded border border-slate-200"><div className="grid grid-cols-[1fr_40px_60px] gap-4 bg-slate-800 px-3 py-2 text-[8px] font-medium uppercase tracking-wide text-white"><span>Description</span><span>Qty</span><span className="text-right">Amount</span></div>{[0, 1, 2].map(i => <div key={i} className="grid grid-cols-[1fr_40px_60px] items-center gap-4 border-t border-slate-100 px-3 py-3"><div className="space-y-1.5"><div className="h-1.5 w-4/5 rounded-sm bg-slate-200" /><div className="h-1 w-full rounded-sm bg-slate-100" /></div><div className="h-1.5 w-4 rounded-sm bg-slate-200" /><div className="ml-auto h-1.5 w-9 rounded-sm bg-slate-200" /></div>)}</div>
              <div className="mt-4 flex justify-end"><div className="w-36 space-y-2.5"><div className="flex justify-between"><div className="h-1.5 w-12 rounded-sm bg-slate-100" /><div className="h-1.5 w-8 rounded-sm bg-slate-200" /></div><div className="flex justify-between border-t border-slate-200 pt-2.5"><div className="h-2 w-14 rounded-sm bg-slate-300" /><div className="h-2 w-10 rounded-sm bg-blue-200" /></div></div></div>
              <div className="absolute -bottom-3 right-5 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"><span className="flex size-5 items-center justify-center rounded-full bg-blue-50 text-primary"><Check className="size-3" /></span><span className="text-[10px] font-medium text-slate-600">Prepare. Review. Export.</span></div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1 text-xs text-slate-600">{[{ icon: Users, label: 'Customers' }, { icon: Package, label: 'Product catalog' }, { icon: FileText, label: 'Quotations' }].map(item => <span key={item.label} className="inline-flex items-center gap-2"><item.icon className="size-3.5 text-slate-400" aria-hidden />{item.label}</span>)}</div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-6 py-12 sm:px-10 lg:py-16">
          <div className="w-full max-w-[380px]">
            <div className="mb-8">
              <span className="mb-5 flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600"><LockKeyhole className="size-[18px]" aria-hidden /></span>
              <p className="mb-2 text-xs font-medium text-primary">Welcome back</p>
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">Sign in to your workspace</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Enter your company account details to continue.</p>
            </div>
            <form onSubmit={login} className="space-y-5" aria-busy={loading}>
              <InlineError message={error} />
              <FormField label="Email address"><Input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" disabled={loading} className="h-11 sm:h-11" /></FormField>
              <div className="relative"><FormField label="Password"><Input type={visible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="h-11 pr-12 sm:h-11" disabled={loading} /></FormField><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(v => !v)} className="absolute bottom-0.5 right-0.5 flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>
              <Button type="submit" disabled={loading} className="!mt-6 h-11 w-full text-sm">{loading && <Loader2 className="size-4 animate-spin" />}{loading ? 'Signing in...' : 'Sign in'}{!loading && <ArrowRight className="ml-auto size-4" />}</Button>
            </form>
            <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden />Access is restricted to authorized employees.</p>
            <div className="mt-10 border-t pt-5"><p className="text-xs leading-5 text-muted-foreground">Need access? Contact your workspace administrator.</p></div>
          </div>
        </main>
      </div>
      <footer className="border-t px-6 py-4 text-center text-[11px] text-slate-500 sm:px-10 lg:px-12 lg:text-left">GlobeTrek Engineering Corporation &middot; Internal quotation management</footer>
    </div>
  );
}
