-- Drop the existing category check constraint
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;

-- Add updated category check constraint with new categories
ALTER TABLE public.products ADD CONSTRAINT products_category_check 
CHECK (category IN ('notes', 'mock-papers', 'pune-university', 'engineering', 'iit', 'others'));