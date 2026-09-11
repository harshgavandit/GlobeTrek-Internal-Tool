WITH standard_company AS (
  SELECT jsonb_build_object(
    'terms_template_version', 'globetrek-2026-09',
    'gstin', '27AAMFG8874A1Z4',
    'bank_name', 'IDFC FIRST Bank',
    'bank_account_name', 'Globetrek Engineering Corporation',
    'bank_account_no', '10148119695',
    'bank_ifsc', 'IDFB0040172',
    'bank_branch', 'Navi Mumbai CBD Belapur Branch',
    'bank_accounts', jsonb_build_array(
      jsonb_build_object('bank_name', 'IDFC FIRST Bank', 'account_name', 'Globetrek Engineering Corporation', 'account_no', '10148119695', 'ifsc', 'IDFB0040172', 'branch', 'Navi Mumbai CBD Belapur Branch'),
      jsonb_build_object('bank_name', 'Indian Bank', 'account_name', 'Globetrek Engineering Corporation', 'account_no', '6209411911', 'ifsc', 'IDIB000N110', 'branch', 'Nerul, Nerul East, Navi Mumbai')
    )
  ) AS data
)
UPDATE quotation_revisions AS revision
SET snapshot = jsonb_set(
  revision.snapshot,
  '{company_snapshot}',
  COALESCE(revision.snapshot->'company_snapshot', '{}'::jsonb) || standard_company.data
)
FROM quotations AS quotation, standard_company
WHERE revision.quotation_id = quotation.id
  AND quotation.status = 'draft';

WITH standard_company AS (
  SELECT jsonb_build_object(
    'terms_template_version', 'globetrek-2026-09',
    'gstin', '27AAMFG8874A1Z4',
    'bank_name', 'IDFC FIRST Bank',
    'bank_account_name', 'Globetrek Engineering Corporation',
    'bank_account_no', '10148119695',
    'bank_ifsc', 'IDFB0040172',
    'bank_branch', 'Navi Mumbai CBD Belapur Branch',
    'bank_accounts', jsonb_build_array(
      jsonb_build_object('bank_name', 'IDFC FIRST Bank', 'account_name', 'Globetrek Engineering Corporation', 'account_no', '10148119695', 'ifsc', 'IDFB0040172', 'branch', 'Navi Mumbai CBD Belapur Branch'),
      jsonb_build_object('bank_name', 'Indian Bank', 'account_name', 'Globetrek Engineering Corporation', 'account_no', '6209411911', 'ifsc', 'IDIB000N110', 'branch', 'Nerul, Nerul East, Navi Mumbai')
    )
  ) AS data
)
UPDATE quotations AS quotation
SET snapshot = jsonb_set(
      quotation.snapshot,
      '{company_snapshot}',
      COALESCE(quotation.snapshot->'company_snapshot', '{}'::jsonb) || standard_company.data
    ),
    updated_at = clock_timestamp()
FROM standard_company
WHERE quotation.status = 'draft';
