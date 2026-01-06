import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Customer = Tables<'customers'>;

interface UseCustomersOptions {
  enabled?: boolean;
}

export const useCustomers = (options: UseCustomersOptions = {}) => {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
  });
};
