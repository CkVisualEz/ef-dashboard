/**
 * Parse user agent string to determine device type
 * @param userAgent - The user agent string (deviceInfo)
 * @returns Device type: "Desktop", "Mobile", "Tablet", or "Unknown"
 */
export function parseDeviceType(userAgent: string | null | undefined): string {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'Unknown';
  }

  const ua = userAgent.toLowerCase();

  // Check for mobile devices first (before tablet, as some tablets identify as mobile)
  // Mobile indicators
  const mobilePatterns = [
    /mobile/,
    /iphone/,
    /ipod/,
    /android.*mobile/,
    /blackberry/,
    /windows phone/,
    /opera mini/,
    /iemobile/,
    /palm/
  ];

  // Tablet indicators
  const tabletPatterns = [
    /ipad/,
    /android(?!.*mobile)/, // Android that's NOT mobile
    /tablet/,
    /playbook/,
    /kindle/,
    /silk/,
    /nexus.*7/,
    /nexus.*10/,
    /nexus.*9/
  ];

  // Desktop indicators
  const desktopPatterns = [
    /windows/,
    /macintosh/,
    /mac os/,
    /linux/,
    /x11/,
    /unix/,
    /chrome/,
    /firefox/,
    /safari/,
    /edge/,
    /opera/,
    /msie/,
    /trident/
  ];

  // Check for tablets first (more specific)
  for (const pattern of tabletPatterns) {
    if (pattern.test(ua)) {
      return 'Tablet';
    }
  }

  // Check for mobile devices
  for (const pattern of mobilePatterns) {
    if (pattern.test(ua)) {
      return 'Mobile';
    }
  }

  // Check for desktop (if it has desktop patterns and no mobile/tablet indicators)
  const hasDesktopPattern = desktopPatterns.some(pattern => pattern.test(ua));
  const hasMobileIndicator = mobilePatterns.some(pattern => pattern.test(ua)) || 
                             tabletPatterns.some(pattern => pattern.test(ua));

  if (hasDesktopPattern && !hasMobileIndicator) {
    return 'Desktop';
  }

  // Default: if it has common browser patterns, assume desktop
  if (hasDesktopPattern) {
    return 'Desktop';
  }

  return 'Unknown';
}

/**
 * Get device type from either deviceType field or deviceInfo (user agent)
 * @param deviceType - The deviceType field (if exists)
 * @param deviceInfo - The deviceInfo field (user agent string)
 * @returns Device type: "Desktop", "Mobile", "Tablet", or "Unknown"
 */
export function getDeviceType(deviceType?: string | null, deviceInfo?: string | null): string {
  // If deviceType exists and is valid, use it
  if (deviceType && deviceType !== 'unknown' && deviceType !== 'Unknown') {
    // Normalize common variations
    const normalized = deviceType.toLowerCase();
    if (normalized.includes('mobile')) return 'Mobile';
    if (normalized.includes('tablet')) return 'Tablet';
    if (normalized.includes('desktop')) return 'Desktop';
    return deviceType; // Return as-is if it's a valid value
  }

  // Otherwise, parse from deviceInfo (user agent)
  return parseDeviceType(deviceInfo);
}

