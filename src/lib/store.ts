import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: 'best-value' | 'popular';
  category: 'notes' | 'mock-papers' | 'combo';
  features: string[];
  downloadCount?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.id === product.id
          );
          if (existingItem) {
            return state;
          }
          return { items: [...state.items, { product, quantity: 1 }] };
        });
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },
      getItemCount: () => {
        return get().items.length;
      },
    }),
    {
      name: 'safal-cart',
    }
  )
);

export const products: Product[] = [
  {
    id: 'notes-complete',
    name: 'Complete Competitive Exam Notes',
    description: 'Comprehensive notes covering all major competitive exams including SSC, Banking, Railways, and State PSC. Written in easy language with clear concepts.',
    price: 299,
    originalPrice: 499,
    image: '/placeholder.svg',
    badge: 'popular',
    category: 'notes',
    features: [
      'All subjects covered',
      'Easy-to-understand language',
      'Previous year questions included',
      'Regular updates',
      'PDF format - instant download',
    ],
    downloadCount: 2847,
  },
  {
    id: 'mock-papers',
    name: 'Mock Question Papers PDF Set',
    description: 'Practice with 50+ mock question papers designed as per latest exam patterns. Includes detailed solutions and performance analysis tips.',
    price: 199,
    originalPrice: 349,
    image: '/placeholder.svg',
    category: 'mock-papers',
    features: [
      '50+ mock papers',
      'Latest exam patterns',
      'Detailed solutions',
      'Time management tips',
      'PDF format - instant download',
    ],
    downloadCount: 1923,
  },
  {
    id: 'combo-pack',
    name: 'Notes + Mock Papers Combo Pack',
    description: 'Get the best of both worlds! Complete notes plus all mock papers at a special discounted price. Perfect for serious aspirants.',
    price: 449,
    originalPrice: 848,
    image: '/placeholder.svg',
    badge: 'best-value',
    category: 'combo',
    features: [
      'Complete notes package',
      '50+ mock papers',
      'Save ₹399 with combo',
      'Priority support',
      'Bonus: Study schedule PDF',
      'PDF format - instant download',
    ],
    downloadCount: 3156,
  },
];

// Admin store
interface AdminState {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      login: (email, password) => {
        // Demo credentials
        if (email === 'admin@safal.com' && password === 'admin123') {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'safal-admin',
    }
  )
);
