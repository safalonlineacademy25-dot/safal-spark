
-- Create a public bucket for demo audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('demo-files', 'demo-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read demo files
CREATE POLICY "Anyone can view demo files"
ON storage.objects FOR SELECT
USING (bucket_id = 'demo-files');

-- Allow admins to manage demo files
CREATE POLICY "Admins can manage demo files storage"
ON storage.objects FOR ALL
USING (bucket_id = 'demo-files' AND has_admin_access(auth.uid()))
WITH CHECK (bucket_id = 'demo-files' AND has_admin_access(auth.uid()));
