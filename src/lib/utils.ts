import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a user-friendly error message from Convex errors
 * Removes technical metadata like "[CONVEX M(...)] [Request ID: ...]"
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) return "An unknown error occurred"
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  // Try to extract the actual error message after "Uncaught Error: "
  const uncaughtErrorMatch = errorMessage.match(/Uncaught Error: (.+?)(?:\n|$)/)
  if (uncaughtErrorMatch) {
    return uncaughtErrorMatch[1].trim()
  }
  
  // If no "Uncaught Error:" pattern, try to remove the Convex metadata prefix
  const convexMetadataPattern = /^\[CONVEX [^\]]+\]\s*\[Request ID: [^\]]+\]\s*(?:Server Error\s*)?/
  const cleanedMessage = errorMessage.replace(convexMetadataPattern, '').trim()
  
  // Remove any "Uncaught Error: " prefix that might be left
  const finalMessage = cleanedMessage.replace(/^Uncaught Error:\s*/, '').trim()
  
  return finalMessage || "An error occurred"
}

/**
 * Converts a hex color to RGB values with optional opacity
 * @param hex - The hex color (e.g., "#071ac2")
 * @param opacity - Opacity value between 0 and 1 (default: 1)
 * @returns RGB/RGBA color string
 */
export function hexToRgba(hex: string, opacity: number = 1): string {
  // Remove the hash if present
  const cleanHex = hex.replace('#', '')
  
  // Parse the hex values
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  
  if (opacity === 1) {
    return `rgb(${r}, ${g}, ${b})`
  }
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Gets school color styles for badges and indicators
 * Uses inline styles with the school's hex color
 * @param color - The school's hex color
 * @param isDarkMode - Whether dark mode is active (optional)
 * @returns Object with background, border, and text color styles
 */
export function getSchoolColorStyles(color?: string, isDarkMode?: boolean) {
  if (!color) {
    return {
      backgroundColor: 'rgba(107, 114, 128, 0.2)', // gray-500/20
      borderColor: 'rgba(107, 114, 128, 0.3)', // gray-500/30
      color: undefined, // Use default text color
    }
  }
  
  // Apply theme-aware color adjustment
  const adjustedColor = isDarkMode !== undefined ? getThemeAwareColor(color, isDarkMode) : color
  
  return {
    backgroundColor: hexToRgba(adjustedColor, 0.2),
    borderColor: hexToRgba(adjustedColor, 0.3),
    color: adjustedColor,
  }
}

/**
 * Gets solid school color for indicators
 * @param color - The school's hex color
 * @param opacity - Opacity value between 0 and 1 (default: 0.6)
 * @param isDarkMode - Whether dark mode is active (optional)
 * @returns Background color string
 */
export function getSchoolIndicatorColor(color?: string, opacity: number = 0.6, isDarkMode?: boolean): string {
  if (!color) {
    return hexToRgba('#6b7280', opacity) // gray-500
  }
  
  // Apply theme-aware color adjustment
  const adjustedColor = isDarkMode !== undefined ? getThemeAwareColor(color, isDarkMode) : color
  
  return hexToRgba(adjustedColor, opacity)
}

/**
 * Gets role color styles for badges and indicators
 * @param roleName - The user role name
 * @param roleColor - Optional color from the roles table
 * @param isDarkMode - Whether dark mode is active (optional)
 * @returns Object with background, border, and text color styles
 */
export function getRoleColorStyles(roleName: string, roleColor?: string, isDarkMode?: boolean) {
  // Use provided color or fallback to default colors
  const color = roleColor || getDefaultRoleColor(roleName);
  
  // Apply theme-aware color adjustment
  const adjustedColor = isDarkMode !== undefined ? getThemeAwareColor(color, isDarkMode) : color
  
  return {
    backgroundColor: hexToRgba(adjustedColor, 0.2),
    borderColor: hexToRgba(adjustedColor, 0.3),
    color: adjustedColor,
  }
}

/**
 * Gets solid role color for indicators
 * @param roleName - The user role name
 * @param roleColor - Optional color from the roles table
 * @param opacity - Opacity value between 0 and 1 (default: 0.6)
 * @param isDarkMode - Whether dark mode is active (optional)
 * @returns Background color string
 */
export function getRoleIndicatorColor(roleName: string, roleColor?: string, opacity: number = 0.6, isDarkMode?: boolean): string {
  // Use provided color or fallback to default colors
  const color = roleColor || getDefaultRoleColor(roleName);
  
  // Apply theme-aware color adjustment
  const adjustedColor = isDarkMode !== undefined ? getThemeAwareColor(color, isDarkMode) : color
  
  return hexToRgba(adjustedColor, opacity)
}

/**
 * Gets default role color for backward compatibility
 * @param roleName - The role name
 * @returns Default hex color
 */
function getDefaultRoleColor(roleName: string): string {
  const roleColors: Record<string, string> = {
    "super_admin": "#FF0000", // Bright Red (Game Admin)
    "administrator": "#FF0000", // Bright Red (Game Admin)
    "game_master": "#800080", // Medium Purple (GM)
    "instructor": "#FFA500", // Golden Orange (Instructor)
    "member": "#6B7280", // Gray (Default for members)
  };
  
  return roleColors[roleName] || "#6B7280";
}

/**
 * Converts hex color to HSL for manipulation
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Convert hex to RGB (0-1 range)
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  
  let h = 0
  let s = 0
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 }
}

/**
 * Converts HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  h = h / 360
  s = s / 100
  l = l / 100
  
  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  
  let r, g, b
  
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1/3)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1/3)
  }
  
  const toHex = (val: number) => {
    const hex = Math.round(val * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Adjusts a color based on the current theme - UX best practice implementation
 * 
 * Based on industry standards:
 * - Dark mode: Desaturates by ~30% to reduce eye strain while maintaining vibrancy
 * - Dark mode: Slightly increases lightness for better visibility on dark backgrounds
 * - Light mode: Returns original vibrant color
 * 
 * References:
 * - UX Misfit: https://uxmisfit.com/2019/08/20/ui-design-in-practice-dark-mode/
 * - Material Design Dark Theme Guidelines
 * 
 * @param color - Hex color string (e.g., '#FF5733')
 * @param isDarkMode - Whether dark mode is active
 * @returns Adjusted hex color string
 */
export function getThemeAwareColor(color: string, isDarkMode: boolean): string {
  if (!color || !isDarkMode) {
    return color // Return original vibrant color in light mode
  }
  
  try {
    // Convert to HSL for easier manipulation
    const { h, s, l } = hexToHsl(color)
    
    // Desaturate by ~30% for dark mode (balanced approach for eye comfort and vibrancy)
    const adjustedS = s * 0.7
    
    // Slightly increase lightness for better visibility on dark backgrounds
    const adjustedL = Math.min(100, l * 1.1)
    
    // Convert back to hex
    return hslToHex(h, adjustedS, adjustedL)
  } catch (error) {
    console.warn('Failed to adjust color:', color, error)
    return color // Return original on error
  }
}

/**
 * Get text color (black or white) based on background color for optimal contrast
 */
export function getTextColor(hexColor: string): string {
  if (!hexColor) return '#000000'
  
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Calculate relative luminance using WCAG formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

