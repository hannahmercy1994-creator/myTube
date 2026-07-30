import api from './client'
import type { Collection, CollectionDetail } from '../types'

export const getCollections = async () => {
  const { data } = await api.get<Collection[]>('/collections')
  return data
}

export const getCollection = async (id: number) => {
  const { data } = await api.get<CollectionDetail>(`/collections/${id}`)
  return data
}

export const createCollection = async (name: string, description?: string) => {
  const { data } = await api.post<Collection>('/collections', { name, description })
  return data
}

export const updateCollection = async (id: number, name?: string, description?: string) => {
  const { data } = await api.put<Collection>(`/collections/${id}`, { name, description })
  return data
}

export const deleteCollection = async (id: number) => {
  const { data } = await api.delete(`/collections/${id}`)
  return data
}

export const addVideoToCollection = async (collectionId: number, videoId: number) => {
  const { data } = await api.post(`/collections/${collectionId}/videos/${videoId}`)
  return data
}

export const removeVideoFromCollection = async (collectionId: number, videoId: number) => {
  const { data } = await api.delete(`/collections/${collectionId}/videos/${videoId}`)
  return data
}
