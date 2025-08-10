import * as Sentry from '@sentry/nextjs';

// Browser-compatible monitoring system
export interface ErrorInfo {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class ErrorMonitoring {
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize Sentry for browser
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
        beforeSend(event) {
          // Filter out development errors
          if (process.env.NODE_ENV === 'development') {
            return null;
          }
          return event;
        },
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize error monitoring:', error);
    }
  }

  captureError(error: Error, info?: ErrorInfo) {
    try {
      if (this.isInitialized) {
        Sentry.withScope((scope) => {
          if (info) {
            scope.setLevel(info.severity as any);
            scope.setTag('category', info.category);
            scope.setContext('errorInfo', info);
          }
          Sentry.captureException(error);
        });
      } else {
        console.error('Error captured:', error, info);
      }
    } catch (captureError) {
      console.error('Failed to capture error:', captureError);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    try {
      if (this.isInitialized) {
        Sentry.captureMessage(message, level as any);
      } else {
        console.log(`[${level.toUpperCase()}] ${message}`);
      }
    } catch (error) {
      console.error('Failed to capture message:', error);
    }
  }

  setUser(user: { id: string; email?: string; username?: string }) {
    try {
      if (this.isInitialized) {
        Sentry.setUser(user);
      }
    } catch (error) {
      console.error('Failed to set user:', error);
    }
  }

  addBreadcrumb(message: string, category?: string, data?: any) {
    try {
      if (this.isInitialized) {
        Sentry.addBreadcrumb({
          message,
          category,
          data,
          timestamp: Date.now() / 1000,
        });
      }
    } catch (error) {
      console.error('Failed to add breadcrumb:', error);
    }
  }

  recordPerformanceMetric(metric: PerformanceMetric) {
    try {
      // Use browser Performance API
      if (typeof window !== 'undefined' && window.performance) {
        // Record custom metric
        console.log('Performance metric:', metric);
      }
    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }
}

// Browser-compatible logger
class Logger {
  private context: string = 'AxonStreamAI';

  setContext(context: string) {
    this.context = context;
  }

  info(message: string, meta?: any) {
    console.log(`[${this.context}] INFO: ${message}`, meta || '');
  }

  warn(message: string, meta?: any) {
    console.warn(`[${this.context}] WARN: ${message}`, meta || '');
  }

  error(message: string, meta?: any) {
    console.error(`[${this.context}] ERROR: ${message}`, meta || '');
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] DEBUG: ${message}`, meta || '');
    }
  }
}

// Export instances
export const errorMonitoring = new ErrorMonitoring();
export const logger = new Logger();

// Initialize on import
if (typeof window !== 'undefined') {
  errorMonitoring.initialize();
}