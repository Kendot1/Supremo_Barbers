/**
 * Utility to parse user agent strings into human-readable device information.
 * Used for device tracking in the Security & Devices section.
 */

export interface DeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

/**
 * Parse a user agent string into structured device info.
 */
export function parseUserAgent(ua: string): DeviceInfo {
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  const deviceType = detectDeviceType(ua);
  const deviceName = `${browser} on ${os}`;

  return { deviceName, browser, os, deviceType };
}

function detectBrowser(ua: string): string {
  // Order matters — check more specific browsers first
  if (/Edg\//i.test(ua)) {
    const match = ua.match(/Edg\/([\d.]+)/);
    return `Microsoft Edge${match ? ` ${match[1].split('.')[0]}` : ''}`;
  }
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    const match = ua.match(/OPR\/([\d.]+)/);
    return `Opera${match ? ` ${match[1].split('.')[0]}` : ''}`;
  }
  if (/Brave/i.test(ua)) {
    return 'Brave';
  }
  if (/Vivaldi/i.test(ua)) {
    const match = ua.match(/Vivaldi\/([\d.]+)/);
    return `Vivaldi${match ? ` ${match[1].split('.')[0]}` : ''}`;
  }
  if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    return `Google Chrome${match ? ` ${match[1].split('.')[0]}` : ''}`;
  }
  if (/Firefox/i.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    return `Mozilla Firefox${match ? ` ${match[1].split('.')[0]}` : ''}`;
  }
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    const match = ua.match(/Version\/([\d.]+)/);
    return `Safari${match ? ` ${match[1].split('.')[0]}` : ''}`;
  }
  if (/MSIE|Trident/i.test(ua)) {
    return 'Internet Explorer';
  }
  return 'Unknown Browser';
}

function detectOS(ua: string): string {
  if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
  if (/Windows NT 6\.3/i.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6\.2/i.test(ua)) return 'Windows 8';
  if (/Windows NT 6\.1/i.test(ua)) return 'Windows 7';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) {
    const match = ua.match(/Mac OS X ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      return `macOS ${version}`;
    }
    return 'macOS';
  }
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android ([\d.]+)/);
    return `Android${match ? ` ${match[1]}` : ''}`;
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS ([\d_]+)/);
    if (match) {
      return `iOS ${match[1].replace(/_/g, '.')}`;
    }
    return 'iOS';
  }
  if (/Linux/i.test(ua)) return 'Linux';
  if (/CrOS/i.test(ua)) return 'Chrome OS';
  return 'Unknown OS';
}

function detectDeviceType(ua: string): 'desktop' | 'mobile' | 'tablet' {
  if (/iPad|tablet/i.test(ua)) return 'tablet';
  if (/Mobile|iPhone|Android.*Mobile|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}
