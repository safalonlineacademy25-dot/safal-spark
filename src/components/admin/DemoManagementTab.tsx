import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, GripVertical, Music, Video, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import * as tus from 'tus-js-client';

interface DemoFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DemoFormData {
  title: string;
  description: string;
  is_active: boolean;
}

const DemoManagementTab = () => {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingDemo, setEditingDemo] = useState<DemoFile | null>(null);
  const [deletingDemo, setDeletingDemo] = useState<DemoFile | null>(null);
  const [formData, setFormData] = useState<DemoFormData>({ title: '', description: '', is_active: true });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch demo files
  const { data: demoFiles, isLoading } = useQuery({
    queryKey: ['admin-demo-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_files')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as DemoFile[];
    },
  });

  // Upload audio file to storage
  const uploadAudioFile = async (file: File): Promise<{ url: string; fileName: string }> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${Date.now()}-${file.name}`;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error('Not authenticated');

    return new Promise((resolve, reject) => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const upload = new tus.Upload(file, {
        endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000],
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-upsert': 'true',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: 'demo-files',
          objectName: filePath,
          contentType: file.type,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024,
        onError: (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        },
        onSuccess: () => {
          const { data: urlData } = supabase.storage.from('demo-files').getPublicUrl(filePath);
          resolve({ url: filePath, fileName: file.name });
        },
      });

      upload.findPreviousUploads().then((previousUploads: any[]) => {
        if (previousUploads.length) {
          (upload as any).resumeFrom(previousUploads[0]);
        }
        upload.start();
      });
    });
  };

  // Add demo
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error('Please select a file');

      setIsUploading(true);
      const { url, fileName } = await uploadAudioFile(audioFile);

      const maxOrder = demoFiles?.length ? Math.max(...demoFiles.map(d => d.display_order)) + 1 : 0;

      const { error } = await supabase.from('demo_files').insert({
        title: formData.title,
        description: formData.description || null,
        file_url: url,
        file_name: fileName,
        display_order: maxOrder,
        is_active: formData.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Demo audio added successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-demo-files'] });
      queryClient.invalidateQueries({ queryKey: ['demo-files'] });
      resetForm();
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast.error('Failed to add demo audio', { description: error.message });
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  // Edit demo
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingDemo) return;

      let updateData: any = {
        title: formData.title,
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (audioFile) {
        setIsUploading(true);
        const { url, fileName } = await uploadAudioFile(audioFile);
        updateData.file_url = url;
        updateData.file_name = fileName;
      }

      const { error } = await supabase
        .from('demo_files')
        .update(updateData)
        .eq('id', editingDemo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Demo audio updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-demo-files'] });
      queryClient.invalidateQueries({ queryKey: ['demo-files'] });
      resetForm();
      setEditingDemo(null);
    },
    onError: (error: any) => {
      toast.error('Failed to update demo audio', { description: error.message });
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  // Delete demo
  const deleteMutation = useMutation({
    mutationFn: async (demo: DemoFile) => {
      // Delete file from storage
      if (demo.file_url) {
        await supabase.storage.from('demo-files').remove([demo.file_url]);
      }
      const { error } = await supabase.from('demo_files').delete().eq('id', demo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Demo audio deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-demo-files'] });
      queryClient.invalidateQueries({ queryKey: ['demo-files'] });
      setDeletingDemo(null);
    },
    onError: (error: any) => {
      toast.error('Failed to delete demo audio', { description: error.message });
    },
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('demo_files')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-demo-files'] });
      queryClient.invalidateQueries({ queryKey: ['demo-files'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update status', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', is_active: true });
    setAudioFile(null);
    setUploadProgress(0);
  };

  const openEdit = (demo: DemoFile) => {
    setEditingDemo(demo);
    setFormData({
      title: demo.title,
      description: demo.description || '',
      is_active: demo.is_active,
    });
    setAudioFile(null);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (editingDemo) {
      editMutation.mutate();
    } else {
      if (!audioFile) {
        toast.error('Please select an audio or video file');
        return;
      }
      addMutation.mutate();
    }
  };

  const isSaving = addMutation.isPending || editMutation.isPending || isUploading;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Demo Media Management</h2>
          <p className="text-sm text-muted-foreground">Add, edit, or remove demo audio/video files visible on the Demo page</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Demo Media
        </Button>
      </div>

      {/* Demo files list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !demoFiles || demoFiles.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Music className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No demo files added yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Click "Add Demo Media" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demoFiles.map((demo, index) => (
            <div
              key={demo.id}
              className={`flex items-center gap-4 p-4 bg-card rounded-xl border border-border transition-opacity ${
                !demo.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0">
                {/\.(mp4|webm|mov)$/i.test(demo.file_name) ? (
                  <Video className="h-5 w-5 text-primary" />
                ) : (
                  <Music className="h-5 w-5 text-primary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">{demo.title}</h3>
                  {!demo.is_active && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Hidden</span>
                  )}
                </div>
                {demo.description && (
                  <p className="text-sm text-muted-foreground truncate">{demo.description}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-0.5">{demo.file_name}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: demo.id, is_active: !demo.is_active })}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title={demo.is_active ? 'Hide from demo page' : 'Show on demo page'}
                >
                  {demo.is_active ? (
                    <Eye className="h-4 w-4 text-secondary" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(demo)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setDeletingDemo(demo)}
                  className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || !!editingDemo} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingDemo(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDemo ? 'Edit Demo Media' : 'Add Demo Media'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="demo-title">Title *</Label>
              <Input
                id="demo-title"
                placeholder="e.g. Current Affairs - February Edition"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="demo-desc">Description</Label>
              <Textarea
                id="demo-desc"
                placeholder="Brief description of this demo audio"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="demo-audio">Audio/Video File {!editingDemo && '*'}</Label>
              <Input
                id="demo-audio"
                type="file"
                accept="audio/*,video/mp4,video/webm"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {editingDemo && !audioFile && (
                <p className="text-xs text-muted-foreground mt-1">Current: {editingDemo.file_name} (leave empty to keep)</p>
              )}
              {isUploading && uploadProgress > 0 && (
                <div className="mt-2">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="demo-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="demo-active">Visible on Demo page</Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingDemo ? 'Save Changes' : 'Add Demo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDemo} onOpenChange={(open) => !open && setDeletingDemo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Demo Audio</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDemo?.title}"? This will also remove the audio file from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDemo && deleteMutation.mutate(deletingDemo)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default DemoManagementTab;
