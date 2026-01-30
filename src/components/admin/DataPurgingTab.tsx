import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trash2,
  Download,
  AlertTriangle,
  Loader2,
  Database,
  FileDown,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

type TableName = 'orders' | 'order_items' | 'download_tokens';

interface TableInfo {
  name: TableName;
  label: string;
  description: string;
  hasDependencies: boolean;
}

const TABLES: TableInfo[] = [
  {
    name: 'orders',
    label: 'Orders',
    description: 'Customer orders (will also delete related order_items and download_tokens)',
    hasDependencies: true,
  },
  {
    name: 'order_items',
    label: 'Order Items',
    description: 'Individual items within orders',
    hasDependencies: false,
  },
  {
    name: 'download_tokens',
    label: 'Download Tokens',
    description: 'File download access tokens',
    hasDependencies: false,
  },
];

const DataPurgingTab = () => {
  const [selectedTable, setSelectedTable] = useState<TableName | ''>('');
  const [recordCount, setRecordCount] = useState<string>('10');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    count: number;
    oldestDate: string | null;
    newestDate: string | null;
  } | null>(null);
  const [lastPurgeResult, setLastPurgeResult] = useState<{
    table: string;
    deletedCount: number;
    backupDownloaded: boolean;
  } | null>(null);

  const selectedTableInfo = TABLES.find((t) => t.name === selectedTable);

  const handlePreview = async () => {
    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }

    const count = parseInt(recordCount, 10);
    if (isNaN(count) || count < 1 || count > 1000) {
      toast.error('Please enter a valid number between 1 and 1000');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch preview data - oldest records by created_at
      const { data, error } = await supabase
        .from(selectedTable)
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(count);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('No records found in this table');
        setPreviewData(null);
        return;
      }

      setPreviewData({
        count: data.length,
        oldestDate: data[0]?.created_at || null,
        newestDate: data[data.length - 1]?.created_at || null,
      });
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error('Failed to preview records', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurge = async () => {
    if (!selectedTable || !previewData) return;

    const count = parseInt(recordCount, 10);
    setIsLoading(true);
    setConfirmDialogOpen(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('purge-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tableName: selectedTable,
          recordCount: count,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Download the CSV backup
      if (data.csvContent) {
        const blob = new Blob([data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedTable}-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setLastPurgeResult({
        table: selectedTable,
        deletedCount: data.deletedCount || 0,
        backupDownloaded: !!data.csvContent,
      });

      toast.success('Data purged successfully', {
        description: `${data.deletedCount || 0} records deleted. Backup CSV downloaded.`,
      });

      // Reset form
      setPreviewData(null);
      setSelectedTable('');
      setRecordCount('10');
    } catch (error: any) {
      console.error('Purge error:', error);
      toast.error('Failed to purge data', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Warning Banner */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Danger Zone</p>
              <p className="text-sm text-muted-foreground">
                Data purging permanently deletes records from the database. A CSV backup will be
                created before deletion. This action cannot be undone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Purging Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Database className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Purge Old Records</CardTitle>
              <CardDescription>
                Select a table and specify how many oldest records to delete
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Table Selection */}
          <div className="space-y-2">
            <Label htmlFor="table-select">Select Table</Label>
            <Select
              value={selectedTable}
              onValueChange={(value) => {
                setSelectedTable(value as TableName);
                setPreviewData(null);
              }}
            >
              <SelectTrigger id="table-select" className="w-full">
                <SelectValue placeholder="Choose a table to purge..." />
              </SelectTrigger>
              <SelectContent>
                {TABLES.map((table) => (
                  <SelectItem key={table.name} value={table.name}>
                    <div className="flex flex-col items-start">
                      <span>{table.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTableInfo && (
              <p className="text-sm text-muted-foreground">
                {selectedTableInfo.description}
              </p>
            )}
          </div>

          {/* Record Count */}
          <div className="space-y-2">
            <Label htmlFor="record-count">Number of Oldest Records to Delete</Label>
            <Input
              id="record-count"
              type="number"
              min={1}
              max={1000}
              value={recordCount}
              onChange={(e) => {
                setRecordCount(e.target.value);
                setPreviewData(null);
              }}
              placeholder="e.g., 20"
              className="max-w-[200px]"
            />
            <p className="text-sm text-muted-foreground">
              Records are sorted by creation date (oldest first). Maximum: 1000 records.
            </p>
          </div>

          {/* Preview Button */}
          <Button
            onClick={handlePreview}
            disabled={!selectedTable || isLoading}
            variant="outline"
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Preview Records
          </Button>

          {/* Preview Results */}
          {previewData && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Records to be deleted:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Count:</span>{' '}
                      <span className="font-medium text-foreground">{previewData.count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Oldest:</span>{' '}
                      <span className="font-medium text-foreground">
                        {previewData.oldestDate
                          ? format(new Date(previewData.oldestDate), 'MMM d, yyyy h:mm a')
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Newest:</span>{' '}
                      <span className="font-medium text-foreground">
                        {previewData.newestDate
                          ? format(new Date(previewData.newestDate), 'MMM d, yyyy h:mm a')
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {selectedTableInfo?.hasDependencies && (
                    <p className="text-sm text-amber-600 mt-2">
                      ⚠️ Deleting orders will also delete related order_items and download_tokens.
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => setConfirmDialogOpen(true)}
                      disabled={isLoading}
                      variant="destructive"
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete {previewData.count} Records
                    </Button>
                    <Button
                      onClick={() => setPreviewData(null)}
                      variant="outline"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Last Purge Result */}
      {lastPurgeResult && (
        <Card className="border-secondary/30 bg-secondary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
              <div>
                <p className="font-medium text-secondary">Last Purge Completed</p>
                <p className="text-sm text-muted-foreground">
                  Deleted {lastPurgeResult.deletedCount} records from{' '}
                  <span className="font-mono">{lastPurgeResult.table}</span>.
                  {lastPurgeResult.backupDownloaded && ' Backup CSV was downloaded.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <FileDown className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">How It Works</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Select the table you want to purge data from</li>
            <li>Specify the number of oldest records to delete</li>
            <li>Click "Preview Records" to see what will be deleted</li>
            <li>Review the date range of records to be deleted</li>
            <li>Click "Delete" to create a CSV backup and remove the records</li>
            <li>The backup CSV will automatically download to your computer</li>
          </ol>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Data Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to permanently delete{' '}
                <strong>{previewData?.count || 0} records</strong> from the{' '}
                <strong className="font-mono">{selectedTable}</strong> table.
              </p>
              {selectedTableInfo?.hasDependencies && (
                <p className="text-amber-600">
                  This will also delete all related order_items and download_tokens!
                </p>
              )}
              <p>A CSV backup will be downloaded before deletion.</p>
              <p className="font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default DataPurgingTab;
