"use client"

import { formatPersonnelName, formatPersonnelNameWithRank, formatPersonnelDisplay } from "@/lib/formatting"

interface PersonnelNameProps {
  personnel: {
    firstName?: string
    lastName?: string
    callSign: string
    rank?: { abbreviation: string; name?: string } | null
  }
  variant?: "name-only" | "with-rank" | "full-display"
  className?: string
}

export function PersonnelName({
  personnel,
  variant = "with-rank",
  className = "",
}: PersonnelNameProps) {
  const getDisplayName = () => {
    switch (variant) {
      case "name-only":
        return formatPersonnelName(personnel)
      case "with-rank":
        return formatPersonnelNameWithRank(personnel)
      case "full-display":
        return formatPersonnelDisplay(personnel)
      default:
        return formatPersonnelNameWithRank(personnel)
    }
  }

  return <span className={className}>{getDisplayName()}</span>
}

