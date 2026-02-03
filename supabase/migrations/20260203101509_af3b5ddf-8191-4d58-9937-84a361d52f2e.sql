-- Add optional audio_url column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS audio_url TEXT NULL;

-- Drop existing category check constraint if it exists
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;

-- Add updated category check constraint with 'audio-notes' category
ALTER TABLE public.products ADD CONSTRAINT products_category_check 
CHECK (category IN ('notes', 'mock-papers', 'pune-university', 'engineering', 'iit', 'combo-packs', 'others', 'audio-notes'));