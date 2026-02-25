/**
 * Reusable loading and error UI components
 */

import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = "md", 
  message, 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "1.5rem",
    md: "2.5rem",
    lg: "4rem",
  };

  const spinnerStyle: React.CSSProperties = {
    width: sizeMap[size],
    height: sizeMap[size],
    border: "3px solid var(--border)",
    borderTop: "3px solid var(--accent)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  };

  const containerStyle: React.CSSProperties = fullScreen
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        background: "var(--bg-primary)",
        zIndex: 9999,
      }
    : {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
      };

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={containerStyle}>
        <div style={spinnerStyle} role="status" aria-label="Loading"></div>
        {message && (
          <p style={{ 
            color: "var(--text-secondary)", 
            fontSize: "0.9rem",
            margin: 0 
          }}>
            {message}
          </p>
        )}
      </div>
    </>
  );
}

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  fullScreen?: boolean;
}

export function ErrorMessage({
  title = "Xatolik",
  message,
  onRetry,
  onDismiss,
  fullScreen = false,
}: ErrorMessageProps) {
  const containerStyle: React.CSSProperties = fullScreen
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "var(--bg-primary)",
        zIndex: 9999,
      }
    : {
        padding: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "2rem",
    maxWidth: "450px",
    width: "100%",
    textAlign: "center",
  };

  const iconStyle: React.CSSProperties = {
    fontSize: "3rem",
    marginBottom: "1rem",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "0 0 0.5rem 0",
  };

  const messageStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    margin: "0 0 1.5rem 0",
    lineHeight: 1.5,
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: "0.625rem 1.25rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s",
  };

  const retryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: "var(--accent)",
    color: "white",
  };

  const dismissButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: "var(--bg-tertiary)",
    color: "var(--text-primary)",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={iconStyle}><ion-icon name="alert-circle" style={{ fontSize: 'inherit' }}></ion-icon></div>
        <h3 style={titleStyle}>{title}</h3>
        <p style={messageStyle}>{message}</p>
        <div style={buttonContainerStyle}>
          {onRetry && (
            <button style={retryButtonStyle} onClick={onRetry}>
              Qaytadan urinish
            </button>
          )}
          {onDismiss && (
            <button style={dismissButtonStyle} onClick={onDismiss}>
              Yopish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function SuccessMessage({ message, onDismiss }: SuccessMessageProps) {
  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: "1rem",
    right: "1rem",
    background: "var(--success, #22c55e)",
    color: "white",
    padding: "1rem 1.5rem",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    zIndex: 10000,
    animation: "slideInRight 0.3s ease-out",
  };

  const closeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "white",
    fontSize: "1.25rem",
    cursor: "pointer",
    padding: 0,
    marginLeft: "0.5rem",
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div style={containerStyle} role="alert">
        <ion-icon name="checkmark-circle" style={{ fontSize: '1.25rem' }}></ion-icon>
        <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{message}</span>
        {onDismiss && (
          <button style={closeButtonStyle} onClick={onDismiss} aria-label="Close">
            ×
          </button>
        )}
      </div>
    </>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "mail-open-outline",
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const containerStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "3rem 1rem",
  };

  const iconStyle: React.CSSProperties = {
    fontSize: "4rem",
    marginBottom: "1rem",
    opacity: 0.5,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: "0 0 0.5rem 0",
  };

  const messageStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
    margin: "0 0 1.5rem 0",
    maxWidth: "400px",
    marginLeft: "auto",
    marginRight: "auto",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "0.75rem 1.5rem",
    background: "var(--accent)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={containerStyle}>
      <div style={iconStyle}><ion-icon name={icon} style={{ fontSize: 'inherit' }}></ion-icon></div>
      <h3 style={titleStyle}>{title}</h3>
      <p style={messageStyle}>{message}</p>
      {actionLabel && onAction && (
        <button style={buttonStyle} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
