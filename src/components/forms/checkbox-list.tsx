"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { LucideIcon } from "lucide-react"

export interface CheckboxOption {
  id: string
  label: string
  description?: string
  icon?: LucideIcon
}

interface CheckboxListProps {
  options: CheckboxOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  label?: string
  maxHeight?: string
  disabled?: boolean
  className?: string
}

export function CheckboxList({
  options,
  selected,
  onChange,
  label,
  maxHeight = "max-h-60",
  disabled = false,
  className = "",
}: CheckboxListProps) {
  const handleToggle = (id: string) => {
    if (disabled) return
    
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className={className}>
      {label && (
        <Label className="mb-2 block">{label}</Label>
      )}
      <div className={`${maxHeight} overflow-y-auto border border-border/50 rounded-lg p-3 bg-muted/20 space-y-2`}>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No options available
          </p>
        ) : (
          options.map((option) => {
            const Icon = option.icon
            return (
              <div
                key={option.id}
                className="flex items-start space-x-3 group hover:bg-muted/30 rounded-md p-2 -m-2 transition-colors"
              >
                <Checkbox
                  id={`checkbox-${option.id}`}
                  checked={selected.includes(option.id)}
                  onCheckedChange={() => handleToggle(option.id)}
                  disabled={disabled}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                />
                <label
                  htmlFor={`checkbox-${option.id}`}
                  className="flex items-start gap-2 text-sm cursor-pointer flex-1 group-hover:text-primary transition-colors"
                >
                  {Icon && (
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="font-medium block">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        {option.description}
                      </span>
                    )}
                  </div>
                </label>
              </div>
            )
          })
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          <span className="font-semibold text-primary">{selected.length}</span>{" "}
          {selected.length === 1 ? "item" : "items"} selected
        </p>
      )}
    </div>
  )
}

