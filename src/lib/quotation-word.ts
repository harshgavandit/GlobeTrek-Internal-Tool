import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  type IRunOptions,
  type ITableCellBorders,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { Quotation } from '@/types';
import { quotationTotalRows } from './quotation-commercial';
import { numberToWords } from './number-to-words';
import { productDescriptionDetail } from './product-description';
import { quotationBankAccounts, quotationTermSections } from './quotation-terms';
import { quotationEnquiryReference } from './quotation-reference';

const NAVY = '142E4A';
const BLUE = '0270C7';
const WHITE = 'FFFFFF';
const BLACK = '000000';
const PALE_BLUE = 'F4F8FC';
const GRID = '808080';
const CONTENT_WIDTH = 10466;
const FONT = 'Arial';

const border = { style: BorderStyle.SINGLE, size: 4, color: GRID };
const borders: ITableCellBorders = { top: border, bottom: border, left: border, right: border };
const noBorder: ITableCellBorders = {
  top: { style: BorderStyle.NIL, size: 0, color: WHITE },
  bottom: { style: BorderStyle.NIL, size: 0, color: WHITE },
  left: { style: BorderStyle.NIL, size: 0, color: WHITE },
  right: { style: BorderStyle.NIL, size: 0, color: WHITE },
};

function run(text: string, options: Omit<IRunOptions, 'text'> = {}) {
  return new TextRun({ text, font: FONT, size: 19, color: BLACK, ...options });
}

function paragraph(
  text: string,
  options: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; before?: number; after?: number } = {},
) {
  return new Paragraph({
    alignment: options.align,
    spacing: { before: options.before ?? 0, after: options.after ?? 80, line: 250 },
    children: [run(text, { bold: options.bold })],
  });
}

function textCell(
  children: Paragraph[] | string,
  options: { width?: number; fill?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean; color?: string; borders?: typeof borders } = {},
) {
  const paragraphs = typeof children === 'string'
    ? [new Paragraph({
        alignment: options.align,
        spacing: { before: 40, after: 40, line: 230 },
        children: [run(children, { bold: options.bold, color: options.color ?? BLACK })],
      })]
    : children;
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    borders: options.borders ?? borders,
    shading: options.fill ? { type: ShadingType.CLEAR, fill: options.fill, color: 'auto' } : undefined,
    children: paragraphs,
  });
}

function headerCell(label: string, width: number) {
  return textCell(label, { width, fill: NAVY, align: AlignmentType.CENTER, bold: true, color: WHITE });
}

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function readLogo() {
  try {
    return await readFile(path.join(process.cwd(), 'public', 'brand', 'globetrek-new-logo.png'));
  } catch {
    return undefined;
  }
}

function productDescription(quotation: Quotation, item: Quotation['items'][number]) {
  const children: TextRun[] = [run(item.product_name, { bold: true })];
  if (item.model_number?.trim()) children.push(run(`\nModel: ${item.model_number.trim()}`, { break: 1 }));
  const detail = productDescriptionDetail(item.product_name, item.description);
  if (detail) children.push(run(detail, { break: 1 }));
  if (item.sku) children.push(run(`Code: ${item.sku}`, { break: 1, color: '52657A', size: 17 }));
  return new Paragraph({ spacing: { before: 30, after: 30, line: 245 }, children });
}

function documentHeader(quotation: Quotation, logo?: Buffer) {
  const leftChildren = logo
    ? [new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new ImageRun({ data: logo, type: 'png', transformation: { width: 245, height: 88 } })],
      })]
    : [paragraph(quotation.company_snapshot.company_name, { bold: true })];
  const table = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [
      textCell(leftChildren, { width: 6500, borders: noBorder }),
      textCell([new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 250, after: 0 },
        children: [run('SALES QUOTATION', { bold: true, size: 32 })],
      })], { width: 3966, borders: noBorder }),
    ] })],
  });
  return new Header({
    // Word can clip a table that is the first node of an automatically repeated header.
    children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [run('', { size: 2 })] }), table, new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: NAVY } },
      spacing: { before: 0, after: 100 },
    })],
  });
}

function documentFooter(quotation: Quotation) {
  const company = quotation.company_snapshot;
  const contact = [
    company.address,
    `Mobile - ${company.phone}`,
    `Email - ${company.email}${company.website ? `  Web - ${company.website}` : ''}`,
  ].filter(Boolean).join('\n');
  return new Footer({ children: [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({ children: [textCell([
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 30, after: 20, line: 190 },
          children: [run(contact, { color: WHITE, bold: true, size: 14 })],
        }),
      ], { width: CONTENT_WIDTH, fill: NAVY, borders: noBorder })] })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 20, after: 0 },
      children: [run('Page ', { size: 14, color: '5C6773' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 14, color: '5C6773' })],
    }),
  ] });
}

function productTable(quotation: Quotation) {
  const widths = [650, 5680, 850, 1550, 1736];
  const rows = [new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      headerCell('Sr.\nNo.', widths[0]),
      headerCell('PRODUCT DESCRIPTION', widths[1]),
      headerCell('QTY', widths[2]),
      headerCell(`UNIT COST EX-WORKS MUMBAI IN ${quotation.currency}`, widths[3]),
      headerCell(`TOTAL AMOUNT ${quotation.currency}`, widths[4]),
    ],
  })];
  quotation.items.forEach((item, index) => rows.push(new TableRow({
    cantSplit: true,
    children: [
      textCell(String(index + 1).padStart(2, '0'), { width: widths[0], align: AlignmentType.CENTER }),
      textCell([productDescription(quotation, item)], { width: widths[1] }),
      textCell(String(item.quantity), { width: widths[2], align: AlignmentType.CENTER }),
      textCell(money(item.unit_price, quotation.currency), { width: widths[3], align: AlignmentType.RIGHT }),
      textCell(money(item.line_total, quotation.currency), { width: widths[4], align: AlignmentType.RIGHT, bold: true }),
    ],
  })));
  for (const [label, value] of quotationTotalRows(quotation)) {
    rows.push(new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          columnSpan: 4,
          margins: { top: 70, bottom: 70, left: 100, right: 100 },
          borders,
          shading: label === 'Grand Total' ? { type: ShadingType.CLEAR, fill: PALE_BLUE, color: 'auto' } : undefined,
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(label, { bold: true })] })],
        }),
        textCell(money(value, quotation.currency), { width: widths[4], align: AlignmentType.RIGHT, bold: true, fill: label === 'Grand Total' ? PALE_BLUE : undefined }),
      ],
    }));
  }
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows,
  });
}

function bankDetailsTable(quotation: Quotation) {
  const accounts = quotationBankAccounts(quotation);
  if (!accounts.length) return undefined;
  const rows: TableRow[] = [];
  for (let index = 0; index < accounts.length; index += 2) {
    const pair = accounts.slice(index, index + 2);
    const lines = [
      pair.map(account => `For Credit to - ${account.account_name || quotation.company_snapshot.company_name}`),
      pair.map(account => `Bank Name: ${account.bank_name}`),
      pair.map(account => `Account No: ${account.account_no}`),
      pair.map(account => `IFSC Code: ${account.ifsc}`),
      pair.map(account => account.branch ? `Branch: ${account.branch}` : ''),
      pair.map(account => account.swift ? `SWIFT: ${account.swift}` : ''),
    ].filter(values => values.some(Boolean));
    lines.forEach((values, rowIndex) => rows.push(new TableRow({
      cantSplit: true,
      children: [
        textCell(values[0] ?? '', { width: CONTENT_WIDTH / 2, bold: rowIndex === 0 }),
        textCell(values[1] ?? '', { width: CONTENT_WIDTH / 2, bold: rowIndex === 0 }),
      ],
    })));
  }
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, layout: TableLayoutType.FIXED, rows });
}

function termsContent(quotation: Quotation) {
  const result: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.CLEAR, fill: NAVY, color: 'auto' },
      spacing: { before: 220, after: 140 },
      children: [run('TERMS & CONDITIONS', { bold: true, color: WHITE, size: 21 })],
    }),
  ];
  for (const section of quotationTermSections(quotation)) {
    result.push(new Paragraph({
      keepNext: true,
      spacing: { before: 150, after: 55 },
      children: [run(quotation.quotation_type === 'export'
        ? `${section.number})${section.title}`
        : `${section.number}. ${section.title}:`, { bold: true, size: 21 })],
    }));
    section.bullets.forEach(bullet => result.push(new Paragraph({
      bullet: quotation.quotation_type === 'export' ? undefined : { level: 0 },
      indent: quotation.quotation_type === 'export' ? { left: 360 } : undefined,
      spacing: { before: 20, after: 55, line: 250 },
      children: [run(bullet)],
    })));
    if (quotation.quotation_type !== 'export' && section.number === 10) {
      const banks = bankDetailsTable(quotation);
      if (banks) {
        result.push(paragraph('Bank Details:', { bold: true, before: 100, after: 70 }));
        result.push(banks);
      }
    }
  }
  return result;
}

export async function renderQuotationWord(quotation: Quotation) {
  const logo = await readLogo();
  const customerLines = [
    quotation.customer_name,
    quotation.customer_contact_person ? `Attn: ${quotation.customer_contact_person}` : '',
    quotation.customer_address ?? '',
    [quotation.customer_city, quotation.customer_country].filter(Boolean).join(', '),
    quotation.customer_phone ? `Contact: ${quotation.customer_phone}` : '',
    quotation.customer_email ? `Email: ${quotation.customer_email}` : '',
  ].filter(Boolean);
  const intro: (Paragraph | Table)[] = [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({ children: [
        textCell(`REFERENCE NO- ${quotation.quotation_number}`, { width: CONTENT_WIDTH / 2, bold: true, borders: noBorder }),
        textCell(`DATE: ${quotation.quotation_date}`, { width: CONTENT_WIDTH / 2, bold: true, align: AlignmentType.RIGHT, borders: noBorder }),
      ] })],
    }),
    paragraph('To,', { bold: true, before: 130, after: 50 }),
    ...customerLines.map((line, index) => paragraph(line, { bold: index === 0, after: 20 })),
  ];
  intro.push(paragraph(`Ref: ${quotationEnquiryReference(quotation)}`, { bold: true, before: 240, after: 240 }));
  intro.push(paragraph('Dear Sir,', { bold: true, before: 80, after: 80 }));
  intro.push(paragraph('With reference to above, we are pleased to submit our quotation as follows.', { bold: true, after: 150 }));

  const closing = [
    paragraph(`Amount in Words: ${numberToWords(quotation.total_amount, quotation.currency)}`, { bold: true, before: 130, after: 120 }),
    ...termsContent(quotation),
    paragraph('If you require any further clarification or additional information, please feel free to contact us at your convenience.', { before: 220, after: 100 }),
    paragraph('Thanking you, and always assuring you of our best services and attention, we remain.', { after: 180 }),
    paragraph('Yours faithfully,', { bold: true, after: 420 }),
    paragraph(quotation.created_by_name, { bold: true, after: 30 }),
    paragraph('Authorized Representative', { after: 30 }),
    paragraph(`Contact: ${quotation.company_snapshot.phone}`, { after: 30 }),
    paragraph(quotation.company_snapshot.company_name, { bold: true }),
  ];

  const document = new Document({
    creator: quotation.created_by_name,
    title: `${quotation.quotation_number} - ${quotation.customer_name}`,
    description: `${quotation.quotation_type === 'export' ? 'Export' : 'Indian'} quotation generated from saved revision ${quotation.revision}`,
    evenAndOddHeaderAndFooters: true,
    styles: {
      default: {
        document: { run: { font: FONT, size: 19, color: BLACK }, paragraph: { spacing: { line: 250, after: 80 } } },
      },
    },
    sections: [{
      properties: {
        titlePage: true,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1450, right: 720, bottom: 1200, left: 720, header: 300, footer: 320 },
        },
      },
      headers: {
        default: documentHeader(quotation, logo),
        first: documentHeader(quotation, logo),
        even: documentHeader(quotation, logo),
      },
      footers: {
        default: documentFooter(quotation),
        first: documentFooter(quotation),
        even: documentFooter(quotation),
      },
      children: [...intro, productTable(quotation), ...closing],
    }],
  });
  return new Uint8Array(await Packer.toBuffer(document));
}
