import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Megaphone, Loader2, CheckCircle, XCircle, Users, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import PaginationControls from './PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { motion } from 'framer-motion';
import PromotionBroadcastDialog from './PromotionBroadcastDialog';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface PromotionLog {
  id: string;
  created_at: string;
  template_name: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  errors: any;
  promotion_title: string;
  promotion_message: string | null;
}

export default function PromotionsTab() {
  const [logs, setLogs] = useState<PromotionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const pagination = usePagination({ data: logs, itemsPerPage: 15 });

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Use raw query since types may not be updated yet
      const { data, error } = await supabase
        .from('promotion_logs' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs((data as unknown as PromotionLog[]) || []);
    } catch (err) {
      console.error('Error fetching promotion logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Calculate stats
  const totalBroadcasts = logs.length;
  const totalSent = logs.reduce((sum, log) => sum + log.sent_count, 0);
  const totalFailed = logs.reduce((sum, log) => sum + log.failed_count, 0);
  const successRate = totalSent + totalFailed > 0 
    ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) 
    : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Promotions</h2>
        </div>
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
          <PromotionBroadcastDialog onBroadcastSent={() => fetchLogs(true)} />
        </div>
      </div>

      {/* Stats Section */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Total Promotions</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalBroadcasts}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Messages Sent</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalSent}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Failed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalFailed}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-secondary" />
            <span className="text-sm text-muted-foreground">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{successRate}%</p>
        </div>
      </motion.div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Promotional Broadcasts</p>
            <p className="text-sm text-muted-foreground mt-1">
              Send promotional messages about new products, features, or special offers to all customers who opted in for WhatsApp updates.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Promotion Title</TableHead>
              <TableHead>Template</TableHead>
              <TableHead className="text-center">Recipients</TableHead>
              <TableHead className="text-center">Sent</TableHead>
              <TableHead className="text-center">Failed</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No promotions sent yet. Click "Send Promotion" to get started.
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedData.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {log.promotion_title}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {log.template_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{log.recipients_count}</TableCell>
                  <TableCell className="text-center text-green-600 font-medium">{log.sent_count}</TableCell>
                  <TableCell className="text-center text-destructive font-medium">{log.failed_count}</TableCell>
                  <TableCell>
                    {log.failed_count === 0 && log.sent_count > 0 ? (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    ) : log.sent_count === 0 ? (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Partial
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {logs.length > 0 && (
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
      )}
    </div>
  );
}
