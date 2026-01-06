-- Create private storage bucket for product files
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-files', 'product-files', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Only authenticated admins can upload/manage files
CREATE POLICY "Admins can manage product files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'product-files' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'product-files' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Policy: Service role can read files (for download edge function)
CREATE POLICY "Service role can read product files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'product-files'
);