import { useState, useCallback, useRef } from 'react';
import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_PROJECT_ID = 'hujuqkhbdptsdnbnkslo';
const BUCKET_NAME = 'product-files';
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks

interface UploadProgress {
  percentage: number;
  bytesUploaded: number;
  bytesTotal: number;
}

interface UseProductFileUploadReturn {
  uploadFile: (file: File, productId?: string) => Promise<string | null>;
  cancelUpload: () => void;
  isUploading: boolean;
  progress: UploadProgress;
  error: string | null;
}

export function useProductFileUpload(): UseProductFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    percentage: 0,
    bytesUploaded: 0,
    bytesTotal: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const { toast } = useToast();

  const cancelUpload = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      uploadRef.current = null;
      setIsUploading(false);
      setProgress({ percentage: 0, bytesUploaded: 0, bytesTotal: 0 });
      toast({
        title: 'Upload cancelled',
        description: 'File upload was cancelled',
      });
    }
  }, [toast]);

  const uploadFile = useCallback(async (file: File, productId?: string): Promise<string | null> => {
    setIsUploading(true);
    setError(null);
    setProgress({ percentage: 0, bytesUploaded: 0, bytesTotal: file.size });

    try {
      // Get auth session for the upload
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to upload files');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = productId 
        ? `${productId}/${timestamp}-${sanitizedName}`
        : `uploads/${timestamp}-${sanitizedName}`;

      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: CHUNK_SIZE,
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true', // Overwrite if exists
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
            setError(err.message);
            setIsUploading(false);
            toast({
              title: 'Upload failed',
              description: err.message,
              variant: 'destructive',
            });
            reject(err);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
            setProgress({
              percentage,
              bytesUploaded,
              bytesTotal,
            });
          },
          onSuccess: () => {
            setIsUploading(false);
            setProgress({ percentage: 100, bytesUploaded: file.size, bytesTotal: file.size });
            
            // Construct the file URL
            const fileUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/${BUCKET_NAME}/${fileName}`;
            
            toast({
              title: 'Upload complete',
              description: `${file.name} uploaded successfully`,
            });
            
            resolve(fileUrl);
          },
        });

        uploadRef.current = upload;

        // Check for previous uploads to resume
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length > 0) {
            console.log('Resuming previous upload');
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        });
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
      setIsUploading(false);
      toast({
        title: 'Upload failed',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  return {
    uploadFile,
    cancelUpload,
    isUploading,
    progress,
    error,
  };
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