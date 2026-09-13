/**
 * Centralized formatting utility functions for GatherAround frontend.
 */

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateString;
  }
}

/**
 * Safely decodes percent-encoded filenames (e.g. primary%3APictures%2F... -> Pictures/...)
 * and returns a clean, human-readable filename display string.
 */
export function formatFileName(rawName) {
  if (!rawName) return '';
  try {
    let decoded = decodeURIComponent(rawName);
    // If it contains path separators or storage prefixes like primary:
    if (decoded.includes('/')) {
      const parts = decoded.split('/').filter(Boolean);
      decoded = parts[parts.length - 1];
    } else if (decoded.includes('\\')) {
      const parts = decoded.split('\\').filter(Boolean);
      decoded = parts[parts.length - 1];
    }
    return decoded;
  } catch (e) {
    return rawName;
  }
}

export function formatDecodedPath(rawPath) {
  if (!rawPath) return '';
  try {
    return decodeURIComponent(rawPath);
  } catch (e) {
    return rawPath;
  }
}

