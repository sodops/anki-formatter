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
