# Enterprise UI refinement — 26 September 2026

## Scope

Presentation-only changes across login, dashboard, navigation, quotation creation/editing/history/details, catalog, customers, settings, users, import screens, and shared UI primitives. Existing API/auth/database/calculation/export code remains unchanged. No deployment or production data mutation was performed.

## Browser evidence

Verified the changed local application at localhost:3100 in Chrome with existing PostgreSQL data. Initial sign-in failed because Docker PostgreSQL was stopped; after the user started Docker, the original connection and sign-in succeeded without configuration changes.

- Login: desktop and mobile rendering, labels, existing sign-in flow.
- Dashboard: loaded real counts/quotation records, desktop visual review, mobile card representation.
- Builder: customer picker keyboard Enter selection, product search GT-01, quantity increment to 2, add product, master/quoted fields, packing 150, remove discount, additional clause inputs, unsaved preview. Displayed subtotal INR 6,000 and total INR 6,150. Preview opened with the existing official template and quantity 2.
- Mobile builder: measured viewport/document width 389/389; wrapped product and line-item controls, fixed summary link, preview dialog within viewport.
- Navigation: mobile drawer opened and navigated to Products.
- Products: desktop table/mobile cards, search input, add-product dialog, category navigation.
- Categories: desktop visual review; measured mobile viewport/document width 389/389.
- Import products: desktop visual review, upload instructions/progress; measured mobile width 389/389. No file import executed.
- Price lists: loaded table and opened import dialog; measured mobile width 389/389. Stable modal bounds were within viewport. Screenshot capture was intermittently unreliable during viewport changes.
- Customers: loaded table and opened labeled Add Customer form; mobile viewport/document width 389/389. No customer saved.

Viewport overrides were requested at desktop/laptop and mobile sizes. Chrome zoom meant actual CSS widths differed; figures above are measured CSS widths, not assumed device widths.

## Remaining verification

Browser automation was stopped by an automatic-approval usage-limit rejection. Do not interpret it as an application error. Full browser review of settings, users, quotation history/details/edit, console-error audit, keyboard focus walkthrough and exhaustive accessibility checks remains pending. The final viewport reset could not be performed after the tool was blocked.

No saved-record mutation, quotation persistence regression, import commit, or PDF/Excel/Word parity test was performed in this UI-only pass. Existing document preview and export implementations were not changed.

## Automated checks

npm run check completed with exit code 0: TypeScript type-check, ESLint and production Next.js build all passed. All 18 static pages generated. Node emitted a non-fatal experimental localStorage warning during page-data collection; this was not a failed check. git diff --check passed. Source diff review found no changes under src/lib, src/app/api, migrations or dependency manifests.
