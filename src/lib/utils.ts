import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Decimal from "decimal.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currency} 0.00`;

  const symMap: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
  };

  const symbol = symMap[currency.toUpperCase()] || `${currency} `;

  if (currency.toUpperCase() === 'INR') {
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function calculatePriceVariance(
  masterPrice: number,
  quotedPrice: number
): {
  varianceAmount: number;
  variancePercent: number;
  isDiscount: boolean;
  isSurcharge: boolean;
  isNeutral: boolean;
} {
  const m = new Decimal(masterPrice || 0);
  const q = new Decimal(quotedPrice || 0);

  if (m.isZero()) {
    return {
      varianceAmount: 0,
      variancePercent: 0,
      isDiscount: false,
      isSurcharge: false,
      isNeutral: true,
    };
  }

  const diff = q.minus(m);
  const percent = diff.dividedBy(m).times(100);

  return {
    varianceAmount: diff.toNumber(),
    variancePercent: percent.toNumber(),
    isDiscount: diff.isNegative(),
    isSurcharge: diff.isPositive(),
    isNeutral: diff.isZero(),
  };
}
