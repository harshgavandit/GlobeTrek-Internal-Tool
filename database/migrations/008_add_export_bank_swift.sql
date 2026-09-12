UPDATE company_settings
SET data = jsonb_set(
  data || jsonb_build_object('bank_swift', 'IDFBINBBMUM'),
  '{bank_accounts}',
  COALESCE((
    SELECT jsonb_agg(
      CASE
        WHEN account->>'ifsc' = 'IDFB0040172' THEN account || jsonb_build_object('swift', 'IDFBINBBMUM')
        ELSE account
      END
      ORDER BY ordinal
    )
    FROM jsonb_array_elements(COALESCE(data->'bank_accounts', '[]'::jsonb)) WITH ORDINALITY AS accounts(account, ordinal)
  ), '[]'::jsonb)
)
WHERE id = 'company';
