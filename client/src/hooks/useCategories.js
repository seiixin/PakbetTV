import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

// In development, use relative paths to leverage Vite's proxy
const isDevelopment = process.env.NODE_ENV === 'development';
const API_URL = isDevelopment ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

export const useCategories = () => {
  const queryClient = useQueryClient()

  // Fetch all categories with optimizations
  const getAllCategories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/categories`)
      return data
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    cacheTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
    refetchOnMount: false,
    initialData: () => {
      return queryClient.getQueryData(['categories'])
    }
  })

  // Create category mutation
  const createCategory = useMutation({
    mutationFn: async (categoryData) => {
      const { data } = await axios.post(`${API_URL}/categories`, categoryData)
      return data
    },
    onSuccess: (newCategory) => {
      // Optimistically update the cache
      queryClient.setQueryData(['categories'], (old = []) => [...old, newCategory])
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })

  // Update category mutation
  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data } = await axios.put(`${API_URL}/categories/${id}`, updateData)
      return data
    },
    onSuccess: (updatedCategory, variables) => {
      // Optimistically update the cache
      queryClient.setQueryData(['categories'], (old = []) => 
        old.map(category => category.id === variables.id ? updatedCategory : category)
      )
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })

  // Delete category mutation
  const deleteCategory = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`${API_URL}/categories/${id}`)
    },
    onSuccess: (_, deletedId) => {
      // Optimistically update the cache
      queryClient.setQueryData(['categories'], (old = []) => 
        old.filter(category => category.id !== deletedId)
      )
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })

  return {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
  }
} 