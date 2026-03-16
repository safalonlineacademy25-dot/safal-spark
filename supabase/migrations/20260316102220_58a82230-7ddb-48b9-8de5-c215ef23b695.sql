
-- Step 1: Delete download tokens (references products and orders)
DELETE FROM download_tokens;

-- Step 2: Delete combo pack files (references products)
DELETE FROM combo_pack_files;

-- Step 3: Delete product audio files (references products)
DELETE FROM product_audio_files;

-- Step 4: Nullify product references in order_items (keep order history)
UPDATE order_items SET product_id = NULL;

-- Step 5: Delete all products
DELETE FROM products;
