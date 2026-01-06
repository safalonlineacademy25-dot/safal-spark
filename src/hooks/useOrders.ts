import { useQuery, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

interface UseOrdersOptions {
  enabled?: boolean;
}

// Query function for orders - extracted for reuse in prefetching
const fetchOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Order[];
};

export const useOrders = (options: UseOrdersOptions = {}) => {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
  });
};

// Prefetch function for orders - call on hover to preload data
export const prefetchOrders = (queryClient: QueryClient) => {
  queryClient.prefetchQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 1000 * 60 * 2,
  });
};

export const useOrderWithItems = (orderId: string | null) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) return null;

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      return {
        ...order,
        order_items: orderItems || [],
      } as OrderWithItems;
    },
    enabled: !!orderId,
  });
};
