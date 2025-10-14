import { useState, useCallback } from "react"

export function useDialogState<T = unknown>() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)

  const open = useCallback((item?: T) => {
    if (item !== undefined) {
      setSelectedItem(item)
    }
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Don't immediately clear selectedItem to allow for exit animations
    setTimeout(() => setSelectedItem(null), 200)
  }, [])

  const selectItem = useCallback((item: T | null) => {
    setSelectedItem(item)
  }, [])

  return {
    isOpen,
    selectedItem,
    open,
    close,
    selectItem,
    setIsOpen,
  }
}

