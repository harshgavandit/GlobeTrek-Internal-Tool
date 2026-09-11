import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import { parsePdfPriceRows } from '../src/lib/price-list-import-service';

test('ordinary PDF tables import SKU, multiline product details and prices', async () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.text('Product Code', 20, 40);
  doc.text('Product Description', 80, 40);
  doc.text('QTY', 440, 40);
  doc.text('Unit Rate', 500, 40);
  doc.text('GT-01', 20, 70);
  doc.text('Core Cutter Apparatus, Field Density - Core Cutter Method', 80, 70);
  doc.text('Supplied complete with rammer, weight approx 9kg.', 80, 84);
  doc.text('1', 440, 70);
  doc.text('3,000.00', 500, 70);
  doc.text('2', 20, 110);
  doc.text('Marshall Stability Test Apparatus', 80, 110);
  doc.text('1,750.00', 500, 110);

  const rows = await parsePdfPriceRows(Buffer.from(doc.output('arraybuffer')));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    rowNumber: 2,
    sku: 'GT-01',
    name: 'Core Cutter Apparatus, Field Density - Core Cutter Method Supplied complete with rammer, weight approx 9kg.',
    price: 3000,
  });
  assert.equal(rows[1].sku, undefined);
  assert.equal(rows[1].name, 'Marshall Stability Test Apparatus');
  assert.equal(rows[1].price, 1750);
});

test('renamed non-PDF content is rejected before PDF.js processing', async () => {
  await assert.rejects(
    parsePdfPriceRows(Buffer.from('this is not a PDF')),
    /not a valid PDF/,
  );
});
