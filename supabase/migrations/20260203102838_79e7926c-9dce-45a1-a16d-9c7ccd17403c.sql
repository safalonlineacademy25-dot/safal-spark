-- Update category check constraint to include mumbai-university
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.products ADD CONSTRAINT products_category_check 
CHECK (category IN ('notes', 'mock-papers', 'pune-university', 'engineering', 'iit', 'combo-packs', 'others', 'audio-notes', 'mumbai-university'));