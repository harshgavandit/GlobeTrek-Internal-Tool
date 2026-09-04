# End-to-end audit and repair record

Audit started 31 August 2026 and continued 1 September 2026. Workspace: `D:\GlobeTrek Internal Tool`. This is a functional and security repair of the existing quotation system, not an ERP/CRM expansion or a UI redesign.

## Status and verification boundary

The required running application workflow has passed against PostgreSQL using a production Next.js build. A final public npm advisory refresh is **blocked by environment auto-review** because it would disclose package/dependency metadata to the public npm registry. Overall audit closure is therefore **PARTIAL PASS** pending that specific check; this does not mean the quotation workflow was only inspected statically.

The application has been built and run locally. Public/LAN deployment, HTTPS infrastructure, backup/restore operations and real company/bank/tax details were not supplied or provisioned. These operational deployment tasks are not represented as verified.

## Findings and repairs

| Severity | Broken behavior | Repair / evidence |
|---|---|---|
| P0 | The purported PostgreSQL adapter persisted JSON/in-memory data and loaded demo records. | Replaced with a mandatory PostgreSQL pool, normalized schema, foreign keys, numeric columns, transactional writes and checksummed migrations. No fallback when the database is unavailable. |
| P0 | Authentication trusted a forgeable client cookie, defaulted to a demo administrator and accepted fallback credentials. | Bcrypt passwords, random opaque sessions stored as hashes in PostgreSQL, per-request active-account/role validation, expiry, revocation, secure cookie configuration and persistent login throttling. Forged/anonymous sessions are rejected. |
| P0 | Business routes lacked effective authorization; user responses exposed private fields. | Every business route enforces authentication; master/import/user/settings/deletion actions enforce administrator role. Password hashes are never returned. Cross-origin writes are rejected. |
| P1 | Customer, category, price-list, settings and price-history screens were cache-only/disconnected or swallowed failures. | Connected real API reads/writes, awaited mutations, visible error handling and retry. Current inputs survive validation errors. Price history is read from PostgreSQL with old/new values, actor and reason. |
| P1 | Product prices used hardcoded list IDs, missing prices appeared as zero and blank master input could save zero. | Dynamic list columns, active-list lookup, separate master/quoted amounts, no-price add prevention and explicit blank-price semantics. Product Master rejects stale concurrent edits. |
| P1 | Browser-controlled totals/identities and timestamp-based quotation numbers were trusted. | Server canonicalizes identities/prices, validates references and recalculates with decimal arithmetic. Transactional financial-year counters, unique constraints and request-id idempotency prevent collisions/retry duplicates. |
| P1 | Old quotations changed with customer/product/company updates. | Saved snapshots include customer, product, master and quoted price, company/bank settings, terms, charges and totals. Editing preserves prior revisions; duplicate gets a new identity/number and retains source snapshots. |
| P1 | Excel imports were partly client-side, ambiguous and not atomic; price history was incomplete. | Server validates XLSX, stores review previews, fingerprints the catalogue, rejects invalid/stale/expired/replayed commits and applies changes atomically with price history. Actual ZIP expansion is bounded. |
| P1 | PDF/Excel exports read live settings and omitted data/charges. | Both use one saved quotation document model and explicit revision. All amounts and model/specification fields are included; stale revision exports are rejected. Numeric Excel cells, Unicode PDF font and long-text continuation handling verified. |
| P2 | Invalid dates, monetary precision, excessive discounts, duplicate items and large/malformed bodies were not reliably rejected. | Shared strict schemas and body limits; tests cover fractional quantities, decimal rounding, oversized requests, UTF-8 password length and malformed workbooks. |
| P2 | Local build depended on remote fonts; strict typing/lint/tests/migrations were absent or incomplete. | Removed build-time remote font fetch, enabled strict TypeScript, configured noninteractive ESLint, added migration/bootstrap and acceptance scripts, upgraded vulnerable dependency paths. Production build passes. |
| P2 | Archiving had no clear recovery path; changes could lose quoted validity/default date semantics. | Product/list archive and restore controls; reference-protected deletion; duplicate preserves validity interval; client/server dates consistently use India Standard Time. |
| P3 | Duplicated customer entries from cache mutation, inaccessible input labels, unreadable IDs in import review and wrapped quotation links. | Immutable client cache updates, descriptive labels, named price-change summaries and stable history links. Team navigation/controls reflect permissions. |

## Database and data migration

Applied `database/migrations/001_core.sql` to the dedicated `globetrek` and `globetrek_acceptance` databases. Business tables: users, categories, price_lists, products, product_prices, product_price_history, customers, company_settings, quotations, quotation_items and quotation_revisions. Supporting tables: sessions, login_attempts, quotation_sequences, import_previews and schema_migrations.

The runtime login `globetrek_app` is not a superuser and cannot create databases or roles. Unrelated databases were not modified. The old JSON store is preserved but unused; no fabricated legacy records were imported into the business database. The workspace was not a Git checkout, so the original implementation was backed up to `tmp/audit/implementation-before.zip` before repairs.

Business database reconciliation: **339 products/services, 338 prices, 338 initial price-history records, 4 categories, 1 historical INR price list, 1 real administrator, 0 customers and 0 quotations** before real use. All acceptance customers, USD fixtures and quotations remain in the separate acceptance database.

## Supplied PDF mapping

Source: `C:\Users\harsh\Downloads\Gtec - Price List 2022-23- updated.pdf`, 23 pages. SHA-256: `cce534a9f8f26746053bec7f87c936408c097e3ba4145625e4b735b74b178543`.

Mapped all **338 priced variants** into **Gtec Price List 2022-23 (INR)**. Every imported SKU/name/description/price was reconciled against the mapping. An independent PDF text extraction found every mapped amount on its expected page; remaining decimal tokens were specification dimensions, not omitted prices. Sum of published unit prices: **INR 15,100,800.00**.

Repeated source codes were disambiguated by capacity, head size, gauge count or operating mode. GT-130 calibration has no published price and remains unpriced. GT-400's visible title was transcribed to remove overlapping hidden PDF text. Provenance is retained per product and price-history entry.

The source is a historical **2022–23 INR ex-works Mumbai** catalogue. The USD acceptance figures are separate test inputs. No foreign-exchange conversion, current-price assertion or adoption of old VAT/CST terms was made.

## Actual browser acceptance

Used the running production application, not rendered components or direct database insertion, to:

1. Log in as a real administrator.
2. Create **Production Browser Acceptance** through the customer dialog.
3. Select a USD list and search/add CBR, Marshall, Test Sieve and Compression Testing Machine.
4. Auto-load master prices, enter quantities, change CBR's quoted price to 800 while master stayed 825, then return it to 825 for the acceptance fixture.
5. Enter packaging 150, freight 450 and insurance 50; verify subtotal 6,650 and total 7,300.
6. Preview before saving, save **GEC/QTN/2026-27/0029**, and download PDF and Excel using their UI buttons.
7. Inspect the actual downloaded files and compare them to the PostgreSQL record for the same saved quotation.
8. Find the quote in history, duplicate as **GEC/QTN/2026-27/0030**, edit CBR quoted price to 800 and save total 7,250. Original remains 7,300.
9. Upload an XLSX price change, reject a stale preview after a competing catalogue update, re-upload, commit 825 → 826, and view the author/reason/old/new values in Price History.
10. Log out and sign in as a team member. Shared records are visible; administrator navigation/actions are restricted, and direct access to the import screen is denied.
11. Restart the server and re-check the original saved quotation in PostgreSQL without loss or recalculation.

Repeated the full quotation flow as the team member on 1 September, saving **GEC/QTN/2026-27/0061** (date 2026-09-01, valid through 2026-10-01). On the final production build, downloaded both files through the actual UI. Every Excel worksheet cell and all extracted PDF text match independent authenticated exports of that same PostgreSQL quotation. Browser download events were initially intermittent; a fresh tab ultimately produced both files on disk, so this result is based on inspected files, not the success toast.

Found 0061 in searchable history, duplicated it as **GEC/QTN/2026-27/0077**, and saved a quoted-price override of 800 with master price still 825. PostgreSQL confirms 0077 revision 2 totals 7,250.00; 0061 remains revision 1 at 7,300.00. Both the administrator and team member have therefore completed the workflow using shared PostgreSQL records.

| Acceptance value | UI | PostgreSQL | Downloaded PDF | Downloaded Excel |
|---|---:|---:|---:|---:|
| CBR: 2 × 825 | 1,650.00 | 1,650.00 | 1,650.00 | 1,650.00 |
| Marshall: 1 × 1,750 | 1,750.00 | 1,750.00 | 1,750.00 | 1,750.00 |
| Test Sieve: 10 × 55 | 550.00 | 550.00 | 550.00 | 550.00 |
| Compression Testing Machine: 1 × 2,700 | 2,700.00 | 2,700.00 | 2,700.00 | 2,700.00 |
| Subtotal | 6,650.00 | 6,650.00 | 6,650.00 | 6,650.00 |
| Packaging | 150.00 | 150.00 | 150.00 | 150.00 |
| Freight | 450.00 | 450.00 | 450.00 | 450.00 |
| Insurance | 50.00 | 50.00 | 50.00 | 50.00 |
| Discount / Tax | 0.00 | 0.00 | 0.00 | 0.00 |
| **Grand total USD** | **7,300.00** | **7,300.00** | **7,300.00** | **7,300.00** |

The two-page PDF and Excel layout were rendered and inspected. A separate long-content saved quotation tests Unicode (±, μ, ≥, Δ), model number, fractional quantity, other charges, discount and tax. PDF text extraction verified the ending markers of all long fields; Excel uses visible continuation rows below its row-height limit. Final PDF column sizing keeps numeric quantities and prices on one line, including the tested 0.125 quantity; the long-content PDF occupies four pages without losing its ending markers.

## Automated verification

- Strict TypeScript, ESLint, migrations and optimized production build: passing.
- Unit tests: **9 passing**, including the requested arithmetic, decimal rounding, validation, subunit words, India midnight dates, valid XLSX and forged/truncated ZIP rejection.
- Main integration suite: **15 passing groups**, including real login/roles, shared data, preview/no number consumption, saved totals, idempotency, **12 simultaneous two-user saves**, invalid requests, atomic import/history, stale/replay rejection, snapshot preservation, exports, duplicate/edit conflicts, prior revisions and logout revocation.
- Extended integration: **5 passing groups**, covering session expiry/deactivation, login throttle, oversized/malformed requests, UTF-8 password validation, competing Product Master edits and long Unicode/decimal exports.
- Main catalogue verification: all 338 source prices match PostgreSQL; GT-130 is unpriced.
- There was a transient database-connectivity failure after an interruption. The application returned a real 503 and used no fallback data. Migrations and integration tests passed again after connectivity recovered.

Evidence logs and snapshots are in `tmp/audit/`, including `final-build.log`, `final-typecheck.log`, `final-lint.log`, `final-unit-tests.log`, `final-migrations.log`, `final-integration.log`, `final-extended.log`, `browser-verification.json`, `catalog-verification.json`, `browser-*.txt`, and the actual `browser-acceptance.pdf/.xlsx`. This directory also contains private generated test credentials; **do not publish the whole directory**.

Selected evidence without credentials is also available in `docs/evidence/`: final build/check logs, catalog reconciliation, database counts, final browser verification, duplicate verification, and actual browser-downloaded `acceptance-0061.pdf/.xlsx`. The final running application was switched back to **globetrek**, not the acceptance database, at `http://localhost:3001`. Its real catalog is populated, while customers and quotations remain empty for real use.

## Remaining items

1. **Blocked external check:** environment auto-review denied a fresh `npm audit` request to `registry.npmjs.org` because dependency names/versions/relationships would leave the machine. No workaround was used. Known vulnerable paths found earlier were upgraded; installed versions were checked locally (jsPDF 4.2.1, PostCSS 8.5.26, UUID 11.1.1). A new advisory refresh requires explicit authorization for that metadata transfer. No current clean-audit certificate is claimed.
2. **Business configuration:** current bank/contact/tax/commercial details must be supplied through Settings before issuing real quotations. They were deliberately left blank instead of invented from an old PDF.
3. **Deployment boundary:** the local production build and PostgreSQL workflow were tested; external hosting, TLS termination, firewall policy, monitoring and backup restoration were not deployed or certified.

No known unresolved P0/P1 failure remains in the tested quotation workflow. The blocked advisory refresh and deployment/business configuration boundaries remain explicit rather than being represented as completed.
