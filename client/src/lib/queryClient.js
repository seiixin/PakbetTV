import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import API_URL from '../config'

const MAX_PRODUCTS = 12;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

// Prefetch products function
export const prefetchProducts = async () => {
  await queryClient.prefetchQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/products`)
      return data
    },
  })

  // Prefetch new arrivals
  await queryClient.prefetchQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/products?limit=20`)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const allProducts = Array.isArray(data?.products) ? data.products : [];
      const newArrivals = allProducts
        .filter(product => new Date(product.created_at) > thirtyDaysAgo)
        .slice(0, MAX_PRODUCTS);
      
      return newArrivals;
    }
  })

  // Prefetch best sellers
  await queryClient.prefetchQuery({
    queryKey: ['products', 'best-sellers'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/products`)
      const allProducts = Array.isArray(data?.products) ? data.products : [];
      const bestSellers = allProducts
        .filter(product => product.is_featured)
        .slice(0, MAX_PRODUCTS);
      
      return bestSellers;
    }
  })
} 