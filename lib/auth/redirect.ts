/**
 * Sanitizes and validates a redirect path to prevent open redirect vulnerabilities.
 * Allows only relative paths starting with '/' and rejects protocol relative '//',
 * backslashes, tab/control characters, encoded evasions, or protocol specifiers.
 */
export function getSafeRedirectPath(
  rawPath: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!rawPath || typeof rawPath !== 'string') {
    return fallback;
  }

  const trimmed = rawPath.trim();

  // Reject paths not starting with '/' or starting with protocol-relative '//' or backslashes
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    trimmed.includes('://') ||
    /[\x00-\x1F\x7F]/.test(trimmed)
  ) {
    return fallback;
  }

  // Check URL encoded attempts like /%2F, /%5C, etc.
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      !decoded.startsWith('/') ||
      decoded.startsWith('//') ||
      decoded.includes('\\') ||
      decoded.includes('://') ||
      /[\x00-\x1F\x7F]/.test(decoded)
    ) {
      return fallback;
    }
  } catch {
    // Malformed URI sequence
    return fallback;
  }

  return trimmed;
}
