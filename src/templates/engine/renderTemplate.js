/**
 * Simple template rendering engine
 * Supports:
 * - {{var}} - HTML-escaped variables
 * - {{{var}}} - Raw (unescaped) variables
 */

/**
 * HTML escape special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render template with context
 * 
 * @param {string} template - Template content
 * @param {Object} context - Context object with variables
 * @returns {string} Rendered HTML
 */
export function renderTemplate(template, context = {}) {
  let output = template;

  // Replace {{{raw}}} variables (unescaped)
  output = output.replace(/\{\{\{(\w+)\}\}\}/g, (match, key) => {
    return context[key] != null ? String(context[key]) : '';
  });

  // Replace {{escaped}} variables (HTML-escaped)
  output = output.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key] != null ? escapeHtml(context[key]) : '';
  });

  return output;
}
