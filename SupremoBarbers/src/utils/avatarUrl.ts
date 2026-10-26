/**
 * Avatar URL utility
 * Converts private Cloudflare R2 storage URLs to public CDN URLs.
 */

const R2_PUBLIC_BASE = 'https://pub-86f4b5249e5c4021bb05d46908eeb094.r2.dev';

/**
 * Converts a private R2 storage URL to the public CDN URL.
 * Private: https://<bucket>.<accountId>.r2.cloudflarestorage.com/<path>
 * Public:  https://pub-<hash>.r2.dev/<path>
 */
export function normalizeR2Url(url: string): string {
  if (!url) return url;
  const privateMatch = url.match(
    /^https?:\/\/[^/]+\.r2\.cloudflarestorage\.com\/(.+)$/,
  );
  if (privateMatch) {
    return `${R2_PUBLIC_BASE}/${privateMatch[1]}`;
  }
  return url;
}

export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function resolveAvatarUrl(
  primary?: string | null,
  fallback?: string | null,
): string | null {
  if (isValidImageUrl(primary)) return normalizeR2Url(primary!.trim());
  if (isValidImageUrl(fallback)) return normalizeR2Url(fallback!.trim());
  return null;
}

export function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
