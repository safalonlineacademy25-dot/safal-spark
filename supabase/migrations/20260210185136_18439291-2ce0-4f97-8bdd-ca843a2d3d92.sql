
-- Drop existing FK constraints and re-add with ON DELETE CASCADE

ALTER TABLE combo_pack_files
  DROP CONSTRAINT combo_pack_files_product_id_fkey;

ALTER TABLE combo_pack_files
  ADD CONSTRAINT combo_pack_files_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE product_audio_files
  DROP CONSTRAINT product_audio_files_product_id_fkey;

ALTER TABLE product_audio_files
  ADD CONSTRAINT product_audio_files_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Also cascade for order_items, download_tokens, email_delivery_logs referencing products
ALTER TABLE order_items
  DROP CONSTRAINT order_items_product_id_fkey;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE download_tokens
  DROP CONSTRAINT download_tokens_product_id_fkey;

ALTER TABLE download_tokens
  ADD CONSTRAINT download_tokens_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE email_delivery_logs
  DROP CONSTRAINT email_delivery_logs_product_id_fkey;

ALTER TABLE email_delivery_logs
  ADD CONSTRAINT email_delivery_logs_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
