# Quotation reference verification

Verified on 8 October 2026. Implementation is in the local checkout; the hosted Render service was not deployed in this task.

## User workflow

In New quotation or Edit draft, the Customer & commercial setup section now contains:

- **Reference No**: enter a custom quotation number. Leave it blank on creation for automatic numbering; leave it blank while editing to retain the existing number.
- **Enquiry reference**: defaults to `Your Email Enquiry` for new quotations. Existing enquiry text remains editable.
- **Enquiry date**: optional and independent of the quotation date. It has no guessed default.

Entering `Your Email Enquiry` and `2026-04-14` produces **Ref: Your Email Enquiry Dt. Tuesday, April 14, 2026** in bold, left-aligned, with surrounding whitespace. The same formatter is used by the live form summary, document preview, Indian/export PDF, Word, and Excel.

Custom quotation numbers are trimmed, single-line, at most 100 characters, and checked case-insensitively for conflicts. The database quotation number and saved snapshot are updated together. Historical revisions preserve the prior number and enquiry details. Duplicates receive a new automatic number and retain their source enquiry details. Automatic numbering skips numbers already entered manually.

Both enquiry fields use the existing quotation and revision JSON snapshots; no schema migration or rewrite of existing quotations is needed. The customer snapshot whitelist prevents existing customer details from overwriting newly edited enquiry fields.

## Verification results

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| ESLint | PASS |
| Unit tests | PASS: 25 of 25 |
| Production build | PASS: compilation, type/lint checks and all 18 static pages |
| Focused database/API acceptance | PASS: 11 checks in `tmp/audit/quotation-reference/results.json` |
| Production runtime smoke | PASS: saved custom number/date and PDF, Word, Excel export responses; stale export returned 409 |
| Browser edit, save and reload | PASS: custom `GTEC/UI/2026-27/0001`, enquiry `Your Email Enquiry`, date `2026-04-14`, saved revision 3 |
| New form defaults | See browser evidence recorded separately if available |
| PDF content and visual inspection | PASS for the Ref row: all eight pages of saved, edited, export-template and long-reference samples inspected |
| Word export structure | PASS: saved number/text, bold run and paragraph spacing in OOXML |
| Word page rendering | Unavailable: the Windows workspace dependency bundle contains no LibreOffice/Word renderer; no rendered Word layout claim |
| Excel export | PASS: saved formatted Ref text and bold cell style |
| Hosted service / Neon mutations | None |

All database test writes used the existing local `globetrek_acceptance` database. Tests created their own customer/quotation records, preserved existing business data, and checked preview without persistence, idempotent retries, database/snapshot parity, editing, revision history, immutable customer details, duplication, concurrency, invalid dates, duplicate numbers and automatic-number collisions.

Browser date automation required native keyboard input because a synthetic fill changed the date element without updating React state. Automatic approval review blocked a save while the field and preview disagreed. The exact date was then verified in both the native field and live preview before a successful save. Reload and the production runtime independently confirmed `2026-04-14`. No application date workaround or security bypass was introduced.

The browser download-event capture timed out. Authenticated export requests independently returned valid PDF, Word and Excel files from the saved revision, including in the production build. Browser-download capture is not included in the successful proof.

## Evidence and reproduction

- `docs/evidence/quotation-reference-browser-saved.png`: saved browser preview.
- `tmp/audit/quotation-reference/results.json`: focused acceptance report.
- `tmp/audit/quotation-reference/production-results.json`: production runtime/export proof.
- `tmp/audit/quotation-reference/{saved,edited,export-template,long-reference}.*`: generated test exports and PDF render/text evidence. These remain ignored test artifacts.
- `tests/quotation-reference.test.ts`: date formatting, legacy fallback, validation and number boundaries.
- `scripts/verify-quotation-reference.ts`: database/API acceptance workflow.

Start a local server with `DATABASE_URL` pointing to the isolated database represented in ignored `tmp/audit/test-env.json`. The acceptance script refuses a database other than local `globetrek_acceptance` and refuses a non-loopback app URL.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
# With the isolated local acceptance app running on port 3003:
npm.cmd run test:quotation-reference
# For a different local acceptance port:
$env:REFERENCE_TEST_APP_URL = 'http://localhost:3004'
npm.cmd run test:quotation-reference
```

The existing unrelated change to `src/app/(dashboard)/products/import/page.tsx` was retained.
