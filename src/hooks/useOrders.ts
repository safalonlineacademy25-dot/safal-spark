import { useQuery, QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;

export interface OrderItemWithProduct extends OrderItem {
  products: { category: string } | null;
}

export interface OrderWithItems extends Order {
  order_items: OrderItemWithProduct[];
}

interface UseOrdersOptions {
  enabled?: boolean;
}

// Query function for orders with items and product categories - for dashboard charts
const fetchOrdersWithItems = async () => {
  console.debug('[useOrders] fetchOrdersWithItems start');
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (category)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[useOrders] RLS/permission error:', error);
    throw error;
  }
  console.debug('[useOrders] fetchOrdersWithItems success', { count: data?.length });
  return data as OrderWithItems[];
};

export const useOrders = (options: UseOrdersOptions = {}) => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  
  // Set up real-time subscription for orders table
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.debug('[useOrders] Realtime event:', payload.eventType);
          // Invalidate and refetch orders when any change occurs
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
  
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrdersWithItems,
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
  });
};

// Prefetch function for orders - call on hover to preload data
export const prefetchOrders = (queryClient: QueryClient) => {
  queryClient.prefetchQuery({
    queryKey: ['orders'],
    queryFn: fetchOrdersWithItems,
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
        .select('*, products (category)')
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
