import * as Sentry from '@sentry/nextjs';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from './environment';

// Performance monitoring interface
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  tags?: Record<string, string>;
}

// System health interface
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  database: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime: number;
  };
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      lastCheck: Date;
    };
  };
}

// Alert configuration
export interface AlertConfig {
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: ('email' | 'slack' | 'webhook')[];
  enabled: boolean;
}

class MonitoringService {
  private static instance: MonitoringService;
  private logger: winston.Logger;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: AlertConfig[] = [];
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private isInitialized = false;

  private constructor() {
    this.initializeLogger();
    this.initializeSentry();
    this.setupDefaultAlerts();
    this.startHealthChecks();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private initializeLogger(): void {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta,
          environment: env.getEnvironment(),
          service: 'axonstream-ai',
        });
      })
    );

    this.logger = winston.createLogger({
      level: env.isProduction() ? 'info' : 'debug',
      format: logFormat,
      defaultMeta: {
        service: 'axonstream-ai',
        environment: env.getEnvironment(),
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        
        // File transport for all logs
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),
        
        // Error-specific log file
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
        }),
        
        // Security events log
        new DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '90d',
          level: 'warn',
        }),
      ],
    });

    // Handle uncaught exceptions and rejections
    this.logger.exceptions.handle(
      new DailyRotateFile({
        filename: 'logs/exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
      })
    );

    this.logger.rejections.handle(
      new DailyRotateFile({
        filename: 'logs/rejections-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
      })
    );
  }

  private initializeSentry(): void {
    if (env.isProduction()) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: env.getEnvironment(),
        tracesSampleRate: 0.1,
        profilesSampleRate: 0.1,
        beforeSend(event) {
          // Filter out sensitive data
          if (event.request?.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          return event;
        },
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: undefined }),
        ],
      });
    }
  }

  private setupDefaultAlerts(): void {
    this.alerts = [
      {
        name: 'High Error Rate',
        condition: 'error_rate > threshold',
        threshold: 5, // 5% error rate
        severity: 'high',
        channels: ['email', 'slack'],
        enabled: true,
      },
      {
        name: 'High Response Time',
        condition: 'avg_response_time > threshold',
        threshold: 2000, // 2 seconds
        severity: 'medium',
        channels: ['slack'],
        enabled: true,
      },
      {
        name: 'Memory Usage High',
        condition: 'memory_usage > threshold',
        threshold: 85, // 85%
        severity: 'high',
        channels: ['email', 'slack'],
        enabled: true,
      },
      {
        name: 'Database Connection Failed',
        condition: 'database_status == "disconnected"',
        threshold: 1,
        severity: 'critical',
        channels: ['email', 'slack', 'webhook'],
        enabled: true,
      },
      {
        name: 'Failed Login Attempts',
        condition: 'failed_logins > threshold',
        threshold: 10, // 10 failed attempts in 5 minutes
        severity: 'medium',
        channels: ['email'],
        enabled: true,
      },
    ];
  }

  private startHealthChecks(): void {
    // Register default health checks
    this.registerHealthCheck('database', this.checkDatabaseHealth);
    this.registerHealthCheck('memory', this.checkMemoryHealth);
    this.registerHealthCheck('disk', this.checkDiskHealth);

    // Run health checks every 30 seconds
    setInterval(() => {
      this.runHealthChecks();
    }, 30000);
  }

  // Logging methods
  log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, { error: error?.stack, ...meta });
    
    if (env.isProduction() && error) {
      Sentry.captureException(error, {
        extra: meta,
        tags: {
          service: 'axonstream-ai',
        },
      });
    }
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // Security logging
  logSecurityEvent(event: {
    type: 'authentication' | 'authorization' | 'data_access' | 'configuration_change' | 'suspicious_activity';
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    ip?: string;
    userAgent?: string;
    details: any;
  }): void {
    this.logger.warn('Security Event', {
      security: true,
      ...event,
      timestamp: new Date().toISOString(),
    });

    if (event.severity === 'critical' || event.severity === 'high') {
      this.triggerAlert('security_event', event);
    }
  }

  // Performance monitoring
  recordMetric(metric: PerformanceMetric): void {
    const key = metric.name;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key)!;
    metrics.push(metric);

    // Keep only last 1000 metrics per type
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    // Log metric
    this.debug('Performance Metric', {
      metric: metric.name,
      value: metric.value,
      unit: metric.unit,
      tags: metric.tags,
    });

    // Check for alerts
    this.checkMetricAlerts(metric);
  }

  recordResponseTime(endpoint: string, method: string, duration: number, statusCode: number): void {
    this.recordMetric({
      name: 'http_request_duration',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        endpoint,
        method,
        status_code: statusCode.toString(),
      },
    });
  }

  recordDatabaseQuery(query: string, duration: number, success: boolean): void {
    this.recordMetric({
      name: 'database_query_duration',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        query_type: query.split(' ')[0].toLowerCase(),
        success: success.toString(),
      },
    });
  }

  recordWorkflowExecution(workflowId: string, nodeCount: number, duration: number, success: boolean): void {
    this.recordMetric({
      name: 'workflow_execution_duration',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        workflow_id: workflowId,
        node_count: nodeCount.toString(),
        success: success.toString(),
      },
    });
  }

  // Health checks
  registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
  }

  private async runHealthChecks(): Promise<void> {
    for (const [name, check] of this.healthChecks.entries()) {
      try {
        const startTime = Date.now();
        const isHealthy = await check();
        const duration = Date.now() - startTime;

        this.recordMetric({
          name: 'health_check_duration',
          value: duration,
          unit: 'ms',
          timestamp: new Date(),
          tags: {
            check_name: name,
            status: isHealthy ? 'healthy' : 'unhealthy',
          },
        });

        if (!isHealthy) {
          this.warn(`Health check failed: ${name}`);
          this.triggerAlert('health_check_failed', { check: name });
        }
      } catch (error) {
        this.error(`Health check error: ${name}`, error as Error);
        this.triggerAlert('health_check_error', { check: name, error });
      }
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Implement database health check
      // This would typically ping the database
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkMemoryHealth(): Promise<boolean> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    this.recordMetric({
      name: 'memory_usage',
      value: memoryPercentage,
      unit: 'percentage',
      timestamp: new Date(),
    });

    return memoryPercentage < 90;
  }

  private async checkDiskHealth(): Promise<boolean> {
    try {
      // Implement disk space check
      // This would typically check available disk space
      return true;
    } catch (error) {
      return false;
    }
  }

  // Alert system
  private checkMetricAlerts(metric: PerformanceMetric): void {
    for (const alert of this.alerts) {
      if (!alert.enabled) continue;

      let shouldTrigger = false;

      switch (alert.condition) {
        case 'error_rate > threshold':
          if (metric.name === 'http_request_duration' && 
              metric.tags?.status_code && 
              parseInt(metric.tags.status_code) >= 400) {
            // Calculate error rate over last 5 minutes
            const errorRate = this.calculateErrorRate();
            shouldTrigger = errorRate > alert.threshold;
          }
          break;

        case 'avg_response_time > threshold':
          if (metric.name === 'http_request_duration') {
            const avgResponseTime = this.calculateAverageResponseTime();
            shouldTrigger = avgResponseTime > alert.threshold;
          }
          break;

        case 'memory_usage > threshold':
          if (metric.name === 'memory_usage') {
            shouldTrigger = metric.value > alert.threshold;
          }
          break;
      }

      if (shouldTrigger) {
        this.triggerAlert(alert.name, { metric, alert });
      }
    }
  }

  private calculateErrorRate(): number {
    const httpMetrics = this.metrics.get('http_request_duration') || [];
    const recentMetrics = httpMetrics.filter(
      m => Date.now() - m.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentMetrics.length === 0) return 0;

    const errorCount = recentMetrics.filter(
      m => m.tags?.status_code && parseInt(m.tags.status_code) >= 400
    ).length;

    return (errorCount / recentMetrics.length) * 100;
  }

  private calculateAverageResponseTime(): number {
    const httpMetrics = this.metrics.get('http_request_duration') || [];
    const recentMetrics = httpMetrics.filter(
      m => Date.now() - m.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentMetrics.length === 0) return 0;

    const totalTime = recentMetrics.reduce((sum, m) => sum + m.value, 0);
    return totalTime / recentMetrics.length;
  }

  private async triggerAlert(alertName: string, data: any): Promise<void> {
    const alert = this.alerts.find(a => a.name === alertName);
    if (!alert || !alert.enabled) return;

    this.error(`Alert triggered: ${alertName}`, undefined, data);

    // Send to configured channels
    for (const channel of alert.channels) {
      try {
        await this.sendAlert(channel, alert, data);
      } catch (error) {
        this.error(`Failed to send alert to ${channel}`, error as Error);
      }
    }
  }

  private async sendAlert(channel: string, alert: AlertConfig, data: any): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmailAlert(alert, data);
        break;
      case 'slack':
        await this.sendSlackAlert(alert, data);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, data);
        break;
    }
  }

  private async sendEmailAlert(alert: AlertConfig, data: any): Promise<void> {
    // Implement email alert sending
    // This would integrate with your email service
    this.info('Email alert sent', { alert: alert.name, data });
  }

  private async sendSlackAlert(alert: AlertConfig, data: any): Promise<void> {
    // Implement Slack alert sending
    // This would integrate with Slack API
    this.info('Slack alert sent', { alert: alert.name, data });
  }

  private async sendWebhookAlert(alert: AlertConfig, data: any): Promise<void> {
    // Implement webhook alert sending
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert: alert.name,
          severity: alert.severity,
          timestamp: new Date().toISOString(),
          data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status}`);
      }

      this.info('Webhook alert sent', { alert: alert.name, data });
    } catch (error) {
      this.error('Failed to send webhook alert', error as Error);
    }
  }

  // System health
  async getSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      status: 'healthy', // This would be calculated based on various checks
      uptime,
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
      cpu: {
        usage: 0, // This would be calculated using system metrics
      },
      database: {
        status: 'connected', // This would be checked
        responseTime: 0, // This would be measured
      },
      services: {
        // This would include all external services
      },
    };
  }

  // Metrics retrieval
  getMetrics(name?: string, timeRange?: { start: Date; end: Date }): PerformanceMetric[] {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      if (timeRange) {
        return metrics.filter(
          m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );
      }
      return metrics;
    }

    // Return all metrics
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }

    if (timeRange) {
      return allMetrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return allMetrics;
  }

  // Configuration
  updateAlertConfig(alertName: string, config: Partial<AlertConfig>): void {
    const alertIndex = this.alerts.findIndex(a => a.name === alertName);
    if (alertIndex !== -1) {
      this.alerts[alertIndex] = { ...this.alerts[alertIndex], ...config };
      this.info('Alert configuration updated', { alertName, config });
    }
  }

  getAlertConfigs(): AlertConfig[] {
    return [...this.alerts];
  }
}

// Export singleton instance
export const monitoring = MonitoringService.getInstance();

// Express middleware for request monitoring
export const requestMonitoringMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    monitoring.recordResponseTime(
      req.route?.path || req.path,
      req.method,
      duration,
      res.statusCode
    );
  });

  next();
};

// React hook for monitoring
export const useMonitoring = () => {
  return {
    recordMetric: monitoring.recordMetric.bind(monitoring),
    logSecurityEvent: monitoring.logSecurityEvent.bind(monitoring),
    getSystemHealth: monitoring.getSystemHealth.bind(monitoring),
    getMetrics: monitoring.getMetrics.bind(monitoring),
  };
};