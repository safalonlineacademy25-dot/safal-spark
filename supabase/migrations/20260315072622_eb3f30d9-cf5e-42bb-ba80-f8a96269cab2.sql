
-- Clear all product-related data (DB records only)
-- 1. Delete combo pack file references
DELETE FROM combo_pack_files;

-- 2. Delete product audio file references  
DELETE FROM product_audio_files;

-- 3. Delete all products
DELETE FROM products;
