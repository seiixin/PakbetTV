import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const useProducts = () => {
  const queryClient = useQueryClient()

  // Fetch all products with optimizations
  const getAllProducts = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/products`)
      return data
    },
    // Keep the data fresh for 5 minutes
    staleTime: 1000 * 60 * 5,
    // Cache the data for 30 minutes
    cacheTime: 1000 * 60 * 30,
    // Show cached data while revalidating
    refetchOnMount: false,
    // Use any prefetched data
    initialData: () => {
      return queryClient.getQueryData(['products'])
    }
  })

  // Fetch single product with optimizations
  const getProduct = (id) => useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/products/${id}`)
      return data
    },
    enabled: !!id,
    // Try to get initial data from the products list
    initialData: () => {
      const products = queryClient.getQueryData(['products'])
      if (products) {
        return products.find(product => product.id === id)
      }
      return undefined
    },
    // Only use initial data if we have it
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(['products'])?.dataUpdatedAt
    }
  })

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: async (newProduct) => {
      const { data } = await axios.post(`${API_URL}/api/products`, newProduct)
      return data
    },
    onSuccess: (newProduct) => {
      // Optimistically update the cache
      queryClient.setQueryData(['products'], (old) => [...(old || []), newProduct])
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  // Update product mutation
  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data } = await axios.put(`${API_URL}/api/products/${id}`, updateData)
      return data
    },
    onSuccess: (updatedProduct, variables) => {
      // Optimistically update the cache
      queryClient.setQueryData(['products'], (old) => 
        old?.map(product => product.id === variables.id ? updatedProduct : product)
      )
      queryClient.setQueryData(['products', variables.id], updatedProduct)
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`${API_URL}/api/products/${id}`)
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update the cache
      queryClient.setQueryData(['products'], (old) => 
        old?.filter(product => product.id !== deletedId)
      )
      queryClient.removeQueries(['products', deletedId])
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  return {
    getAllProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
  }
} 