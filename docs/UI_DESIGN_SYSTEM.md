# Globetrek interface conventions

The workspace uses the tokens in `src/app/globals.css` and the reusable controls in `src/components/ui` and `src/components/workspace`. Document previews and PDF, Excel, and Word templates retain their existing commercial layout.

## Visual hierarchy

- Use the neutral workspace background, white surfaces, blue primary actions, and semantic status colors. Avoid decorative gradients on operational screens.
- Use `PageHeader` for page titles and primary actions, `SectionHeader` for sections, and `FormField` for labeled inputs, help, and validation.
- Keep body text at 14px and compact desktop controls at 13px; small-screen inputs retain 16px text and touch-friendly heights. Use 11–12px for secondary metadata, not primary instructions.
- Use the shared spacing scale: 4px increments, 16–24px panel padding, and 20–28px between major sections. Surfaces use subtle borders and shadows.

## Navigation and tables

- Keep the sidebar grouped by task. Preserve role-aware navigation and route permissions.
- Use `DataTable` for searchable record lists: desktop columns, labeled mobile cards, sorting, record counts, and pagination.
- Keep filter controls together, provide clear-filter actions, and preserve loading, error, and empty states.
- Use native links for navigation and buttons for actions. Give every icon-only button a descriptive accessible name.

## Forms and responsive behavior

- Use multiline textareas for commercial clauses and other long text. Never abbreviate stored values to fit a control.
- Preserve field IDs, labels, `aria-describedby`, and invalid state through `FormField`.
- Use container-aware layouts for quotation items and search results. Controls must wrap rather than overflow narrow cards.
- Retain visible keyboard focus, adequate touch targets, reduced-motion support, safe-area padding, and the skip-to-content link.
- Keep sticky actions clear of content. The quotation footer must follow the current sidebar width.

## Change boundaries and verification

Interface changes must preserve request payloads, server validation, authentication, quotation calculations, and saved snapshots. Use existing callbacks and shared data rather than parallel UI persistence.

Run `npm run check` after a completed change set. Type-check, lint, and build do not establish visual or runtime end-to-end success; verify responsive and assistive-technology behavior separately when permitted.

## September 2026 refinement

- Neutral white navigation, 248px expanded / 72px collapsed sidebar, and a 60px header.
- Use restrained blue for primary actions; neutral borders and light surfaces organize content without decorative gradients.
- Keep record filters and tables in a single surface. Preserve mobile card views and accessible labels.
- The quotation builder uses a unified editing canvas with customer/format setup, product selection, editable items, and a separate pricing summary. The official document preview is not restyled.
