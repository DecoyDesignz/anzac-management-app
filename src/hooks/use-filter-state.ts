import { useState, useCallback } from "react"

export type SortOrder = "asc" | "desc"

interface FilterState {
  searchTerm: string
  sortBy: string
  sortOrder: SortOrder
  [key: string]: any
}

export function useFilterState<T extends FilterState>(initialState: T) {
  const [filters, setFilters] = useState<T>(initialState)

  const updateFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateFilters = useCallback((updates: Partial<T>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(initialState)
  }, [initialState])

  const toggleSortOrder = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === "asc" ? "desc" : "asc"
    }))
  }, [])

  return {
    filters,
    updateFilter,
    updateFilters,
    clearFilters,
    toggleSortOrder,
    setFilters,
  }
}

