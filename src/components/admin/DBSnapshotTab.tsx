import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Loader2,
  RefreshCw,
  Table2,
  HardDrive,
  Image,
  FileArchive,
  FileDown,
  FileJson,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TableInfo {
  name: string;
  displayName: string;
  rowCount: number;
  description: string;
}

interface BucketInfo {
  name: string;
  displayName: string;
  fileCount: number;
  totalSize: number;
  isPublic: boolean;
}

const TABLE_CONFIG = [
  { name: 'products', displayName: 'Products', description: 'Digital products available for sale' },
  { name: 'orders', displayName: 'Orders', description: 'Customer purchase orders' },
  { name: 'order_items', displayName: 'Order Items', description: 'Individual items within orders' },
  { name: 'customers', displayName: 'Customers', description: 'Customer contact information' },
  { name: 'download_tokens', displayName: 'Download Tokens', description: 'Secure download access tokens' },
  { name: 'user_roles', displayName: 'User Roles', description: 'Admin user permissions' },
 { name: 'combo_pack_files', displayName: 'Combo Pack Files', description: 'Document files for combo products' },
 { name: 'product_audio_files', displayName: 'Product Audio Files', description: 'Audio files attached to products' },
 { name: 'email_delivery_logs', displayName: 'Email Delivery Logs', description: 'Email sending status and history' },
 { name: 'broadcast_logs', displayName: 'Broadcast Logs', description: 'WhatsApp broadcast history' },
 { name: 'promotion_logs', displayName: 'Promotion Logs', description: 'Promotional campaign history' },
 { name: 'refunds', displayName: 'Refunds', description: 'Payment refund records' },
 { name: 'settings', displayName: 'Settings', description: 'Application configuration settings' },
 { name: 'visitor_stats', displayName: 'Visitor Stats', description: 'Daily website visitor counts' },
 { name: 'rate_limits', displayName: 'Rate Limits', description: 'API rate limiting records' },
] as const;

const BUCKET_CONFIG = [
  { name: 'product-images', displayName: 'Product Images', isPublic: true },
  { name: 'product-files', displayName: 'Product Files', isPublic: false },
] as const;

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const fetchTableCounts = async (): Promise<TableInfo[]> => {
  const tablePromises = TABLE_CONFIG.map(async (config) => {
    const { count, error } = await supabase
      .from(config.name as any)
      .select('*', { count: 'exact', head: true });

    return {
      name: config.name,
      displayName: config.displayName,
      rowCount: error ? 0 : (count || 0),
      description: config.description,
    };
  });

  return Promise.all(tablePromises);
};

const fetchBucketStatsPaged = async (bucketName: string): Promise<{ fileCount: number; totalSize: number }> => {
  let fileCount = 0;
  let totalSize = 0;
  const LIMIT = 1000;

  // Recursively list all files in a folder path
  const listFolder = async (folderPath: string) => {
    let offset = 0;
    while (true) {
      const { data: items, error } = await supabase.storage
        .from(bucketName)
        .list(folderPath, { limit: LIMIT, offset });

      if (error || !items || items.length === 0) break;

      for (const item of items) {
        if (item.metadata && typeof item.metadata.size === 'number' && item.metadata.size > 0) {
          // It's a file
          fileCount += 1;
          totalSize += item.metadata.size;
        } else if (item.id === null || (!item.metadata?.mimetype)) {
          // It's likely a folder — recurse into it
          const subPath = folderPath ? `${folderPath}/${item.name}` : item.name;
          await listFolder(subPath);
        }
      }

      if (items.length < LIMIT) break;
      offset += LIMIT;
    }
  };

  try {
    await listFolder('');
  } catch (err) {
    console.error(`Error counting files in bucket ${bucketName}:`, err);
  }

  return { fileCount, totalSize };
};

const fetchBucketStatsAll = async (): Promise<BucketInfo[]> => {
  const bucketPromises = BUCKET_CONFIG.map(async (config) => {
    const stats = await fetchBucketStatsPaged(config.name);
    return {
      name: config.name,
      displayName: config.displayName,
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
      isPublic: config.isPublic,
    };
  });

  return Promise.all(bucketPromises);
};

interface DBSnapshotTabProps {
  isActive?: boolean;
  isSuperAdmin?: boolean;
}

const DBSnapshotTab = ({ isActive = false, isSuperAdmin = false }: DBSnapshotTabProps) => {
  const queryClient = useQueryClient();
  const [clearingBucket, setClearingBucket] = useState<string | null>(null);
  const {
    data: tables = [],
    isLoading: tablesLoading,
    isFetching: tablesFetching,
    refetch: refetchTables,
    dataUpdatedAt: tablesUpdatedAt,
  } = useQuery({
    queryKey: ['db-snapshot', 'tables'],
    queryFn: fetchTableCounts,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: isActive,
  });

  const {
    data: buckets = [],
    isLoading: bucketsLoading,
    isFetching: bucketsFetching,
    refetch: refetchBuckets,
    dataUpdatedAt: bucketsUpdatedAt,
  } = useQuery({
    queryKey: ['db-snapshot', 'buckets'],
    queryFn: fetchBucketStatsAll,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: isActive,
  });

  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);
  const totalFiles = buckets.reduce((sum, b) => sum + b.fileCount, 0);
  const totalStorage = buckets.reduce((sum, b) => sum + b.totalSize, 0);

  const lastUpdatedAt = Math.max(tablesUpdatedAt || 0, bucketsUpdatedAt || 0);
  const lastUpdated = lastUpdatedAt ? new Date(lastUpdatedAt) : null;

  const exportAsJSON = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalTables: TABLE_CONFIG.length,
        totalRows,
        totalFiles,
        totalStorageBytes: totalStorage,
        totalStorageFormatted: formatBytes(totalStorage),
      },
      tables,
      storageBuckets: buckets.map((b) => ({
        ...b,
        sizeBytes: b.totalSize,
        sizeFormatted: formatBytes(b.totalSize),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `db-snapshot-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const tableHeaders = ['Table Name', 'Display Name', 'Row Count', 'Description'];
    const tableRows = tables.map((t) => [t.name, t.displayName, t.rowCount.toString(), `"${t.description}"`]);

    const bucketHeaders = ['Bucket Name', 'Display Name', 'File Count', 'Size (Bytes)', 'Size (Formatted)', 'Public'];
    const bucketRows = buckets.map((b) => [
      b.name,
      b.displayName,
      b.fileCount.toString(),
      b.totalSize.toString(),
      formatBytes(b.totalSize),
      b.isPublic ? 'Yes' : 'No',
    ]);

    const csvContent = [
      '# Database Snapshot Export',
      `# Exported: ${new Date().toISOString()}`,
      '',
      '## Tables',
      tableHeaders.join(','),
      ...tableRows.map((row) => row.join(',')),
      '',
      '## Storage Buckets',
      bucketHeaders.join(','),
      ...bucketRows.map((row) => row.join(',')),
      '',
      '## Summary',
      `Total Tables,${TABLE_CONFIG.length}`,
      `Total Rows,${totalRows}`,
      `Total Files,${totalFiles}`,
      `Total Storage,${formatBytes(totalStorage)}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `db-snapshot-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearBucket = async (bucketName: string) => {
    setClearingBucket(bucketName);
    try {
      const listAllFiles = async (path: string): Promise<string[]> => {
        const allPaths: string[] = [];
        let offset = 0;
        const LIMIT = 1000;
        while (true) {
          const { data: items, error } = await supabase.storage
            .from(bucketName)
            .list(path, { limit: LIMIT, offset });
          if (error || !items || items.length === 0) break;
          for (const item of items) {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            if (item.metadata && typeof item.metadata.size === 'number' && item.metadata.size > 0) {
              allPaths.push(fullPath);
            } else if (item.id === null || !item.metadata?.mimetype) {
              const subFiles = await listAllFiles(fullPath);
              allPaths.push(...subFiles);
            }
          }
          if (items.length < LIMIT) break;
          offset += LIMIT;
        }
        return allPaths;
      };

      const filePaths = await listAllFiles('');
      if (filePaths.length === 0) {
        toast.info('Bucket is already empty');
        setClearingBucket(null);
        return;
      }

      // Delete in batches of 100
      const batchSize = 100;
      let deleted = 0;
      for (let i = 0; i < filePaths.length; i += batchSize) {
        const batch = filePaths.slice(i, i + batchSize);
        const { error } = await supabase.storage.from(bucketName).remove(batch);
        if (error) {
          console.error(`Error deleting batch from ${bucketName}:`, error);
          toast.error(`Error clearing ${bucketName}: ${error.message}`);
          break;
        }
        deleted += batch.length;
      }

      toast.success(`Cleared ${deleted} files from ${bucketName}`);
      queryClient.invalidateQueries({ queryKey: ['db-snapshot', 'buckets'] });
    } catch (err: any) {
      console.error(`Error clearing bucket ${bucketName}:`, err);
      toast.error(`Failed to clear bucket: ${err.message}`);
    } finally {
      setClearingBucket(null);
    }
  };

  const refreshAll = async () => {
    await Promise.all([refetchTables(), refetchBuckets()]);
  };

  const isRefreshing = tablesFetching || bucketsFetching;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Database Snapshot</h2>
          <p className="text-sm text-muted-foreground">Overview of database tables and storage buckets</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsCSV}
            disabled={tablesLoading || tables.length === 0}
            className="gap-1.5"
          >
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsJSON}
            disabled={tablesLoading || tables.length === 0}
            className="gap-1.5"
          >
            <FileJson className="h-4 w-4" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Total Tables</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{TABLE_CONFIG.length}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Table2 className="h-5 w-5 text-secondary" />
            </div>
            <span className="text-sm text-muted-foreground">Total Rows</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{tablesLoading ? '...' : totalRows.toLocaleString()}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Total Files</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{bucketsLoading ? '...' : totalFiles.toLocaleString()}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-secondary/10">
              <FileArchive className="h-5 w-5 text-secondary" />
            </div>
            <span className="text-sm text-muted-foreground">Storage Used</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{bucketsLoading ? '...' : formatBytes(totalStorage)}</p>
        </div>
      </div>

      {/* Storage Buckets */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Storage Buckets
          </h3>
        </div>

        {bucketsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {buckets.map((bucket, index) => (
              <motion.div
                key={bucket.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-muted/30 rounded-lg p-4 border border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        bucket.name === 'product-images' ? 'bg-primary/10' : 'bg-secondary/10'
                      }`}
                    >
                      {bucket.name === 'product-images' ? (
                        <Image className="h-5 w-5 text-primary" />
                      ) : (
                        <FileArchive className="h-5 w-5 text-secondary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{bucket.displayName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{bucket.name}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      bucket.isPublic ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {bucket.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Files</p>
                    <p className="text-xl font-bold text-foreground">{bucket.fileCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Size</p>
                    <p className="text-xl font-bold text-foreground">{formatBytes(bucket.totalSize)}</p>
                  </div>
                </div>

                {isSuperAdmin && bucket.fileCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full gap-2"
                          disabled={clearingBucket === bucket.name}
                        >
                          {clearingBucket === bucket.name ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          {clearingBucket === bucket.name ? 'Clearing...' : `Clear All Files (${bucket.fileCount})`}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear {bucket.displayName}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete <strong>all {bucket.fileCount} files</strong> ({formatBytes(bucket.totalSize)}) from the <strong>{bucket.name}</strong> bucket. This action cannot be undone.
                            {bucket.name === 'product-files' && (
                              <span className="block mt-2 text-destructive font-medium">
                                ⚠️ Warning: This will remove all downloadable product files. Customers won't be able to download purchased products until files are re-uploaded.
                              </span>
                            )}
                            {bucket.name === 'product-images' && (
                              <span className="block mt-2 text-destructive font-medium">
                                ⚠️ Warning: This will remove all product images. Products will show fallback icons until images are re-uploaded.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => clearBucket(bucket.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, Clear All Files
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Tables Grid */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Tables
          </h3>
        </div>

        {tablesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Table Name</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Row Count</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table, index) => {
                  const percentage = totalRows > 0 ? ((table.rowCount / totalRows) * 100).toFixed(1) : '0';
                  return (
                    <motion.tr
                      key={table.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Table2 className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground font-mono text-sm">{table.displayName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{table.description}</td>
                      <td className="p-4 text-right">
                        <span className="text-lg font-bold text-foreground">{table.rowCount.toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">{percentage}%</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50">
                  <td className="p-4 font-semibold text-foreground" colSpan={2}>
                    Total
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-lg font-bold text-foreground">{totalRows.toLocaleString()}</span>
                  </td>
                  <td className="p-4 text-right text-sm text-muted-foreground">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}
        <span className="ml-2 text-xs">(tables cached 5m, buckets cached 30m)</span>
      </div>
    </motion.div>
  );
};

export default DBSnapshotTab;
