UPDATE company_settings
SET data = data || jsonb_build_object(
  'company_name', 'GlobeTrek Engineering Corporation',
  'company_tagline', 'Engineering Corporation',
  'logo_path', '/brand/globetrek-logo.jpeg',
  'address', 'Office No. 2, Ground floor, Punit Tower 2, Plot No. 53, Sector 11, CBD Belapur, Navi Mumbai - 400614, India.',
  'email', 'globetrekengineering@gmail.com',
  'phone', '+91-9323627990 (WhatsApp)',
  'website', 'https://globetrekengg.com',
  'gstin', '27AAMFG8874A1Z4'
),
revision = revision + 1
WHERE id = 'company';
