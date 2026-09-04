const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function numToWordsUnder1000(num: number): string {
  let str = '';
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ones[num] + ' ';
  }
  return str.trim();
}

function convertIndian(amount: number, currencyName: string, subunitName: string): string {
  let [intPart, decPart] = amount.toFixed(2).split('.');
  let num = parseInt(intPart, 10);


  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  if (crore > 0) words += convertIndian(crore, '', '').replace(/ Only$/, '').trim() + ' Crore ';
  if (lakh > 0) words += numToWordsUnder1000(lakh) + ' Lakh ';
  if (thousand > 0) words += numToWordsUnder1000(thousand) + ' Thousand ';
  if (remainder > 0) words += numToWordsUnder1000(remainder) + ' ';

  words = (words.trim() || 'Zero') + ' ' + currencyName;

  const paisa = parseInt(decPart, 10);
  if (paisa > 0) {
    words += ' and ' + numToWordsUnder1000(paisa) + ' ' + subunitName;
  }

  return words + ' Only';
}

function convertWestern(amount: number, currencyName: string, subunitName: string): string {
  let [intPart, decPart] = amount.toFixed(2).split('.');
  let num = parseInt(intPart, 10);


  const units = ['', 'Thousand', 'Million', 'Billion'];
  let chunks: number[] = [];
  while (num > 0) {
    chunks.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let words = '';
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk > 0) {
      words += numToWordsUnder1000(chunk) + ' ' + units[i] + ' ';
    }
  }

  words = (words.trim() || 'Zero') + ' ' + currencyName;

  const cents = parseInt(decPart, 10);
  if (cents > 0) {
    words += ' and ' + numToWordsUnder1000(cents) + ' ' + subunitName;
  }

  return words + ' Only';
}

export function numberToWords(amount: number, currency = 'USD'): string {
  if (isNaN(amount) || amount === 0) return `Zero ${currency} Only`;

  const curr = currency.toUpperCase();
  if (curr === 'INR') {
    return convertIndian(amount, 'Rupees', 'Paise');
  }
  if (curr === 'USD') {
    return convertWestern(amount, 'US Dollars', 'Cents');
  }
  if (curr === 'EUR') {
    return convertWestern(amount, 'Euros', 'Cents');
  }
  if (curr === 'GBP') {
    return convertWestern(amount, 'Pounds', 'Pence');
  }
  return convertWestern(amount, curr, 'Cents');
}
