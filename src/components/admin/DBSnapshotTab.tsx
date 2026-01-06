import { motion } from 'framer-motion';
import { Database, Loader2, RefreshCw, Table2, HardDrive, Image, FileArchive, FileDown, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

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
];

const BUCKET_CONFIG = [
  { name: 'product-images', displayName: 'Product Images', isPublic: true },
  { name: 'product-files', displayName: 'Product Files', isPublic: false },
];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const fetchBucketStats = async (bucketName: string): Promise<{ fileCount: number; totalSize: number }> => {
  try {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1000 });

    if (error) {
      console.error(`Error fetching ${bucketName}:`, error);
      return { fileCount: 0, totalSize: 0 };
    }

    let fileCount = 0;
    let totalSize = 0;

    const folderPromises = (files || []).map(async (file) => {
      if (file.metadata) {
        return { count: 1, size: file.metadata.size || 0 };
      } else if (file.id) {
        const { data: folderFiles } = await supabase.storage
          .from(bucketName)
          .list(file.name, { limit: 1000 });

        let folderCount = 0;
        let folderSize = 0;
        for (const f of folderFiles || []) {
          if (f.metadata) {
            folderCount++;
            folderSize += f.metadata.size || 0;
          }
        }
        return { count: folderCount, size: folderSize };
      }
      return { count: 0, size: 0 };
    });

    const results = await Promise.all(folderPromises);
    for (const result of results) {
      fileCount += result.count;
      totalSize += result.size;
    }

    return { fileCount, totalSize };
  } catch (error) {
    console.error(`Error fetching bucket stats for ${bucketName}:`, error);
    return { fileCount: 0, totalSize: 0 };
  }
};

const fetchSnapshotData = async () => {
  // Fetch table counts in parallel
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

  // Fetch bucket stats in parallel
  const bucketPromises = BUCKET_CONFIG.map(async (config) => {
    const stats = await fetchBucketStats(config.name);
    return {
      name: config.name,
      displayName: config.displayName,
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
      isPublic: config.isPublic,
    };
  });

  const [tables, buckets] = await Promise.all([
    Promise.all(tablePromises),
    Promise.all(bucketPromises),
  ]);

  return { tables, buckets, fetchedAt: new Date() };
};

const DBSnapshotTab = () => {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['db-snapshot'],
    queryFn: fetchSnapshotData,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache retained
  });

  const tables = data?.tables || [];
  const buckets = data?.buckets || [];
  const lastUpdated = data?.fetchedAt || null;
  const loading = isLoading;

  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);
  const totalFiles = buckets.reduce((sum, b) => sum + b.fileCount, 0);
  const totalStorage = buckets.reduce((sum, b) => sum + b.totalSize, 0);

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
      tables: tables.map(t => ({
        name: t.name,
        displayName: t.displayName,
        rowCount: t.rowCount,
        description: t.description,
      })),
      storageBuckets: buckets.map(b => ({
        name: b.name,
        displayName: b.displayName,
        fileCount: b.fileCount,
        sizeBytes: b.totalSize,
        sizeFormatted: formatBytes(b.totalSize),
        isPublic: b.isPublic,
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
    // Tables CSV
    const tableHeaders = ['Table Name', 'Display Name', 'Row Count', 'Description'];
    const tableRows = tables.map(t => [
      t.name,
      t.displayName,
      t.rowCount.toString(),
      `"${t.description}"`,
    ]);

    // Buckets CSV
    const bucketHeaders = ['Bucket Name', 'Display Name', 'File Count', 'Size (Bytes)', 'Size (Formatted)', 'Public'];
    const bucketRows = buckets.map(b => [
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
      ...tableRows.map(row => row.join(',')),
      '',
      '## Storage Buckets',
      bucketHeaders.join(','),
      ...bucketRows.map(row => row.join(',')),
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Database Snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Overview of database tables and storage buckets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsCSV}
            disabled={loading || tables.length === 0}
            className="gap-1.5"
          >
            <FileDown className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsJSON}
            disabled={loading || tables.length === 0}
            className="gap-1.5"
          >
            <FileJson className="h-4 w-4" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
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
          <p className="text-2xl font-bold text-foreground">
            {loading ? '...' : totalRows.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Total Files</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {loading ? '...' : totalFiles.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-secondary/10">
              <FileArchive className="h-5 w-5 text-secondary" />
            </div>
            <span className="text-sm text-muted-foreground">Storage Used</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {loading ? '...' : formatBytes(totalStorage)}
          </p>
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
        {loading ? (
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
                transition={{ delay: index * 0.1 }}
                className="bg-muted/30 rounded-lg p-4 border border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      bucket.name === 'product-images' ? 'bg-primary/10' : 'bg-secondary/10'
                    }`}>
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
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    bucket.isPublic 
                      ? 'bg-secondary/10 text-secondary' 
                      : 'bg-primary/10 text-primary'
                  }`}>
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
        {loading ? (
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
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Table2 className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground font-mono text-sm">
                            {table.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {table.description}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-lg font-bold text-foreground">
                          {table.rowCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {percentage}%
                          </span>
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
                    <span className="text-lg font-bold text-foreground">
                      {totalRows.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-4 text-right text-sm text-muted-foreground">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}
        {!loading && <span className="ml-2 text-xs">(cached for 5 min)</span>}
      </div>
    </motion.div>
  );
};

export default DBSnapshotTab;
