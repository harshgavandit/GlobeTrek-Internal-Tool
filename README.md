# Globetrek Internal Quotation Management System

Internal product, price-list, customer and quotation management using Next.js, TypeScript and PostgreSQL. PostgreSQL is mandatory: there is no file, browser-storage, demo-user or in-memory persistence fallback.

## Local setup

1. Install Node.js 22 or newer and PostgreSQL 16 or newer. The audited machine uses PostgreSQL 18.
2. Create a dedicated `globetrek` database and a login that can migrate and access **only this application's databases**. Do not run the application as the PostgreSQL superuser.
3. Copy `.env.local.example` to `.env.local` and set a real `DATABASE_URL`, canonical `APP_URL`, and initial `ADMIN_*` credentials. Keep this file private and out of source control.
4. Run:

```powershell
npm.cmd ci
npm.cmd run migrate
npm.cmd run bootstrap
npm.cmd run build
npm.cmd start -- --port 3001 --hostname 127.0.0.1
```

`bootstrap` creates an initial administrator with a bcrypt password; it refuses to overwrite an existing administrator. It inserts no customers, products, prices or quotations. On the audited machine the initial administrator's email and generated password are stored in `.env.local`; there is no universal/default password.

Open `http://localhost:3001`. Set company contact details, current tax identifiers, bank information and commercial defaults in **Settings**, then add team accounts in **Users**. Blank business details are intentionally not invented. Settings changes apply to new quotation snapshots, not previously saved quotations.

## Required workflow

Login → select/create customer → select price list → search/add products → review current master price → enter quantities/quoted prices → calculate → preview before save → save → download PDF and Excel → find in history → duplicate/edit later.

- Master prices come from the chosen active price list. Products without a price cannot be added; an absent price is never treated as zero.
- Quoted prices are independent from master prices. A price override does not modify Product Master.
- The server validates inputs and recalculates every save. Browser-supplied totals, product identities, user identity and quotation numbers are not trusted.
- Saved quotations include customer, product, master/quoted price, company/bank, commercial-term and total snapshots. Changing masters never rewrites these snapshots.
- Edits require the saved revision. Concurrent edits return HTTP 409 instead of overwriting each other. Product Master and company settings also reject stale edits.
- Duplicating keeps the source snapshots and validity interval, creates a new draft and assigns a new number. Review old commercial terms and prices before issuing a duplicate.
- Reference No is editable when creating or editing a quotation. Leave it blank on create for automatic numbering, or on edit to keep the current number. Reference numbers must be unique (case-insensitive), single-line and at most 100 characters. Automatic numbers are allocated transactionally per Indian financial year and skip numbers already entered manually. Duplicating assigns a fresh automatic number. New-save request IDs make retries idempotent.
- Product/price-list archiving preserves historical references; archived records can be restored. Customers referenced by quotations cannot be deleted. Quotation deletion is an administrator-only soft deletion; revisions remain in PostgreSQL.

## Customer enquiry reference

Quotation setup includes **Enquiry reference** and an optional **Enquiry date**. Enter, for example, `Your Email Enquiry` and `2026-04-14` to display **Ref: Your Email Enquiry Dt. Tuesday, April 14, 2026**. The bold, left-aligned row appears in the preview and saved PDF, Word, and Excel exports. The top Reference No shows the custom number entered in quotation setup, or the automatically generated number if left blank.

The date is independent of the quotation date and is never guessed. Both fields are saved in quotation/revision JSON snapshots and retained when editing or duplicating, so no database migration is needed. Existing quotations retain their reference text; if neither enquiry field is present, the Ref row uses the quotation number. Editing the enquiry fields preserves the historical customer contact snapshot.

## Calculations

Money and percentages accept at most two decimal places; quantity accepts three. All arithmetic uses `decimal.js`, with half-up rounding to two decimal places on each line and tax:

```text
Line total = round(quoted unit price × quantity × (1 − line discount % / 100), 2)
Subtotal = sum(rounded line totals)
Taxable amount = subtotal + packaging + freight + insurance + other charges − discount amount
Tax = round(taxable amount × tax % / 100, 2)
Grand total = taxable amount + tax
```

Negative values, invalid dates, duplicate lines, missing references, stale master prices, mismatched currencies and excessive discounts are rejected. This is a configurable quotation calculation, not tax-compliance advice. Confirm the appropriate tax rate and charge treatment for each commercial transaction.

The acceptance case is subtotal **USD 6,650.00**, packaging **150.00**, freight **450.00**, insurance **50.00**, discount/tax **0.00**, grand total **7,300.00**. PDF and Excel use the same saved quotation revision, never live master data. A stale export request returns 409. Excel contains numeric saved amounts rather than recalculating formulas. The PDF includes a bundled DejaVu font and its license in `assets/fonts`.

## Source PDF catalogue

The supplied **Gtec - Price List 2022-23- updated.pdf** is a historical **INR, ex-works Mumbai** price list. No USD conversion or assertion that these are current prices has been made. Its old VAT/CST and other legal terms are not copied into current settings.

`database/gtec-price-list-2022-23.json` contains 338 priced variants, source page/code references, a SHA-256 fingerprint and an unpriced GT-130 calibration service. Repeated printed codes have deterministic variant suffixes; no priced variant is overwritten. A hidden overlapping title on page 23 was corrected from the visible source. The sum of the 338 source unit prices is INR 15,100,800.00; this is a reconciliation checksum, not a quotation total.

```powershell
# The committed mapping can be imported without Python:
npm.cmd run prices:import-pdf
npm.cmd run prices:verify

# To re-extract the same source, install pdfplumber and run:
python scripts/map-price-pdf.py "C:\Users\harsh\Downloads\Gtec - Price List 2022-23- updated.pdf"
```

The importer requires `ADMIN_EMAIL` to identify a real administrator for the price audit trail. It writes the named historical list transactionally. Re-running it deliberately reconciles that list back to the supplied source; use a separate price list for newer prices.

## Excel import

Administrators download the current template from **Import**. Supported format: one unencrypted `.xlsx` worksheet, at most 2,000 product rows, 50 columns, 5 MB compressed and 30 MB expanded.

Required columns: `SKU`, `Product Name`. Optional columns: `Model No`, `Category`, `Description`. Price columns must exactly match an active list, for example `Export USD (USD)`. Use numeric cells for prices. Blank price cells leave existing prices unchanged and do not create zero-price records. Formula, hyperlink/rich-text cells, unknown/duplicate headers, duplicate SKUs, invalid numbers and inactive products are rejected.

Upload → inspect the row-level diff → commit. Preview is stored in PostgreSQL and changes no catalogue data. Commit is all-or-nothing, records price history, belongs to the previewing administrator, expires after 30 minutes, cannot be replayed, and refuses to proceed if the catalogue changed after preview. Re-upload after a conflict. The archive validator bounds actual decompression, not only declared ZIP sizes.

## New price-list import

Administrators can create an entire price list directly from **Price Lists → Import Price List**. The import accepts one `.xlsx` workbook or one text-based `.pdf`, up to 5 MB. The new list's name, currency and optional description are entered before upload.

- Excel needs `Product Name` and `Price`; `SKU`/`Code`, `Category`, `Model No` and `Description` are optional. A missing SKU receives a stable import SKU so the product remains editable and traceable.
- PDF import reads selectable text only. Each recognized row needs SKU, product name and a final price column, either separated by `|` or by spaced columns. Image-only/scanned PDFs are rejected because the system never guesses product data from OCR.
- The preview identifies new products, category/detail updates and every new master price. Saving takes the catalog lock, creates the price list and any required products/categories in one PostgreSQL transaction, and records a `product_price_history` entry for each price. Existing quotations are not changed.

## Permissions and security

| Capability | Administrator | Team member |
|---|---|---|
| Read products/prices/customers/quotes | Yes | Yes |
| Create/edit customers and quotations; duplicate/export | Yes | Yes |
| Manage products/categories/price lists/imports | Yes | No |
| Manage users/company settings | Yes | No |
| Delete customers/quotations | Yes | No |

Permissions are enforced on the server. Sessions are random 256-bit tokens; only token hashes are stored in PostgreSQL. Each request checks session expiry, the active account and its current role. Sessions expire after 12 hours and are revoked on logout/deactivation. Cookies are HttpOnly/SameSite Lax and Secure when HTTPS is configured. Passwords use bcrypt cost 12, with a 12-character minimum and 72-byte maximum. Login attempts are limited per account in PostgreSQL. User APIs never return password hashes. Cross-origin writes, oversized bodies and unvalidated identifiers are rejected.

For deployment:

- Use an HTTPS canonical `APP_URL`. Production login refuses non-HTTPS URLs except loopback for local verification. Terminate TLS at a correctly configured reverse proxy; do not expose the database publicly.
- Set `PGSSL=require` for a remote database with a trusted CA. Never disable certificate verification or use `sslmode=no-verify`. Keep credentials in the hosting platform's secret store.
- Run migrations before starting each release. Migrations are checksummed and serialized; do not edit an applied migration.
- Include the `assets/fonts` directory in deployment. Next's export route tracing includes it.
- Use a process manager/service with restart monitoring and restrict network access to intended employees.
- Back up PostgreSQL, protect backups and test restoration. Retain quotation revisions/price history according to business policy. Periodically remove expired sessions, old login-attempt windows and expired/uncommitted import previews; these are operational records, not quotation history.
- Complete and verify current company/bank/tax/commercial settings before sending real quotations. Local build verification does not constitute deployment, TLS, backup or infrastructure certification.

Historical scaffolding in `build_scripts/` and `tools/` is not part of the application build and must not be used to regenerate the repaired system. The old `.data` JSON file is preserved as an unused backup; the application never reads it.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run migrate
npm.cmd run build
```

Integration tests must never target production. Create an empty database named `globetrek_acceptance` owned by an appropriate test login. Optionally set `TEST_DATABASE_URL` and `TEST_APP_URL`, then:

```powershell
npm.cmd run test:setup
npm.cmd run test:server       # separate terminal; uses the production build
npm.cmd run test:integration
npm.cmd run test:extended
```

Test credentials and artifacts are in ignored `tmp/audit/`. `test:setup` retains an existing credentials file; do not delete that file while retaining its generated test users. The tests use real HTTP routes, bcrypt sessions and PostgreSQL, with disposable acceptance products/customers only in the isolated database. They verify calculation/persistence, authorization, concurrency, snapshots, import/replay/conflict handling, saved exports, expiry/deactivation and request limits. The actual browser workflow and downloaded-file verification are recorded in `docs/AUDIT_REPORT.md`.
