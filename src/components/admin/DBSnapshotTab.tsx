import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Loader2, RefreshCw, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface TableInfo {
  name: string;
  displayName: string;
  rowCount: number;
  description: string;
}

const TABLE_CONFIG = [
  { name: 'products', displayName: 'Products', description: 'Digital products available for sale' },
  { name: 'orders', displayName: 'Orders', description: 'Customer purchase orders' },
  { name: 'order_items', displayName: 'Order Items', description: 'Individual items within orders' },
  { name: 'customers', displayName: 'Customers', description: 'Customer contact information' },
  { name: 'download_tokens', displayName: 'Download Tokens', description: 'Secure download access tokens' },
  { name: 'user_roles', displayName: 'User Roles', description: 'Admin user permissions' },
];

const DBSnapshotTab = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTableCounts = async () => {
    setLoading(true);
    try {
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
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching table counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableCounts();
  }, []);

  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);

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
            Overview of all database tables and their current row counts
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTableCounts}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="p-2 rounded-lg bg-muted">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Last Updated</span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </p>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
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
    </motion.div>
  );
};

export default DBSnapshotTab;
