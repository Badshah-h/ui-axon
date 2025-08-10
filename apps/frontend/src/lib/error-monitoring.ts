import { AxonPulsEvent } from '@/types/workflow';

export interface ErrorContext {
  userId?: string;
  workflowId?: string;
  nodeId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'ui' | 'api' | 'workflow' | 'auth' | 'system';
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  metadata?: Record<string, any>;
  fingerprint: string;
}

export class ErrorMonitoring {
  private static instance: ErrorMonitoring;
  private errorQueue: ErrorReport[] = [];
  private isOnline = true;
  private maxQueueSize = 100;
  private flushInterval = 30000; // 30 seconds
  private apiEndpoint = '/api/errors';

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.setupNetworkMonitoring();
    this.startPeriodicFlush();
  }

  static getInstance(): ErrorMonitoring {
    if (!ErrorMonitoring.instance) {
      ErrorMonitoring.instance = new ErrorMonitoring();
    }
    return ErrorMonitoring.instance;
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        severity: 'high',
        category: 'system',
        timestamp: new Date(),
      });
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        severity: 'high',
        category: 'ui',
        timestamp: new Date(),
        url: event.filename,
      });
    });

    // Handle React error boundaries
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('React') || args[0]?.includes?.('Warning')) {
        this.captureError(new Error(args.join(' ')), {
          severity: 'medium',
          category: 'ui',
          timestamp: new Date(),
        });
      }
      originalConsoleError.apply(console, args);
    };
  }

  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrors();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      if (this.isOnline && this.errorQueue.length > 0) {
        this.flushErrors();
      }
    }, this.flushInterval);
  }

  captureError(error: Error | string, context: Partial<ErrorContext> = {}): string {
    const errorId = this.generateErrorId();
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' && error.stack ? error.stack : undefined;

    const errorReport: ErrorReport = {
      id: errorId,
      message: errorMessage,
      stack,
      context: {
        timestamp: new Date(),
        severity: 'medium',
        category: 'system',
        userId: this.getCurrentUserId(),
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context,
      },
      fingerprint: this.generateFingerprint(errorMessage, stack),
    };

    this.errorQueue.push(errorReport);

    // Immediate flush for critical errors
    if (context.severity === 'critical') {
      this.flushErrors();
    }

    // Prevent queue overflow
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }

    return errorId;
  }

  captureWorkflowError(
    error: Error | string,
    workflowId: string,
    nodeId?: string,
    executionId?: string
  ): string {
    return this.captureError(error, {
      severity: 'high',
      category: 'workflow',
      workflowId,
      nodeId,
      metadata: { executionId },
    });
  }

  captureAPIError(
    error: Error | string,
    endpoint: string,
    method: string,
    statusCode?: number
  ): string {
    return this.captureError(error, {
      severity: statusCode && statusCode >= 500 ? 'high' : 'medium',
      category: 'api',
      metadata: { endpoint, method, statusCode },
    });
  }

  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0 || !this.isOnline) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors: errorsToSend }),
      });

      if (!response.ok) {
        // Re-queue errors if sending failed
        this.errorQueue.unshift(...errorsToSend);
      }
    } catch (error) {
      // Re-queue errors if network request failed
      this.errorQueue.unshift(...errorsToSend);
      console.error('Failed to send error reports:', error);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(message: string, stack?: string): string {
    const content = stack || message;
    // Simple hash function for fingerprinting similar errors
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getCurrentUserId(): string | undefined {
    // Get from localStorage, session, or context
    return localStorage.getItem('userId') || undefined;
  }

  private getSessionId(): string | undefined {
    // Get from localStorage or generate
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  // Performance monitoring
  measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Partial<ErrorContext>
  ): Promise<T> {
    const startTime = performance.now();
    
    return fn().then(
      (result) => {
        const duration = performance.now() - startTime;
        
        // Log slow operations
        if (duration > 1000) {
          this.captureError(`Slow operation: ${operation} took ${duration.toFixed(2)}ms`, {
            severity: 'low',
            category: 'system',
            timestamp: new Date(),
            metadata: { operation, duration },
            ...context,
          });
        }
        
        return result;
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.captureError(error, {
          severity: 'high',
          category: 'system',
          timestamp: new Date(),
          metadata: { operation, duration },
          ...context,
        });
        throw error;
      }
    );
  }

  // Get error statistics
  getErrorStats(): {
    queueSize: number;
    isOnline: boolean;
    totalErrors: number;
  } {
    return {
      queueSize: this.errorQueue.length,
      isOnline: this.isOnline,
      totalErrors: parseInt(localStorage.getItem('totalErrors') || '0'),
    };
  }
}

// React Error Boundary Component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  private errorMonitoring = ErrorMonitoring.getInstance();

  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.errorMonitoring.captureError(error, {
      severity: 'high',
      category: 'ui',
      timestamp: new Date(),
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center">
      <div className="text-destructive mb-4">
        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">
        We've been notified about this error and are working to fix it.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
      >
        Reload Page
      </button>
    </div>
  </div>
);

// Export singleton instance
export const errorMonitoring = ErrorMonitoring.getInstance();

// React hook for error monitoring
export const useErrorMonitoring = () => {
  return {
    captureError: errorMonitoring.captureError.bind(errorMonitoring),
    captureWorkflowError: errorMonitoring.captureWorkflowError.bind(errorMonitoring),
    captureAPIError: errorMonitoring.captureAPIError.bind(errorMonitoring),
    measurePerformance: errorMonitoring.measurePerformance.bind(errorMonitoring),
    getErrorStats: errorMonitoring.getErrorStats.bind(errorMonitoring),
  };
};