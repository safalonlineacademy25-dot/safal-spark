-- Create RLS policies for the settings table to allow admins to read and write

-- Policy: Anyone can read settings (needed by edge functions and public checkout)
CREATE POLICY "Anyone can read settings"
ON public.settings
FOR SELECT
USING (true);

-- Policy: Only authenticated admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Only authenticated admins can update settings
CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Only authenticated admins can delete settings
CREATE POLICY "Admins can delete settings"
ON public.settings
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));