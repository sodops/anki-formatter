/**
 * Toast notification system for user feedback
 * Usage:
 *   import { toast } from '@/lib/toast';
 *   toast.success('Muvaffaqiyatli!');
 *   toast.error('Xatolik yuz berdi');
 *   toast.info('Ma\'lumot');
 */

type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  duration?: number; // milliseconds, default 4000
  position?: "top-right" | "top-center" | "bottom-right" | "bottom-center";
}

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  position: string;
}

class ToastManager {
  private toasts: Toast[] = [];
  private container: HTMLElement | null = null;

  private ensureContainer(): HTMLElement {
    if (this.container) return this.container;

    // Create container
    this.container = document.createElement("div");
    this.container.id = "toast-container";
    this.container.style.cssText = `
      position: fixed;
      z-index: 99999;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    return this.container;
  }

  private show(type: ToastType, message: string, options: ToastOptions = {}) {
    const container = this.ensureContainer();
    const duration = options.duration ?? 4000;
    const position = options.position ?? "top-right";
    const id = `toast-${Date.now()}-${Math.random()}`;

    // Create toast element
    const toast = document.createElement("div");
    toast.id = id;
    toast.style.cssText = `
      pointer-events: auto;
      margin-bottom: 0.75rem;
      padding: 1rem 1.25rem;
      background: ${this.getBackgroundColor(type)};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9rem;
      font-weight: 500;
      min-width: 280px;
      max-width: 420px;
      animation: slideIn 0.3s ease-out;
      transition: opacity 0.2s, transform 0.2s;
    `;

    // Set position
    this.updateContainerPosition(container, position);

    // Add icon and message
    const icon = this.getIcon(type);
    toast.innerHTML = `
      <span style="font-size: 1.25rem; flex-shrink: 0;">${icon}</span>
      <span style="flex: 1;">${this.escapeHtml(message)}</span>
      <button 
        onclick="this.parentElement.remove()" 
        style="
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          opacity: 0.7;
          transition: opacity 0.2s;
        "
        onmouseover="this.style.opacity='1'"
        onmouseout="this.style.opacity='0.7'"
        aria-label="Close"
      >×</button>
    `;

    // Add to container
    container.appendChild(toast);

    // Auto-dismiss after duration
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, duration);

    // Add CSS animation
    if (!document.getElementById("toast-animations")) {
      const style = document.createElement("style");
      style.id = "toast-animations";
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  private updateContainerPosition(container: HTMLElement, position: string) {
    const positions = {
      "top-right": "top: 1rem; right: 1rem; left: auto; bottom: auto;",
      "top-center": "top: 1rem; left: 50%; transform: translateX(-50%); right: auto; bottom: auto;",
      "bottom-right": "bottom: 1rem; right: 1rem; left: auto; top: auto;",
      "bottom-center": "bottom: 1rem; left: 50%; transform: translateX(-50%); right: auto; top: auto;",
    };
    container.style.cssText += positions[position as keyof typeof positions] || positions["top-right"];
  }

  private getBackgroundColor(type: ToastType): string {
    const colors = {
      success: "#22c55e",
      error: "#ef4444",
      info: "#3b82f6",
      warning: "#f59e0b",
    };
    return colors[type];
  }

  private getIcon(type: ToastType): string {
    const icons = {
      success: "✓",
      error: "✕",
      info: "ℹ",
      warning: "⚠",
    };
    return icons[type];
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  success(message: string, options?: ToastOptions) {
    this.show("success", message, options);
  }

  error(message: string, options?: ToastOptions) {
    this.show("error", message, options);
  }

  info(message: string, options?: ToastOptions) {
    this.show("info", message, options);
  }

  warning(message: string, options?: ToastOptions) {
    this.show("warning", message, options);
  }
}

export const toast = new ToastManager();
