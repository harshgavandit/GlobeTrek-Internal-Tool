UPDATE company_settings
SET data = jsonb_set(data, '{quotation_prefix}', '"GTEC/QTN"'::jsonb),
    revision = revision + 1
WHERE id = 'company'
  AND COALESCE(data->>'quotation_prefix', 'GEC/QTN') = 'GEC/QTN';

UPDATE quotation_revisions AS revision
SET snapshot = jsonb_set(
  revision.snapshot,
  '{quotation_number}',
  to_jsonb(regexp_replace(revision.snapshot->>'quotation_number', '^GEC/QTN/', 'GTEC/QTN/'))
)
FROM quotations AS quotation
WHERE revision.quotation_id = quotation.id
  AND quotation.status = 'draft'
  AND quotation.quotation_number LIKE 'GEC/QTN/%'
  AND NOT EXISTS (
    SELECT 1
    FROM quotations AS conflicting
    WHERE conflicting.quotation_number = regexp_replace(quotation.quotation_number, '^GEC/QTN/', 'GTEC/QTN/')
  );

UPDATE quotations AS quotation
SET quotation_number = regexp_replace(quotation.quotation_number, '^GEC/QTN/', 'GTEC/QTN/'),
    snapshot = jsonb_set(
      quotation.snapshot,
      '{quotation_number}',
      to_jsonb(regexp_replace(quotation.snapshot->>'quotation_number', '^GEC/QTN/', 'GTEC/QTN/'))
    ),
    updated_at = clock_timestamp()
WHERE quotation.status = 'draft'
  AND quotation.quotation_number LIKE 'GEC/QTN/%'
  AND NOT EXISTS (
    SELECT 1
    FROM quotations AS conflicting
    WHERE conflicting.quotation_number = regexp_replace(quotation.quotation_number, '^GEC/QTN/', 'GTEC/QTN/')
  );
