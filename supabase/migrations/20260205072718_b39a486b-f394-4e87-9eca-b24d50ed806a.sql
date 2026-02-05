-- Create a new table for product audio files (similar to combo_pack_files)
CREATE TABLE public.product_audio_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_product_audio_files_product_id ON public.product_audio_files(product_id);

-- Enable Row Level Security
ALTER TABLE public.product_audio_files ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage product audio files"
ON public.product_audio_files FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for service role access (for edge functions)
CREATE POLICY "Service role can read product audio files"
ON public.product_audio_files FOR SELECT
USING (true);

-- First, update existing combo-packs products to 'others' category
UPDATE public.products SET category = 'others' WHERE category = 'combo-packs';

-- Drop old constraint if it exists
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;

-- Add new category constraint without combo-packs
ALTER TABLE public.products ADD CONSTRAINT products_category_check 
CHECK (category IN ('notes', 'mock-papers', 'pune-university', 'mumbai-university', 'engineering', 'iit', 'audio-notes', 'others'));