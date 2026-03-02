
-- Fix storage policy for product-files to allow super_admin access
DROP POLICY IF EXISTS "Admins can manage product files" ON storage.objects;

CREATE POLICY "Admins can manage product files"
ON storage.objects
FOR ALL
USING (bucket_id = 'product-files' AND has_admin_access(auth.uid()))
WITH CHECK (bucket_id = 'product-files' AND has_admin_access(auth.uid()));
