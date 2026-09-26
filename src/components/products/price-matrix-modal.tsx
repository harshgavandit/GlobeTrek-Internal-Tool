"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, InlineError } from '@/components/workspace/primitives';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Product, price_lists as PriceListType } from '@/types';
import { db } from '@/lib/db';
import { toast } from 'sonner';

interface PriceMatrixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onEdited: () => void;
}

export function PriceMatrixModal({
  open,
  onOpenChange,
  product,
  onEdited,
}: PriceMatrixModalProps) {
  const [priceLists, setPriceLists] = React.useState<PriceListType[]>(db.getPriceLists());
  const [newPrices, setNewPrices] = React.useState<Record<string, number>>({});
  const [reason, setReason] = React.useState('Manual price adjustment');
  const [saving, setSaving] = React.useState(false);
  const [error,setError]=React.useState('');

  React.useEffect(() => {
    if(!open)return;setError('');db.fetchPriceLists().then(lists=>setPriceLists(lists.filter(p=>p.is_active))).catch(e=>setError(e.message));
    const map: Record<string, number> = {};
    product.prices?.forEach((p) => {
      map[p.price_list_id] = p.unit_price;
    });
    setNewPrices(map);
  }, [product,open]);

  const handleSave = async () => {
    setSaving(true);setError('');
    try {
      const activePrices=Object.fromEntries(Object.entries(newPrices).filter(([id])=>priceLists.some(p=>p.id===id)));
      await db.updateProduct(product.id, {...product, reason:reason.trim()||'Price matrix update'} as Partial<Product>,activePrices);

      toast.success(`Prices updated for "${product.name}"`);
      onEdited();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error?err.message:'Failed to update prices');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v=>!saving&&onOpenChange(v)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Edit master prices
          </DialogTitle>
          <DialogDescription>
            Update list prices across schedules for <span className="font-medium text-foreground">{product.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1"><InlineError message={error}/>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table aria-label="Master prices by price list">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">Price Schedule</TableHead>
                  <TableHead className="text-xs w-36 text-right">Current price</TableHead>
                  <TableHead className="text-xs w-36 text-right">Unit Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceLists.map((pl) => (
                  <TableRow key={pl.id} className={newPrices[pl.id]!==undefined&&newPrices[pl.id]!==product.prices?.find(p=>p.price_list_id===pl.id)?.unit_price?"bg-primary/5":""}>
                    <TableCell className="space-y-0.5">
                      <p className="text-[13px] font-medium text-foreground">{pl.name}</p>
                      {pl.description && (
                        <p className="max-w-64 text-xs leading-5 text-muted-foreground">{pl.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-right tabular-nums text-xs">{product.prices?.find(p=>p.price_list_id===pl.id)?formatCurrency(product.prices.find(p=>p.price_list_id===pl.id)!.unit_price,pl.currency):'Not priced'}<p className="text-[11px] text-muted-foreground mt-1">{product.prices?.find(p=>p.price_list_id===pl.id)?.updated_at&&formatDate(product.prices.find(p=>p.price_list_id===pl.id)!.updated_at)}</p></div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label={`Master price ${pl.name}`}
                        value={newPrices[pl.id] === undefined ? '' : newPrices[pl.id]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPrices((prev) => {const next={...prev};if(val==='')delete next[pl.id];else next[pl.id]=Number(val);return next;});
                        }}
                        className="min-w-24 text-right font-medium tabular-nums"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">Blank prices are left unchanged. Enter 0 explicitly only for a free item.</p>

          <div className="space-y-1.5">
            <FormField label="Change reason / Audit note">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why the master price changed"
              className="text-sm"
            /></FormField>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-[13px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="text-[13px]"
          >
            {saving ? 'Saving...' : 'Save Prices'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
