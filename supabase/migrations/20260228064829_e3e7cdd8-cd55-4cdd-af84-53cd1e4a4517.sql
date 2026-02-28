
-- Add source_product_id to combo_pack_files to track which original product the file came from
ALTER TABLE public.combo_pack_files
ADD COLUMN source_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- Add source_product_id to product_audio_files to track which original product the file came from  
ALTER TABLE public.product_audio_files
ADD COLUMN source_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- Add source_product_name to combo_pack_files for display purposes (in case source product is deleted)
ALTER TABLE public.combo_pack_files
ADD COLUMN source_product_name text;

-- Add source_product_name to product_audio_files for display purposes
ALTER TABLE public.product_audio_files
ADD COLUMN source_product_name text;
