import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Product = Tables<'products'>;
export type ProductInsert = TablesInsert<'products'>;

interface UseProductsOptions {
  enabled?: boolean;
}

// Query function for products - extracted for reuse in prefetching
const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Product[];
};

export const useProducts = (options: UseProductsOptions = {}) => {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes stale time for better caching
  });
};

// Prefetch function for products - call on hover to preload data
export const prefetchProducts = (queryClient: QueryClient) => {
  queryClient.prefetchQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 2,
  });
};

// Public products hook - excludes sensitive file_url column for security
export const useActiveProducts = () => {
  return useQuery({
    queryKey: ['products', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, original_price, category, badge, features, image_url, seo_title, seo_description, is_active, download_count, created_at, updated_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      // Return with null file_url and audio_url for type safety
      return (data || []).map(p => ({ ...p, file_url: null, audio_url: null })) as Product[];
    },
  });
};

export const useAddProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (newProduct) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['products'] });
      
      // Snapshot previous value
      const previousProducts = queryClient.getQueryData<Product[]>(['products']);
      
      // Optimistically add to cache with temp id
      const optimisticProduct: Product = {
        id: `temp-${Date.now()}`,
        name: newProduct.name,
        category: newProduct.category,
        price: newProduct.price,
        original_price: newProduct.original_price ?? null,
        description: newProduct.description ?? null,
        image_url: newProduct.image_url ?? null,
        file_url: newProduct.file_url ?? null,
        audio_url: newProduct.audio_url ?? null,
        badge: newProduct.badge ?? null,
        is_active: newProduct.is_active ?? true,
        features: newProduct.features ?? null,
        download_count: 0,
        seo_title: null,
        seo_description: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData<Product[]>(['products'], (old) => 
        old ? [optimisticProduct, ...old] : [optimisticProduct]
      );
      
      return { previousProducts };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
      console.error('Error adding product:', error);
      toast.error('Failed to add product. Please check your admin permissions.');
    },
    onSuccess: () => {
      toast.success('Product added successfully');
    },
    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (updatedProduct) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      
      const previousProducts = queryClient.getQueryData<Product[]>(['products']);
      
      queryClient.setQueryData<Product[]>(['products'], (old) =>
        old?.map((p) =>
          p.id === updatedProduct.id ? { ...p, ...updatedProduct, updated_at: new Date().toISOString() } : p
        )
      );
      
      return { previousProducts };
    },
    onError: (error, _, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    },
    onSuccess: () => {
      toast.success('Product updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      
      const previousProducts = queryClient.getQueryData<Product[]>(['products']);
      
      queryClient.setQueryData<Product[]>(['products'], (old) =>
        old?.filter((p) => p.id !== id)
      );
      
      return { previousProducts };
    },
    onError: (error, _, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product. Please check your admin permissions.');
    },
    onSuccess: () => {
      toast.success('Product deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
