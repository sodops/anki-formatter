/**
 * Logger Module
 * Centralized logging for debugging and error tracking
 */

class Logger {
    constructor(name = 'App') {
        this.name = name;
        this.isDev = true; // Can be set from environment
        this.logs = []; // Keep last 100 logs
        this.maxLogs = 100;
    }

    /**
     * Log info message
     */
    info(message, data = null) {
        this._log('INFO', message, data);
    }

    /**
     * Log warning message
     */
    warn(message, data = null) {
        console.warn(`[${this.name}]`, message, data);
        this._log('WARN', message, data);
    }

    /**
     * Log error message
     */
    error(message, error = null) {
        console.error(`[${this.name}]`, message, error);
        this._log('ERROR', message, error);
    }

    /**
     * Log debug message
     */
    debug(message, data = null) {
        if (this.isDev) {
            console.debug(`[${this.name}]`, message, data);
        }
        this._log('DEBUG', message, data);
    }

    /**
     * Internal log storage
     */
    _log(level, message, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            logger: this.name
        };

        this.logs.push(logEntry);

        // Keep only last N logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    /**
     * Get all logs
     */
    getLogs(level = null) {
        if (level) {
            return this.logs.filter(log => log.level === level);
        }
        return this.logs;
    }

    /**
     * Export logs for debugging
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
    }
}

// Export singleton instances for different modules
export const appLogger = new Logger('AnkiFlow');
export const storeLogger = new Logger('Store');
export const uiLogger = new Logger('UI');
export const studyLogger = new Logger('Study');

// Global error handler
export function setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
        appLogger.error('Uncaught error:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            error: event.error?.stack
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        appLogger.error('Unhandled promise rejection:', {
            reason: event.reason,
            promise: event.promise
        });
    });
}
