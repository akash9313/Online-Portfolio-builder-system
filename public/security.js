/**
 * Security & Sanitization Helpers for PortfolioX
 * Protects against XSS (Cross-Site Scripting), URL manipulation, and injection.
 */

/**
 * Escapes special HTML characters in a string to prevent XSS injection.
 * @param {string|any} str 
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') str = String(str);
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes URLs to allow only safe protocols (http, https, mailto, tel).
 * Prevents javascript: or data: URI execution.
 * @param {string} url 
 * @param {string} fallback 
 * @returns {string}
 */
export function sanitizeUrl(url, fallback = '#') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  
  // Allow relative URLs starting with / or #
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return escapeHTML(trimmed);
  
  try {
    const parsed = new URL(trimmed);
    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (safeProtocols.includes(parsed.protocol.toLowerCase())) {
      return escapeHTML(trimmed);
    }
  } catch (e) {
    // If URL parsing fails, check basic relative path safety
    if (/^[a-zA-Z0-9_\-\/\.\?=\&]+$/.test(trimmed)) {
      return escapeHTML(trimmed);
    }
  }
  
  return fallback;
}

/**
 * Validates template filename to restrict access to trusted templates inside /public/templates.
 * @param {string} templatePath 
 * @returns {boolean}
 */
export function isValidTemplatePath(templatePath) {
  if (!templatePath || typeof templatePath !== 'string') return false;
  // Must start with templates/ and contain no directory traversal (..)
  if (templatePath.includes('..')) return false;
  return /^templates\/[a-zA-Z0-9_\-]+\.html$/.test(templatePath);
}

// Make functions available globally for non-ES module scripts
if (typeof window !== 'undefined') {
  window.PortfolioXSecurity = {
    escapeHTML,
    sanitizeUrl,
    isValidTemplatePath
  };
}
