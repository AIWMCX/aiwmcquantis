 /**
  * HTML Sanitization Utility for DocsStudio
  * 
  * SECURITY: All user-generated HTML content MUST be sanitized before rendering
  * to prevent XSS (Cross-Site Scripting) attacks.
  * 
  * This module uses DOMPurify with a strict whitelist of allowed tags and attributes.
  */
 
 import DOMPurify from 'dompurify';
 
 // Strict whitelist for document preview - only safe formatting tags
 const ALLOWED_TAGS = [
   // Structure
   'div', 'span', 'p', 'br', 'hr',
   // Headings
   'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
   // Lists
   'ul', 'ol', 'li',
   // Tables
   'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
   // Text formatting
   'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'sub', 'sup',
   // Other safe elements
   'blockquote', 'pre', 'code',
 ];
 
 // Only allow safe attributes - NO event handlers, NO javascript: URLs
 const ALLOWED_ATTR = [
   'style',
   'class',
   'id',
   // Table attributes
   'colspan',
   'rowspan',
   'align',
   'valign',
 ];
 
 // Disallow dangerous CSS properties
 const FORBID_CSS = [
   'behavior',
   '-moz-binding',
   'expression',
 ];
 
 /**
  * Sanitize HTML content for safe rendering in document preview
  * 
  * @param dirtyHTML - Raw HTML string that may contain user input
  * @returns Sanitized HTML safe for dangerouslySetInnerHTML
  * 
  * @example
  * const safeHTML = sanitizePreviewHTML(`<div>${userInput}</div>`);
  * <div dangerouslySetInnerHTML={{ __html: safeHTML }} />
  */
 export function sanitizePreviewHTML(dirtyHTML: string): string {
   if (!dirtyHTML) return '';
 
   // Configure DOMPurify with strict settings
   const clean = DOMPurify.sanitize(dirtyHTML, {
     ALLOWED_TAGS,
     ALLOWED_ATTR,
     // Block all URI schemes except safe ones
     ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
     // Remove any dangerous elements completely
     FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta'],
     FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onsubmit', 'onchange', 'onkeydown', 'onkeyup', 'onkeypress'],
     // Keep safe for HTML output
     RETURN_DOM: false,
     RETURN_DOM_FRAGMENT: false,
   });
 
   return clean;
 }
 
 /**
  * Escape a string for safe inclusion in HTML
  * Use this for individual field values before template insertion
  * 
  * @param str - Raw string that may contain HTML/JS injection attempts
  * @returns Escaped string safe for HTML context
  */
 export function escapeHTML(str: string | null | undefined): string {
   if (!str) return '';
   
   return str
     .replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&#039;');
 }
 
 /**
  * Pre-process all form values before template string interpolation
  * This ensures user-entered values cannot inject HTML/JS
  * 
  * @param values - Object containing form field values
  * @returns Same object with all string values escaped
  */
 export function escapeFormValues<T extends Record<string, unknown>>(values: T): T {
   const escaped: Record<string, unknown> = {};
   
   for (const [key, value] of Object.entries(values)) {
     if (typeof value === 'string') {
       escaped[key] = escapeHTML(value);
     } else if (Array.isArray(value)) {
       escaped[key] = value.map(item => {
         if (typeof item === 'string') {
           return escapeHTML(item);
         } else if (typeof item === 'object' && item !== null) {
           return escapeFormValues(item as Record<string, unknown>);
         }
         return item;
       });
     } else if (typeof value === 'object' && value !== null) {
       escaped[key] = escapeFormValues(value as Record<string, unknown>);
     } else {
       escaped[key] = value;
     }
   }
   
   return escaped as T;
 }