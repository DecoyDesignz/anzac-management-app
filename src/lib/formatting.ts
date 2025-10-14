/**
 * Formatting utility functions
 */

/**
 * Formats a time string in HHMM format to HH:MM display
 */
export function formatTimeForDisplay(timeStr: string): string {
  if (!timeStr || timeStr.length !== 4) return ""
  const hours = timeStr.substring(0, 2)
  const minutes = timeStr.substring(2, 4)
  return `${hours}:${minutes}`
}

/**
 * Formats a timestamp to date string in Sydney timezone
 */
export function formatDateSydney(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    timeZone: 'Australia/Sydney'
  })
}

/**
 * Formats a timestamp to time string in Sydney timezone
 */
export function formatTimeSydney(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: 'Australia/Sydney'
  })
}

/**
 * Formats a time range in Sydney timezone
 */
export function formatTimeRangeSydney(startTime: number, endTime: number): string {
  return `${formatTimeSydney(startTime)} - ${formatTimeSydney(endTime)}`
}

/**
 * Formats a personnel name - shows first/last name if available, otherwise callsign
 */
export function formatPersonnelName(personnel: {
  firstName?: string
  lastName?: string
  callSign: string
}): string {
  if (personnel.firstName || personnel.lastName) {
    return `${personnel.firstName || ''} ${personnel.lastName || ''}`.trim()
  }
  return personnel.callSign
}

/**
 * Formats a personnel name with rank abbreviation
 */
export function formatPersonnelNameWithRank(personnel: {
  firstName?: string
  lastName?: string
  callSign: string
  rank?: { abbreviation: string } | null
}): string {
  const name = formatPersonnelName(personnel)
  return personnel.rank?.abbreviation ? `${personnel.rank.abbreviation}. ${name}` : name
}

/**
 * Formats a personnel display - full name with callsign in parentheses if both exist
 */
export function formatPersonnelDisplay(personnel: {
  firstName?: string
  lastName?: string
  callSign: string
  rank?: { abbreviation: string } | null
}): string {
  const hasName = personnel.firstName || personnel.lastName
  const name = formatPersonnelName(personnel)
  
  if (hasName && personnel.callSign) {
    const prefix = personnel.rank?.abbreviation ? `${personnel.rank.abbreviation}. ` : ''
    return `${prefix}${name} (${personnel.callSign})`
  }
  
  return formatPersonnelNameWithRank(personnel)
}

/**
 * Formats a date to locale date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Formats a date with full details
 */
export function formatDateFull(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

/**
 * Calculates months of service from a join date
 */
export function calculateMonthsOfService(joinDate: number): number {
  return Math.floor((Date.now() - joinDate) / (1000 * 60 * 60 * 24 * 30))
}

