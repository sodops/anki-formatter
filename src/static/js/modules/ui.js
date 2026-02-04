/**
 * UI Utilities Module
 * Modal interactions, toasts, color picker
 */

import { dom } from './dom.js';

/**
 * Show toast notification
 * @param {string} msg - Message to display
 * @param {string} type - Type: 'success' | 'error' | 'info'
 */
export function showToast(msg, type = 'success') {
    dom.toast.textContent = msg;
    dom.toast.classList.remove('hidden');
    setTimeout(() => {
        dom.toast.classList.add('hidden');
    }, 3000);
}

/**
 * Show prompt modal for text input
 * @param {string} title - Prompt title
 * @param {string} defaultValue - Default input value
 * @returns {Promise<string|null>} Input value or null if canceled
 */
export function prompt(title, defaultValue = '') {
    return new Promise((resolve) => {
        dom.customModalTitle.textContent = title;
        dom.customModalContent.textContent = '';
        dom.customModalInputContainer.classList.remove('hidden');
        dom.customModalInput.value = defaultValue;
        
        dom.btnModalCancel.style.display = 'block';
        dom.btnModalConfirm.textContent = 'OK';
        
        const close = (val) => {
            dom.customModal.classList.add('hidden');
            dom.customModalInput.value = '';
            cleanUp();
            resolve(val);
        };

        const confirmHandler = () => close(dom.customModalInput.value);
        const cancelHandler = () => close(null);
        const keyHandler = (e) => {
            if (e.key === 'Enter') confirmHandler();
            if (e.key === 'Escape') cancelHandler();
        };

        const cleanUp = () => {
            dom.btnModalConfirm.removeEventListener('click', confirmHandler);
            dom.btnModalCancel.removeEventListener('click', cancelHandler);
            dom.customModalInput.removeEventListener('keydown', keyHandler);
        };

        dom.btnModalConfirm.addEventListener('click', confirmHandler);
        dom.btnModalCancel.addEventListener('click', cancelHandler);
        dom.customModalInput.addEventListener('keydown', keyHandler);

        dom.customModal.classList.remove('hidden');
        dom.customModalInput.focus();
    });
}

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} True if confirmed, false if canceled
 */
export function confirm(message) {
    return new Promise((resolve) => {
        dom.customModalTitle.textContent = 'Confirm';
        dom.customModalContent.textContent = message;
        dom.customModalInputContainer.classList.add('hidden');
        
        dom.btnModalCancel.style.display = 'block';
        dom.btnModalConfirm.textContent = 'Yes';
        
        const close = (val) => {
            dom.customModal.classList.add('hidden');
            cleanUp();
            resolve(val);
        };

        const confirmHandler = () => close(true);
        const cancelHandler = () => close(false);

        const cleanUp = () => {
            dom.btnModalConfirm.removeEventListener('click', confirmHandler);
            dom.btnModalCancel.removeEventListener('click', cancelHandler);
        };

        dom.btnModalConfirm.addEventListener('click', confirmHandler);
        dom.btnModalCancel.addEventListener('click', cancelHandler);

        dom.customModal.classList.remove('hidden');
    });
}

/**
 * Show alert dialog
 * @param {string} message - Alert message
 * @returns {Promise<void>}
 */
export function alert(message) {
    return new Promise((resolve) => {
        dom.customModalTitle.textContent = 'Notice';
        dom.customModalContent.textContent = message;
        dom.customModalInputContainer.classList.add('hidden');
        
        dom.btnModalCancel.style.display = 'none';
        dom.btnModalConfirm.textContent = 'OK';
        
        const close = () => {
            dom.customModal.classList.add('hidden');
            cleanUp();
            resolve();
        };

        const confirmHandler = () => close();
        const cleanUp = () => dom.btnModalConfirm.removeEventListener('click', confirmHandler);

        dom.btnModalConfirm.addEventListener('click', confirmHandler);
        dom.customModal.classList.remove('hidden');
    });
}

/**
 * Show color picker modal
 * @param {string} currentColor - Current color value
 * @param {boolean} gradient - Whether gradient is enabled
 * @returns {Promise<{color: string, gradient: boolean}|null>}
 */
export function colorPicker(currentColor, gradient) {
    return new Promise((resolve) => {
        // Create color picker modal content
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Choose Color:</label>
                <input type="color" id="tempColorInput" value="${currentColor}" style="width: 100%; height: 40px; border: none; border-radius: 4px; cursor: pointer;">
            </div>
            <div>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="tempGradientCheckbox" ${gradient ? 'checked' : ''}>
                    <span>Enable Gradient</span>
                </label>
            </div>
        `;
        
        dom.customModalTitle.textContent = 'Deck Color';
        dom.customModalContent.innerHTML = '';
        dom.customModalContent.appendChild(content);
        dom.customModalInputContainer.classList.add('hidden');
        
        dom.btnModalCancel.style.display = 'block';
        dom.btnModalConfirm.textContent = 'Apply';
        
        const colorInput = document.getElementById('tempColorInput');
        const gradientCheckbox = document.getElementById('tempGradientCheckbox');
        
        const close = (val) => {
            dom.customModal.classList.add('hidden');
            dom.customModalContent.innerHTML = '';
            cleanUp();
            resolve(val);
        };

        const confirmHandler = () => close({
            color: colorInput.value,
            gradient: gradientCheckbox.checked
        });
        const cancelHandler = () => close(null);

        const cleanUp = () => {
            dom.btnModalConfirm.removeEventListener('click', confirmHandler);
            dom.btnModalCancel.removeEventListener('click', cancelHandler);
        };

        dom.btnModalConfirm.addEventListener('click', confirmHandler);
        dom.btnModalCancel.addEventListener('click', cancelHandler);

        dom.customModal.classList.remove('hidden');
    });
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
