import api from './client'
import type { Category } from '../types'

export const getCategories = async () => {
  const { data } = await api.get<Category[]>('/categories')
  return data
}

export const createCategory = async (name: string) => {
  const { data } = await api.post<Category>('/categories', { name })
  return data
}

export const updateCategory = async (id: number, name: string) => {
  const { data } = await api.put<Category>(`/categories/${id}`, { name })
  return data
}

export const deleteCategory = async (id: number) => {
  const { data } = await api.delete(`/categories/${id}`)
  return data
}
