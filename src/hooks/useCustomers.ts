import { useQuery, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Customer = Tables<'customers'>;

interface UseCustomersOptions {
  enabled?: boolean;
}

// Query function for customers - extracted for reuse in prefetching
const fetchCustomers = async () => {
  console.debug('[useCustomers] fetchCustomers start');
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[useCustomers] RLS/permission error:', error);
    throw error;
  }
  console.debug('[useCustomers] fetchCustomers success', { count: data?.length });
  return data as Customer[];
};

export const useCustomers = (options: UseCustomersOptions = {}) => {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
  });
};

// Prefetch function for customers - call on hover to preload data
export const prefetchCustomers = (queryClient: QueryClient) => {
  queryClient.prefetchQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    staleTime: 1000 * 60 * 2,
  });
};
