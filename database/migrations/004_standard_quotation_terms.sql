UPDATE company_settings
SET data = data || jsonb_build_object(
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
  ),
  'payment_terms_default', E'100% payment is required against the proforma invoice prior to dispatch.\nPayments can be made via bank transfer or cash, as per the bank details provided below.',
  'delivery_terms_default', E'Delivery shall be made from available stock or within 1 to 2 weeks from the date of receipt of a technically and commercially clear firm order in writing.\nFor specific delivery schedules, kindly contact us directly.',
  'warranty_terms_default', E'The instrument is covered under a one-year warranty from the date of delivery, against manufacturing defects when operated under normal working conditions.\nThe warranty does not cover damages resulting from: Power fluctuations, Improper earthing, Incorrect operation, Overloading, Misuse, negligence, or external damages, Etc.',
  'validity_days_default', 30,
  'freight_terms_default', E'Freight, insurance, and all transit-related charges shall be borne by the buyer.\nUnless otherwise specified, shipments will be dispatched via the nearest and most reliable transporter or courier on a Freight-to-Pay basis.\nIf the buyer wishes to utilize a specific transporter or courier, the same must be clearly mentioned in the Purchase Order with relevant details.',
  'default_notes', 'All clerical, typographical, or calculation errors are subject to correction without prior notice.'
),
revision = revision + 1
WHERE id = 'company';
