/**
 * Utility functions for displaying personnel information
 */

export interface Personnel {
  callSign?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Get the display name for a personnel member
 * Uses callSign as the primary identifier
 */
export function getPersonnelDisplayName(person: Personnel | null | undefined): string {
  return person?.callSign || 'Unknown';
}

/**
 * Get a short display name for badges or compact views
 */
export function getPersonnelShortName(person: Personnel | null | undefined): string {
  const callSign = person?.callSign;
  if (!callSign) return 'Unknown';
  
  // If callSign is long, truncate it for compact display
  return callSign.length > 12 ? callSign.substring(0, 12) + '...' : callSign;
}
