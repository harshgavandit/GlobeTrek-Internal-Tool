UPDATE quotation_items AS item
SET snapshot = item.snapshot || jsonb_build_object(
  'product_name', product.name,
  'description', COALESCE(product.data->>'description', ''),
  'model_number', product.data->>'model_number'
)
FROM quotations AS quotation, products AS product
WHERE item.quotation_id = quotation.id
  AND item.product_id = product.id
  AND quotation.status = 'draft';

UPDATE quotations AS quotation
SET snapshot = jsonb_set(
      quotation.snapshot,
      '{items}',
      COALESCE((
        SELECT jsonb_agg(
          CASE WHEN product.id IS NULL THEN source.item ELSE source.item || jsonb_build_object(
            'product_name', product.name,
            'description', COALESCE(product.data->>'description', ''),
            'model_number', product.data->>'model_number'
          ) END ORDER BY source.position
        )
        FROM jsonb_array_elements(quotation.snapshot->'items') WITH ORDINALITY AS source(item, position)
        LEFT JOIN products AS product ON product.id::text = source.item->>'product_id'
      ), '[]'::jsonb)
    ),
    updated_at = clock_timestamp()
WHERE quotation.status = 'draft';

UPDATE quotation_revisions AS revision
SET snapshot = jsonb_set(
  revision.snapshot,
  '{items}',
  COALESCE((
    SELECT jsonb_agg(
      CASE WHEN product.id IS NULL THEN source.item ELSE source.item || jsonb_build_object(
        'product_name', product.name,
        'description', COALESCE(product.data->>'description', ''),
        'model_number', product.data->>'model_number'
      ) END ORDER BY source.position
    )
    FROM jsonb_array_elements(revision.snapshot->'items') WITH ORDINALITY AS source(item, position)
    LEFT JOIN products AS product ON product.id::text = source.item->>'product_id'
  ), '[]'::jsonb)
)
FROM quotations AS quotation
WHERE revision.quotation_id = quotation.id
  AND quotation.status = 'draft';
