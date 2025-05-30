import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

// In development, use relative paths to leverage Vite's proxy
const isDevelopment = process.env.NODE_ENV === 'development';
const API_URL = isDevelopment 
  ? '/api' 
  : 'https://pakbettv.gghsoftwaredev.com/api';

console.log('useProducts API_URL:', API_URL, 'isDevelopment:', isDevelopment);

export const useProducts = () => {
  const queryClient = useQueryClient()
  const MAX_PRODUCTS = 12;

  // Fetch new arrivals with optimizations
  const getNewArrivals = useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/products?limit=20`)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const allProducts = Array.isArray(data?.products) ? data.products : [];
      const newArrivals = allProducts
        .filter(product => new Date(product.created_at) > thirtyDaysAgo)
        .slice(0, MAX_PRODUCTS);
      
      return newArrivals;
    },
    // Keep the data fresh for 10 minutes
    staleTime: 1000 * 60 * 10,
    // Cache the data for 1 hour
    cacheTime: 1000 * 60 * 60,
    // Show cached data while revalidating
    refetchOnMount: false,
    // Prefetch on hover
    refetchOnWindowFocus: false
  })

  // Fetch all products with optimizations
  const getAllProducts = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/products`)
      // Ensure we return proper structure with products array
      if (!data || typeof data !== 'object') {
        return { products: [] }
      }
      // If data.products exists, ensure it's an array
      if (data.products) {
        return {
          ...data,
          products: Array.isArray(data.products) ? data.products : []
        }
      }
      // If data is directly an array, wrap it in products structure
      if (Array.isArray(data)) {
        return { products: data }
      }
      // Fallback to empty products array
      return { products: [] }
    },
    // Keep the data fresh for 5 minutes
    staleTime: 1000 * 60 * 5,
    // Cache the data for 30 minutes
    cacheTime: 1000 * 60 * 30,
    // Show cached data while revalidating
    refetchOnMount: false,
    // Use any prefetched data
    initialData: () => {
      const cached = queryClient.getQueryData(['products'])
      // Ensure cached data has proper structure
      if (!cached) return { products: [] }
      if (Array.isArray(cached)) return { products: cached }
      if (cached.products && Array.isArray(cached.products)) return cached
      return { products: [] }
    }
  })

  // Fetch single product with optimizations
  const getProduct = (id) => useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/products/${id}`)
      return data
    },
    enabled: !!id,
    // Try to get initial data from the products list
    initialData: () => {
      const products = queryClient.getQueryData(['products'])
      if (products && Array.isArray(products)) {
        return products.find(product => product.id === id)
      }
      return undefined
    },
    // Only use initial data if we have it
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(['products'])?.dataUpdatedAt
    }
  })

  // Fetch best sellers with optimizations
  const getBestSellers = useQuery({
    queryKey: ['products', 'best-sellers'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/products`)
      const allProducts = Array.isArray(data?.products) ? data.products : [];
      const bestSellers = allProducts
        .filter(product => product.is_featured)
        .slice(0, MAX_PRODUCTS);
      
      return bestSellers;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: async (newProduct) => {
      const { data } = await axios.post(`${API_URL}/products`, newProduct)
      return data
    },
    onSuccess: (newProduct) => {
      // Optimistically update the cache
      queryClient.setQueryData(['products'], (old = { products: [] }) => {
        // Ensure old has proper structure
        if (!old || typeof old !== 'object') return { products: [newProduct] }
        if (old.products && Array.isArray(old.products)) {
          return {
            ...old,
            products: [...old.products, newProduct]
          }
        }
        // If old is directly an array (for backward compatibility)
        if (Array.isArray(old)) {
          return { products: [...old, newProduct] }
        }
        return { products: [newProduct] }
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  // Update product mutation
  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data } = await axios.put(`${API_URL}/products/${id}`, updateData)
      return data
    },
    onSuccess: (updatedProduct, variables) => {
      // Optimistically update the cache
      queryClient.setQueryData(['products'], (old = { products: [] }) => {
        // Ensure we have proper structure and products is an array
        const currentProducts = Array.isArray(old?.products) ? old.products : []
        return {
          ...old,
          products: currentProducts.map(product => product.id === variables.id ? updatedProduct : product)
        }
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`${API_URL}/products/${id}`)
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update the cache
      queryClient.setQueryData(['products'], (old = { products: [] }) => {
        // Ensure old has proper structure before filtering
        if (!old || typeof old !== 'object') return { products: [] }
        if (old.products && Array.isArray(old.products)) {
          return {
            ...old,
            products: old.products.filter(product => product.id !== deletedId)
          }
        }
        // If old is directly an array (for backward compatibility)
        if (Array.isArray(old)) {
          return { products: old.filter(product => product.id !== deletedId) }
        }
        return { products: [] }
      })
      queryClient.removeQueries(['products', deletedId])
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  return {
    getAllProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getNewArrivals,
    getBestSellers
  }
} 