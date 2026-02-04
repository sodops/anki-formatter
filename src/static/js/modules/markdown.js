/**
 * Markdown Utilities Module
 * Safe markdown rendering using marked.js
 */

import { escapeHtml } from './ui.js';

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
 * Render Markdown string to HTML
 * @param {string} text - Markdown text
 * @returns {string} Rendered HTML
 */
export function renderMarkdown(text) {
    if (!text) return '';
    // Fallback if marked is not loaded
    if (typeof marked === 'undefined') return escapeHtml(text);
    
    try {
        const html = marked.parse(text, { breaks: true, gfm: true });
        return html;
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
