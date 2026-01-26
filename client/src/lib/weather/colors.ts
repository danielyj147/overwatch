import type { AlertSeverity } from '@/types/weather';

/**
 * Color mapping for alert severity levels
 * Returns RGBA tuple for use with Deck.gl
 */
export function getSeverityColor(severity: AlertSeverity): [number, number, number, number] {
  switch (severity) {
    case 'Extreme':
      return [220, 38, 38, 180]; // Red
    case 'Severe':
      return [249, 115, 22, 180]; // Orange
    case 'Moderate':
      return [234, 179, 8, 180]; // Yellow
    case 'Minor':
      return [34, 211, 238, 180]; // Cyan
    case 'Unknown':
    default:
      return [156, 163, 175, 180]; // Gray
  }
}

/**
 * Get CSS hex color for severity (for UI elements)
 */
export function getSeverityHexColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'Extreme':
      return '#DC2626'; // Red
    case 'Severe':
      return '#F97316'; // Orange
    case 'Moderate':
      return '#EAB308'; // Yellow
    case 'Minor':
      return '#22D3EE'; // Cyan
    case 'Unknown':
    default:
      return '#9CA3AF'; // Gray
  }
}

/**
 * Get border color for alerts (slightly darker/more opaque)
 */
export function getSeverityBorderColor(severity: AlertSeverity): [number, number, number, number] {
  switch (severity) {
    case 'Extreme':
      return [185, 28, 28, 255]; // Darker red
    case 'Severe':
      return [234, 88, 12, 255]; // Darker orange
    case 'Moderate':
      return [202, 138, 4, 255]; // Darker yellow
    case 'Minor':
      return [6, 182, 212, 255]; // Darker cyan
    case 'Unknown':
    default:
      return [107, 114, 128, 255]; // Darker gray
  }
}

/**
 * All severity levels in order of priority
 */
export const SEVERITY_LEVELS: AlertSeverity[] = [
  'Extreme',
  'Severe',
  'Moderate',
  'Minor',
  'Unknown',
];
