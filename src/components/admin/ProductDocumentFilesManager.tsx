 import { useRef } from 'react';
 import { Button } from '@/components/ui/button';
 import { Progress } from '@/components/ui/progress';
 import { Loader2, Upload, Trash2, FileText, GripVertical } from 'lucide-react';
 import { useComboPackFiles, useComboPackFileUpload, useRemoveComboPackFile, formatBytes } from '@/hooks/useComboPackFiles';
 
 interface ProductDocumentFilesManagerProps {
   productId: string | null;
   isNewProduct?: boolean;
   onFilesChange?: (files: Array<{ file: File; order: number }>) => void;
   pendingFiles?: Array<{ file: File; order: number }>;
 }
 
 const ProductDocumentFilesManager = ({ 
   productId, 
   isNewProduct = false,
   onFilesChange,
   pendingFiles = []
 }: ProductDocumentFilesManagerProps) => {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const { files, isLoading } = useComboPackFiles(productId);
   const { uploadFile, cancelUpload, isUploading, uploadProgress } = useComboPackFileUpload();
   const removeFile = useRemoveComboPackFile();
 
   const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFiles = Array.from(e.target.files || []);
     if (selectedFiles.length === 0) return;
 
     if (isNewProduct && onFilesChange) {
       // For new products, just store the files to upload later
       const currentOrder = pendingFiles.length;
       const newPendingFiles = [
         ...pendingFiles,
         ...selectedFiles.map((file, idx) => ({
           file,
           order: currentOrder + idx,
         }))
       ];
       onFilesChange(newPendingFiles);
     } else if (productId) {
       // For existing products, upload immediately
       for (let i = 0; i < selectedFiles.length; i++) {
         const file = selectedFiles[i];
         const order = files.length + i;
         await uploadFile(file, productId, order);
       }
     }
 
     // Reset input
     if (fileInputRef.current) {
       fileInputRef.current.value = '';
     }
   };
 
   const handleRemoveFile = async (fileId: string) => {
     if (productId) {
       await removeFile.mutateAsync({ fileId, productId });
     }
   };
 
   const handleRemovePendingFile = (index: number) => {
     if (onFilesChange) {
       const newFiles = pendingFiles.filter((_, i) => i !== index);
       // Reorder remaining files
       const reorderedFiles = newFiles.map((f, i) => ({ ...f, order: i }));
       onFilesChange(reorderedFiles);
     }
   };
 
   return (
     <div className="space-y-3">
       <div className="flex items-center justify-between">
         <label className="text-sm font-medium">Document Files (PDF, ZIP, etc.)</label>
         <span className="text-xs text-muted-foreground">
           {isNewProduct ? pendingFiles.length : files.length} file(s)
         </span>
       </div>
 
       {/* Upload Area */}
       <input
         ref={fileInputRef}
         type="file"
         accept=".pdf,.zip,.rar,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
         multiple
         onChange={handleFileSelect}
         className="hidden"
       />
 
       {/* Upload Progress */}
       {isUploading && uploadProgress && (
         <div className="p-3 rounded-lg border border-border bg-muted/50 space-y-2">
           <div className="flex items-center justify-between text-sm">
             <span className="truncate flex-1 mr-2">{uploadProgress.fileName}</span>
             <span className="text-muted-foreground">{uploadProgress.percentage}%</span>
           </div>
           <Progress value={uploadProgress.percentage} className="h-2" />
           <div className="flex items-center justify-between text-xs text-muted-foreground">
             <span>{formatBytes(uploadProgress.bytesUploaded)} / {formatBytes(uploadProgress.bytesTotal)}</span>
             <Button
               type="button"
               variant="ghost"
               size="sm"
               onClick={cancelUpload}
               className="h-6 px-2 text-xs"
             >
               Cancel
             </Button>
           </div>
         </div>
       )}
 
       {/* Files List */}
       {isLoading ? (
         <div className="flex items-center justify-center py-4">
           <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
         </div>
       ) : (
         <div className="space-y-2">
           {isNewProduct ? (
             // Show pending files for new product
             pendingFiles.map((item, index) => (
               <div
                 key={index}
                 className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card"
               >
                 <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                 <FileText className="h-4 w-4 text-primary shrink-0" />
                 <span className="flex-1 text-sm truncate">{item.file.name}</span>
                 <span className="text-xs text-muted-foreground">
                   {formatBytes(item.file.size)}
                 </span>
                 <Button
                   type="button"
                   variant="ghost"
                   size="icon"
                   className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                   onClick={() => handleRemovePendingFile(index)}
                 >
                   <Trash2 className="h-3.5 w-3.5" />
                 </Button>
               </div>
             ))
           ) : (
             // Show uploaded files for existing product
             files.map((file) => (
               <div
                 key={file.id}
                 className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card"
               >
                 <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                 <FileText className="h-4 w-4 text-primary shrink-0" />
                 <span className="flex-1 text-sm truncate">{file.file_name}</span>
                 <span className="text-xs text-muted-foreground px-2 py-0.5 bg-secondary/10 rounded">
                   #{file.file_order + 1}
                 </span>
                 <Button
                   type="button"
                   variant="ghost"
                   size="icon"
                   className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                   onClick={() => handleRemoveFile(file.id)}
                   disabled={removeFile.isPending}
                 >
                   {removeFile.isPending ? (
                     <Loader2 className="h-3.5 w-3.5 animate-spin" />
                   ) : (
                     <Trash2 className="h-3.5 w-3.5" />
                   )}
                 </Button>
               </div>
             ))
           )}
 
           {/* Empty state / Add button */}
           <Button
             type="button"
             variant="outline"
             className="w-full h-12 border-dashed"
             onClick={() => fileInputRef.current?.click()}
             disabled={isUploading}
           >
             {isUploading ? (
               <Loader2 className="h-4 w-4 mr-2 animate-spin" />
             ) : (
               <Upload className="h-4 w-4 mr-2" />
             )}
             Add Document Files
           </Button>
         </div>
       )}
 
       <p className="text-xs text-muted-foreground">
         Each document will be sent as a separate download link to the customer.
       </p>
     </div>
   );
 };
 
 export default ProductDocumentFilesManager;