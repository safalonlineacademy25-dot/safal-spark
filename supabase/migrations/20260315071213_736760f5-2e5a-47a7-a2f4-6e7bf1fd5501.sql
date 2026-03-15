-- Purge test data before going live
-- This will clear all existing data from order-related tables

-- First, let's backup the count of records being deleted for logging purposes
DO $$
DECLARE
  orders_count INT;
  order_items_count INT;
  email_logs_count INT;
  download_tokens_count INT;
BEGIN
  SELECT COUNT(*) INTO orders_count FROM orders;
  SELECT COUNT(*) INTO order_items_count FROM order_items;
  SELECT COUNT(*) INTO email_logs_count FROM email_delivery_logs;
  SELECT COUNT(*) INTO download_tokens_count FROM download_tokens;
  
  RAISE NOTICE 'Purging data: orders=%, order_items=%, email_delivery_logs=%, download_tokens=%', 
    orders_count, order_items_count, email_logs_count, download_tokens_count;
END $$;

-- Delete from child tables first (respecting foreign key constraints)
DELETE FROM email_delivery_logs;
DELETE FROM order_items;
DELETE FROM download_tokens;
DELETE FROM orders;

-- Also clear other test data tables that might have test entries
DELETE FROM broadcast_logs;
DELETE FROM promotion_logs;
DELETE FROM refunds;

-- Reset any visitor stats test data (optional - uncomment if needed)
-- DELETE FROM visitor_stats;

-- Note: customers table is preserved as it might contain legitimate leads