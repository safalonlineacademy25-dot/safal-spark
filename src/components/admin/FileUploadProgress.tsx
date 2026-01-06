import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X, FileText, Upload, Loader2, CheckCircle } from 'lucide-react';
import { formatBytes } from '@/hooks/useProductFileUpload';

interface FileUploadProgressProps {
  fileName: string | null;
  fileSize: number;
  isUploading: boolean;
  progress: {
    percentage: number;
    bytesUploaded: number;
    bytesTotal: number;
  };
  onCancel: () => void;
  onRemove: () => void;
  onSelect: () => void;
  disabled?: boolean;
}

const FileUploadProgress = ({
  fileName,
  fileSize,
  isUploading,
  progress,
  onCancel,
  onRemove,
  onSelect,
  disabled,
}: FileUploadProgressProps) => {
  const isComplete = progress.percentage === 100 && !isUploading;

  if (!fileName && !isUploading) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="h-6 w-6" />
        <span className="text-sm">Click to upload product file (PDF, ZIP, etc.)</span>
        <span className="text-xs text-muted-foreground">Supports resumable uploads up to 50MB</span>
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`p-2 rounded-lg ${isComplete ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
            {isComplete ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {isUploading
                ? `${formatBytes(progress.bytesUploaded)} / ${formatBytes(progress.bytesTotal)}`
                : formatBytes(fileSize)}
            </p>
          </div>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={isUploading ? onCancel : onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isUploading && (
        <div className="space-y-1">
          <Progress value={progress.percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading...
            </span>
            <span>{progress.percentage}%</span>
          </div>
        </div>
      )}

      {isComplete && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Upload complete
        </p>
      )}
    </div>
  );
};

export default FileUploadProgress;