class Logger {
    constructor() {
        this.logLevel = 'INFO'; 
        this.maxLogs = 1000; 
        this.logs = [];
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.init();
    }
    init() {
        window.addEventListener('error', (event) => {
            this.error('Global error caught', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled promise rejection', {
                reason: event.reason,
                promise: event.promise
            });
        });
        this.info('Logger initialized', {
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.href
        });
        setInterval(() => this.cleanup(), 60000); 
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    log(level, message, data = {}, error = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp,
            sessionId: this.sessionId,
            level,
            message,
            data: this.sanitizeData(data),
            error: error ? this.serializeError(error) : null,
            url: window.location.href,
            userAgent: navigator.userAgent,
            performance: {
                memory: this.getMemoryInfo(),
                timing: this.getPerformanceTiming()
            }
        };
        this.logs.push(logEntry);
        this.consoleOutput(logEntry);
        this.persistLog(logEntry);
        this.sendToAnalytics(logEntry);
        return logEntry;
    }
    debug(message, data = {}) {
        if (this.shouldLog('DEBUG')) {
            return this.log('DEBUG', message, data);
        }
    }
    info(message, data = {}) {
        if (this.shouldLog('INFO')) {
            return this.log('INFO', message, data);
        }
    }
    warn(message, data = {}) {
        if (this.shouldLog('WARN')) {
            return this.log('WARN', message, data);
        }
    }
    error(message, data = {}, error = null) {
        if (this.shouldLog('ERROR')) {
            return this.log('ERROR', message, data, error);
        }
    }
    performance(action, duration, data = {}) {
        return this.info(`Performance: ${action}`, {
            ...data,
            duration: `${duration}ms`,
            performance: true
        });
    }
    userAction(action, data = {}) {
        return this.info(`User Action: ${action}`, {
            ...data,
            userAction: true,
            userId: this.getCurrentUserId()
        });
    }
    security(event, data = {}) {
        return this.warn(`Security Event: ${event}`, {
            ...data,
            security: true,
            userId: this.getCurrentUserId()
        });
    }
    apiCall(method, url, status, duration, data = {}) {
        const level = status >= 400 ? 'ERROR' : 'INFO';
        return this.log(level, `API Call: ${method} ${url}`, {
            ...data,
            method,
            url,
            status,
            duration: `${duration}ms`,
            apiCall: true
        });
    }
    encryption(operation, algorithm, duration, data = {}) {
        return this.info(`Encryption: ${operation}`, {
            ...data,
            algorithm,
            duration: `${duration}ms`,
            encryption: true
        });
    }
    query(type, parameters, results, duration, data = {}) {
        return this.info(`Query: ${type}`, {
            ...data,
            parameters: this.sanitizeQueryParams(parameters),
            resultCount: results,
            duration: `${duration}ms`,
            query: true
        });
    }
    shouldLog(level) {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
    sanitizeData(data) {
        const sanitized = { ...data };
        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
        for (const key in sanitized) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            }
        }
        return sanitized;
    }
    sanitizeQueryParams(params) {
        const sanitized = { ...params };
        if (sanitized.latitude) {
            sanitized.latitude = this.fuzzyLocation(sanitized.latitude);
        }
        if (sanitized.longitude) {
            sanitized.longitude = this.fuzzyLocation(sanitized.longitude);
        }
        return sanitized;
    }
    fuzzyLocation(coordinate) {
        const offset = (Math.random() - 0.5) * 0.01; // ~1km max offset
        return (parseFloat(coordinate) + offset).toFixed(4);
    }
    serializeError(error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause
        };
    }
    consoleOutput(logEntry) {
        const { level, message, data, timestamp } = logEntry;
        const timeStr = new Date(timestamp).toLocaleTimeString();
        const styles = {
            DEBUG: 'color: #6B7280; background: #F9FAFB',
            INFO: 'color: #3B82F6; background: #EFF6FF',
            WARN: 'color: #F59E0B; background: #FFFBEB',
            ERROR: 'color: #EF4444; background: #FEF2F2'
        };
        const style = styles[level] || styles.INFO;
        console.groupCollapsed(
            `%c[${level}] ${timeStr} - ${message}`,
            `${style}; padding: 2px 6px; border-radius: 3px; font-weight: bold;`
        );
        if (Object.keys(data).length > 0) {
            console.log('Data:', data);
        }
        if (logEntry.error) {
            console.error('Error:', logEntry.error);
        }
        console.log('Full Log Entry:', logEntry);
        console.groupEnd();
    }
    persistLog(logEntry) {
        try {
            const existingLogs = JSON.parse(localStorage.getItem('eplq_logs') || '[]');
            existingLogs.push(logEntry);
            const recentLogs = existingLogs.slice(-this.maxLogs);
            localStorage.setItem('eplq_logs', JSON.stringify(recentLogs));
        } catch (error) {
            console.warn('Failed to persist log:', error);
        }
    }
    sendToAnalytics(logEntry) {
        if (logEntry.level === 'ERROR' || logEntry.data.userAction || logEntry.data.performance) {
            console.debug('Analytics event:', {
                event: logEntry.level === 'ERROR' ? 'error' : 'user_action',
                properties: {
                    message: logEntry.message,
                    level: logEntry.level,
                    sessionId: logEntry.sessionId,
                    timestamp: logEntry.timestamp
                }
            });
        }
    }
    getMemoryInfo() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }
    getPerformanceTiming() {
        if (performance.timing) {
            const timing = performance.timing;
            return {
                pageLoad: timing.loadEventEnd - timing.navigationStart,
                domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: performance.getEntriesByType('paint')[0]?.startTime || null
            };
        }
        return null;
    }
    getCurrentUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('eplq_user') || '{}');
            return user.uid || 'anonymous';
        } catch {
            return 'anonymous';
        }
    }
    cleanup() {
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        try {
            const logs = JSON.parse(localStorage.getItem('eplq_logs') || '[]');
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const recentLogs = logs.filter(log => 
                new Date(log.timestamp).getTime() > oneDayAgo
            );
            localStorage.setItem('eplq_logs', JSON.stringify(recentLogs));
        } catch (error) {
            console.warn('Failed to cleanup logs:', error);
        }
    }
    exportLogs(format = 'json') {
        const logs = this.getLogs();
        if (format === 'csv') {
            return this.exportAsCSV(logs);
        } else if (format === 'txt') {
            return this.exportAsText(logs);
        }
        return JSON.stringify(logs, null, 2);
    }
    exportAsCSV(logs) {
        const headers = ['timestamp', 'level', 'message', 'sessionId', 'url'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => [
                log.timestamp,
                log.level,
                `"${log.message.replace(/"/g, '""')}"`,
                log.sessionId,
                log.url
            ].join(','))
        ].join('\n');
        
        return csvContent;
    }
    exportAsText(logs) {
        return logs.map(log => 
            `[${log.timestamp}] ${log.level}: ${log.message}`
        ).join('\n');
    }
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];
        if (filters.level) {
            filteredLogs = filteredLogs.filter(log => log.level === filters.level);
        }
        if (filters.since) {
            const sinceTime = new Date(filters.since).getTime();
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp).getTime() >= sinceTime
            );
        }
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchTerm)
            );
        }
        return filteredLogs;
    }
    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {},
            sessionDuration: Date.now() - this.startTime,
            sessionId: this.sessionId
        };
        this.logs.forEach(log => {
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        });
        return stats;
    }
    setLogLevel(level) {
        const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        if (validLevels.includes(level)) {
            this.logLevel = level;
            this.info('Log level changed', { newLevel: level });
        } else {
            this.warn('Invalid log level', { attempted: level, valid: validLevels });
        }
    }
}
const Logger = new Logger();
window.Logger = Logger;