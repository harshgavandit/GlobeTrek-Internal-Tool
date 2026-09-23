import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import JSZip from 'jszip';
import { renderWord } from '../src/lib/export-service';
import type { Quotation } from '../src/types';

function decodeXmlText(xml: string) {
  return xml
    .replace(/<w:tab\s*\/?>/g, '\t')
    .replace(/<w:br\s*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

test('Word export contains the saved quotation snapshot as editable OOXML', async () => {
  const fixture = JSON.parse(await fs.readFile('tmp/audit/fixture.json', 'utf8')) as {
    quotation: Quotation;
  };
  const productName = 'GT-01 Core Cutter Apparatus, Field Density - Core Cutter Method';
  const quotation: Quotation = {
    ...fixture.quotation,
    items: fixture.quotation.items.map((item, index) => index === 0 ? {
      ...item,
      product_name: productName,
      description: `${productName} Supplied complete with rammer, weight approx 9kg.`,
    } : item),
  };
  const bytes = await renderWord(quotation);

  assert.ok(bytes.length > 1_000);
  assert.equal(String.fromCharCode(...bytes.slice(0, 2)), 'PK');

  const archive = await JSZip.loadAsync(bytes);
  const documentXml = await archive.file('word/document.xml')?.async('string');
  assert.ok(documentXml, 'DOCX must contain word/document.xml');
  const text = decodeXmlText(documentXml).replace(/\s+/g, ' ').trim();

  for (const expected of [
    quotation.quotation_number,
    quotation.customer_name,
    quotation.items[0].product_name,
    'TERMS & CONDITIONS',
    'Grand Total',
  ]) {
    assert.ok(text.includes(expected), `Word export is missing ${expected}`);
  }

  assert.ok(text.includes('Supplied complete with rammer, weight approx 9kg.'));
  const occurrences = text.split(productName).length - 1;
  assert.equal(occurrences, 1, 'The first product description must not be duplicated');
});
