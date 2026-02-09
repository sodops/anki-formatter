/**
 * Markdown Utilities Module
 * Safe markdown rendering using marked.js
 */

import { escapeHtml } from '../ui/components/ui.js';

/**
 * Configure marked.js options
 */
export function setupMarked() {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
    }
}

/**
 * Sanitize HTML to prevent XSS
 * Strips dangerous tags and attributes
 * @param {string} html - Raw HTML string
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html) {
    const ALLOWED_TAGS = new Set([
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del',
        'code', 'pre', 'blockquote', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'hr', 'sub', 'sup', 'mark', 'table', 'thead',
        'tbody', 'tr', 'th', 'td', 'span', 'div'
    ]);
    const ALLOWED_ATTRS = new Set(['href', 'title', 'class', 'id']);
    
    const template = document.createElement('template');
    template.innerHTML = html;
    
    const walker = document.createTreeWalker(
        template.content,
        NodeFilter.SHOW_ELEMENT,
        null,
        false
    );
    
    const toRemove = [];
    while (walker.nextNode()) {
        const el = walker.currentNode;
        const tag = el.tagName.toLowerCase();
        
        if (!ALLOWED_TAGS.has(tag)) {
            toRemove.push(el);
            continue;
        }
        
        // Remove dangerous attributes
        const attrs = Array.from(el.attributes);
        attrs.forEach(attr => {
            const name = attr.name.toLowerCase();
            if (!ALLOWED_ATTRS.has(name) || name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
            // Sanitize href - only allow http/https/mailto
            if (name === 'href') {
                const val = attr.value.trim().toLowerCase();
                if (val.startsWith('javascript:') || val.startsWith('data:') || val.startsWith('vbscript:')) {
                    el.removeAttribute('href');
                }
            }
        });
        
        // Force links to open in new tab
        if (tag === 'a') {
            el.setAttribute('target', '_blank');
            el.setAttribute('rel', 'noopener noreferrer');
        }
    }
    
    // Remove disallowed elements but keep their text content
    toRemove.forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
    });
    
    return template.innerHTML;
}

/**
 * Render Markdown string to HTML (sanitized)
 * @param {string} text - Markdown text
 * @returns {string} Rendered and sanitized HTML
 */
export function renderMarkdown(text) {
    if (!text) return '';
    // Fallback if marked is not loaded
    if (typeof marked === 'undefined') return escapeHtml(text);
    
    try {
        const html = marked.parse(text, { breaks: true, gfm: true });
        return sanitizeHtml(html);
    } catch (e) {
        console.error('Markdown parsing error:', e);
        return escapeHtml(text);
    }
}

/**
 * Insert markdown syntax into an input element
 * @param {HTMLInputElement} input - The input element
 * @param {string} marker - The markdown marker (e.g., '**')
 */
export function insertMarkdown(input, marker) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selected = text.substring(start, end);
    
    // Toggle logic could be complex, simple insertion for now
    // If text selected, wrap it.
    // If no text, insert marker inside: **|**
    
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    let newText = '';
    let newCursorPos = 0;
    
    if (selected) {
        newText = before + marker + selected + marker + after;
        newCursorPos = end + marker.length * 2; // Move after format
    } else {
        newText = before + marker + marker + after;
        newCursorPos = start + marker.length; // Move inside
    }
    
    input.value = newText;
    input.focus();
    input.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger input event to update state/UI if needed
    input.dispatchEvent(new Event('input', { bubbles: true }));
}
