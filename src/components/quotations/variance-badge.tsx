"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { calculatePriceVariance } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VarianceBadgeProps {
  masterPrice: number;
  quotedPrice: number;
  currency?: string;
}

export function VarianceBadge({ masterPrice, quotedPrice, currency = 'USD' }: VarianceBadgeProps) {
  const { varianceAmount, variancePercent, isDiscount, isSurcharge, isNeutral } =
    calculatePriceVariance(masterPrice, quotedPrice);

  if (masterPrice === 0 || isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>0.00%</span>
      </span>
    );
  }

  if (isSurcharge) {
    return (
      <Badge
        variant="secondary"
        className="text-[11px] font-mono font-medium py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 gap-0.5"
      >
        <TrendingUp className="h-3 w-3 inline" />
        <span>+{variancePercent.toFixed(2)}%</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="text-[11px] font-mono font-medium py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200 gap-0.5"
    >
      <TrendingDown className="h-3 w-3 inline" />
      <span>{variancePercent.toFixed(2)}%</span>
    </Badge>
  );
}
