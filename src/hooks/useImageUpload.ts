import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const UPLOAD_TIMEOUT_MS = 30000; // 30 second timeout

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
  }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    // Cancel any existing upload
    cancelUpload();
    
    setIsUploading(true);
    abortControllerRef.current = new AbortController();
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Upload timed out')), UPLOAD_TIMEOUT_MS);
      });

      // Race between upload and timeout
      const uploadPromise = supabase.storage
        .from('product-images')
        .upload(filePath, file);

      const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.debug('[useImageUpload] Upload was cancelled');
        return null;
      }

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload image: ' + uploadError.message);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      toast.success('Image uploaded successfully');
      return publicUrl;
    } catch (error) {
      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.debug('[useImageUpload] Upload was cancelled');
        return null;
      }
      
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to upload image: ' + message);
      return null;
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  return { uploadImage, isUploading, cancelUpload };
};
