import { useState, useCallback, useRef } from 'react';
import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SUPABASE_PROJECT_ID = 'hujuqkhbdptsdnbnkslo';
const BUCKET_NAME = 'product-files';
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks

export interface ComboPackFile {
  id: string;
  product_id: string;
  file_url: string;
  file_name: string;
  file_order: number;
  created_at: string;
}

interface UploadProgress {
  percentage: number;
  bytesUploaded: number;
  bytesTotal: number;
  fileName: string;
}

interface UseComboPackFilesReturn {
  files: ComboPackFile[];
  isLoading: boolean;
  uploadFile: (file: File, productId: string, order: number) => Promise<ComboPackFile | null>;
  removeFile: (fileId: string) => Promise<void>;
  cancelUpload: () => void;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  reorderFiles: (files: ComboPackFile[]) => Promise<void>;
}

// Fetch combo pack files for a product
export function useComboPackFiles(productId: string | null): {
  files: ComboPackFile[];
  isLoading: boolean;
  refetch: () => void;
} {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['combo-pack-files', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('combo_pack_files')
        .select('*')
        .eq('product_id', productId)
        .order('file_order', { ascending: true });

      if (error) throw error;
      return data as ComboPackFile[];
    },
    enabled: !!productId,
  });

  return {
    files: data || [],
    isLoading,
    refetch,
  };
}

// Hook for managing combo pack file uploads
export function useComboPackFileUpload(): {
  uploadFile: (file: File, productId: string, order: number) => Promise<ComboPackFile | null>;
  cancelUpload: () => void;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
} {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelUpload = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      uploadRef.current = null;
      setIsUploading(false);
      setUploadProgress(null);
      toast({
        title: 'Upload cancelled',
        description: 'File upload was cancelled',
      });
    }
  }, [toast]);

  const uploadFile = useCallback(async (file: File, productId: string, order: number): Promise<ComboPackFile | null> => {
    setIsUploading(true);
    setUploadProgress({
      percentage: 0,
      bytesUploaded: 0,
      bytesTotal: file.size,
      fileName: file.name,
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to upload files');
      }

      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${productId}/combo/${timestamp}-${sanitizedName}`;

      // Upload file using TUS
      const fileUrl = await new Promise<string>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: CHUNK_SIZE,
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: BUCKET_NAME,
            objectName: fileName,
            contentType: file.type,
            cacheControl: '3600',
          },
          onError: (err) => {
            console.error('Upload error:', err);
            setIsUploading(false);
            setUploadProgress(null);
            toast({
              title: 'Upload failed',
              description: err.message,
              variant: 'destructive',
            });
            reject(err);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
            setUploadProgress({
              percentage,
              bytesUploaded,
              bytesTotal,
              fileName: file.name,
            });
          },
          onSuccess: () => {
            const url = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/${BUCKET_NAME}/${fileName}`;
            resolve(url);
          },
        });

        uploadRef.current = upload;
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length > 0) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        });
      });

      // Insert record into combo_pack_files table
      const { data: insertedFile, error: insertError } = await supabase
        .from('combo_pack_files')
        .insert({
          product_id: productId,
          file_url: fileUrl,
          file_name: file.name,
          file_order: order,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setIsUploading(false);
      setUploadProgress(null);

      toast({
        title: 'File uploaded',
        description: `${file.name} added to combo pack`,
      });

      // Invalidate query to refetch files
      queryClient.invalidateQueries({ queryKey: ['combo-pack-files', productId] });

      return insertedFile as ComboPackFile;
    } catch (err: any) {
      console.error('Upload error:', err);
      setIsUploading(false);
      setUploadProgress(null);
      toast({
        title: 'Upload failed',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, queryClient]);

  return {
    uploadFile,
    cancelUpload,
    isUploading,
    uploadProgress,
  };
}

// Hook for removing combo pack files
export function useRemoveComboPackFile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, productId }: { fileId: string; productId: string }) => {
      const { error } = await supabase
        .from('combo_pack_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      // Invalidate query to refetch files
      queryClient.invalidateQueries({ queryKey: ['combo-pack-files', productId] });
    },
    onSuccess: () => {
      toast({
        title: 'File removed',
        description: 'File removed from combo pack',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Format bytes to human readable
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
