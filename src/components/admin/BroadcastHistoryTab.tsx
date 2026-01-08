import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Megaphone, Loader2, CheckCircle, XCircle, Users, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import PaginationControls from './PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { motion } from 'framer-motion';
import WhatsAppBroadcastDialog from './WhatsAppBroadcastDialog';
interface BroadcastLog {
  id: string;
  category: string;
  product_name: string;
  product_description: string | null;
  template_name: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  errors: string[];
  created_at: string;
}

export default function BroadcastHistoryTab() {
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pagination = usePagination({ data: logs, itemsPerPage: 15 });

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from('broadcast_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedLogs: BroadcastLog[] = (data || []).map((log: any) => ({
        ...log,
        errors: Array.isArray(log.errors) ? log.errors : []
      }));
      
      setLogs(transformedLogs);
    } catch (error) {
      console.error('Error fetching broadcast logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const totalSent = logs.reduce((sum, log) => sum + log.sent_count, 0);
  const totalFailed = logs.reduce((sum, log) => sum + log.failed_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{logs.length}</p>
              <p className="text-sm text-muted-foreground">Total Broadcasts</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalSent}</p>
              <p className="text-sm text-muted-foreground">Messages Sent</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalFailed}</p>
              <p className="text-sm text-muted-foreground">Failed Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Broadcast History</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <WhatsAppBroadcastDialog onBroadcastSent={() => fetchLogs(true)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No broadcasts yet. Send your first broadcast from the WhatsApp Logs tab.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Template</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Recipients</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sent</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Failed</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedData.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{log.product_name}</p>
                          {log.product_description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                              {log.product_description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                          {log.category}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground font-mono text-xs">
                        {log.template_name}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{log.recipients_count}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          {log.sent_count}
                        </span>
                      </td>
                      <td className="p-4">
                        {log.failed_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                            <XCircle className="h-3 w-3" />
                            {log.failed_count}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              totalItems={pagination.totalItems}
              onPrevPage={pagination.prevPage}
              onNextPage={pagination.nextPage}
              onGoToPage={pagination.goToPage}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
