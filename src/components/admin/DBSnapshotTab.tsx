import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Loader2, RefreshCw, Table2, HardDrive, Image, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

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

const DBSnapshotTab = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

      for (const file of files || []) {
        if (file.metadata) {
          fileCount++;
          totalSize += file.metadata.size || 0;
        } else if (file.id) {
          // It's a folder, list its contents
          const { data: folderFiles } = await supabase.storage
            .from(bucketName)
            .list(file.name, { limit: 1000 });

          for (const f of folderFiles || []) {
            if (f.metadata) {
              fileCount++;
              totalSize += f.metadata.size || 0;
            }
          }
        }
      }

      return { fileCount, totalSize };
    } catch (error) {
      console.error(`Error fetching bucket stats for ${bucketName}:`, error);
      return { fileCount: 0, totalSize: 0 };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch table counts
      const tableData: TableInfo[] = [];
      for (const config of TABLE_CONFIG) {
        const { count, error } = await supabase
          .from(config.name as any)
          .select('*', { count: 'exact', head: true });

        tableData.push({
          name: config.name,
          displayName: config.displayName,
          rowCount: error ? 0 : (count || 0),
          description: config.description,
        });
      }
      setTables(tableData);

      // Fetch bucket stats
      const bucketData: BucketInfo[] = [];
      for (const config of BUCKET_CONFIG) {
        const stats = await fetchBucketStats(config.name);
        bucketData.push({
          name: config.name,
          displayName: config.displayName,
          fileCount: stats.fileCount,
          totalSize: stats.totalSize,
          isPublic: config.isPublic,
        });
      }
      setBuckets(bucketData);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);
  const totalFiles = buckets.reduce((sum, b) => sum + b.fileCount, 0);
  const totalStorage = buckets.reduce((sum, b) => sum + b.totalSize, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Database Snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Overview of database tables and storage buckets
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
      </div>
    </motion.div>
  );
};

export default DBSnapshotTab;
