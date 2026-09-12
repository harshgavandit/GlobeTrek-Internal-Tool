import Decimal from 'decimal.js';

export const DEFAULT_INR_PER_USD = 90;

export function quotationExchangeRate(
  priceListCurrency: string,
  quotationCurrency: string,
  exchangeRate: number | undefined,
) {
  if (priceListCurrency === quotationCurrency) return 1;
  if (priceListCurrency === 'INR' && quotationCurrency === 'USD') {
    const rate = new Decimal(exchangeRate || 0);
    if (!rate.isFinite() || rate.lte(0)) throw new Error('Enter a valid INR per USD conversion rate.');
    return rate.toNumber();
  }
  throw new Error(`Conversion from ${priceListCurrency} to ${quotationCurrency} is not supported.`);
}

export function convertListPrice(
  amount: number,
  priceListCurrency: string,
  quotationCurrency: string,
  exchangeRate: number | undefined,
) {
  const rate = quotationExchangeRate(priceListCurrency, quotationCurrency, exchangeRate);
  const value = new Decimal(amount || 0);
  return (priceListCurrency === quotationCurrency ? value : value.dividedBy(rate))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function repriceQuotationAmount(
  amount: number,
  priceListCurrency: string,
  fromCurrency: string,
  fromRate: number | undefined,
  toCurrency: string,
  toRate: number | undefined,
) {
  const sourceRate = quotationExchangeRate(priceListCurrency, fromCurrency, fromRate);
  const targetRate = quotationExchangeRate(priceListCurrency, toCurrency, toRate);
  const listCurrencyAmount = priceListCurrency === fromCurrency
    ? new Decimal(amount || 0)
    : new Decimal(amount || 0).times(sourceRate);
  return (priceListCurrency === toCurrency ? listCurrencyAmount : listCurrencyAmount.dividedBy(targetRate))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

export function sourcePriceFromSnapshot(
  masterPrice: number,
  priceListCurrency: string,
  quotationCurrency: string,
  exchangeRate: number | undefined,
) {
  if (priceListCurrency === quotationCurrency) return masterPrice;
  const rate = quotationExchangeRate(priceListCurrency, quotationCurrency, exchangeRate);
  return new Decimal(masterPrice).times(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}
