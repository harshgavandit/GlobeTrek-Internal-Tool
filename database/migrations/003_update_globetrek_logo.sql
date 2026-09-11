UPDATE company_settings
SET data = jsonb_set(data, '{logo_path}', '"/brand/globetrek-new-logo.png"'::jsonb),
    revision = revision + 1
WHERE id = 'company'
  AND COALESCE(data->>'logo_path', '') IN ('', '/brand/globetrek-logo.jpeg');
