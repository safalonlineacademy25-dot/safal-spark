-- Add "Combo Packs" category to the products constraint
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.products ADD CONSTRAINT products_category_check 
  CHECK (category IN ('notes', 'mock-papers', 'pune-university', 'engineering', 'iit', 'others', 'combo-packs'));

-- Create table for combo pack files (multiple files per product)
CREATE TABLE public.combo_pack_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on combo_pack_files
ALTER TABLE public.combo_pack_files ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read combo pack files (for delivery)
CREATE POLICY "Combo pack files are viewable by authenticated admins"
  ON public.combo_pack_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins can manage combo pack files
CREATE POLICY "Admins can insert combo pack files"
  ON public.combo_pack_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update combo pack files"
  ON public.combo_pack_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete combo pack files"
  ON public.combo_pack_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_combo_pack_files_product_id ON public.combo_pack_files(product_id);
CREATE INDEX idx_combo_pack_files_order ON public.combo_pack_files(product_id, file_order);