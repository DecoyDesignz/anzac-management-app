import { useState, useCallback } from "react"

export function useFormState<T extends Record<string, unknown>>(initialValues: T) {
  const [formData, setFormData] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})

  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when it's updated
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const updateFields = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const resetForm = useCallback(() => {
    setFormData(initialValues)
    setErrors({})
  }, [initialValues])

  const setFormValues = useCallback((values: T) => {
    setFormData(values)
    setErrors({})
  }, [])

  return {
    formData,
    errors,
    updateField,
    updateFields,
    setFieldError,
    clearErrors,
    resetForm,
    setFormValues,
    setFormData,
  }
}

