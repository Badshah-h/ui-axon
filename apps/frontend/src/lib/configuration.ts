import { monitoring } from './monitoring';

// Configuration types
export interface ConfigurationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    default?: any;
    validation?: (value: any) => boolean;
    description: string;
    sensitive?: boolean;
    environment?: string[];
  };
}

export interface ConfigurationValue {
  key: string;
  value: any;
  source: 'environment' | 'file' | 'database' | 'default';
  lastUpdated: Date;
  version: number;
}

export interface ConfigurationAuditLog {
  id: string;
  key: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  timestamp: Date;
  source: string;
  reason?: string;
}

class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: Map<string, ConfigurationValue> = new Map();
  private schema: ConfigurationSchema = {};
  private auditLog: ConfigurationAuditLog[] = [];
  private watchers: Map<string, Set<(value: any) => void>> = new Map();
  private encryptionKey: string;

  private constructor() {
    this.encryptionKey = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';
    this.initializeSchema();
    this.loadConfiguration();
    this.setupConfigurationWatching();
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  private initializeSchema(): void {
    this.schema = {
      // Application Configuration
      'app.name': {
        type: 'string',
        required: true,
        default: 'AxonStreamAI',
        description: 'Application name',
        environment: ['development', 'staging', 'production'],
      },
      'app.version': {
        type: 'string',
        required: true,
        default: '1.0.0',
        description: 'Application version',
        environment: ['development', 'staging', 'production'],
      },
      'app.environment': {
        type: 'string',
        required: true,
        default: 'development',
        validation: (value) => ['development', 'staging', 'production'].includes(value),
        description: 'Application environment',
        environment: ['development', 'staging', 'production'],
      },
      'app.debug': {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Enable debug mode',
        environment: ['development', 'staging'],
      },

      // Server Configuration
      'server.port': {
        type: 'number',
        required: true,
        default: 3000,
        validation: (value) => value > 0 && value < 65536,
        description: 'Server port number',
        environment: ['development', 'staging', 'production'],
      },
      'server.host': {
        type: 'string',
        required: true,
        default: '0.0.0.0',
        description: 'Server host address',
        environment: ['development', 'staging', 'production'],
      },
      'server.cors.origins': {
        type: 'array',
        required: true,
        default: ['http://localhost:3000'],
        description: 'Allowed CORS origins',
        environment: ['development', 'staging', 'production'],
      },
      'server.rateLimit.windowMs': {
        type: 'number',
        required: true,
        default: 900000, // 15 minutes
        description: 'Rate limit window in milliseconds',
        environment: ['development', 'staging', 'production'],
      },
      'server.rateLimit.max': {
        type: 'number',
        required: true,
        default: 100,
        description: 'Maximum requests per window',
        environment: ['development', 'staging', 'production'],
      },

      // Database Configuration
      'database.url': {
        type: 'string',
        required: true,
        sensitive: true,
        description: 'Database connection URL',
        environment: ['development', 'staging', 'production'],
      },
      'database.pool.min': {
        type: 'number',
        required: true,
        default: 2,
        description: 'Minimum database connections',
        environment: ['development', 'staging', 'production'],
      },
      'database.pool.max': {
        type: 'number',
        required: true,
        default: 10,
        description: 'Maximum database connections',
        environment: ['development', 'staging', 'production'],
      },
      'database.ssl': {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable SSL for database connections',
        environment: ['staging', 'production'],
      },

      // Security Configuration
      'security.jwt.accessSecret': {
        type: 'string',
        required: true,
        sensitive: true,
        description: 'JWT access token secret',
        environment: ['development', 'staging', 'production'],
      },
      'security.jwt.refreshSecret': {
        type: 'string',
        required: true,
        sensitive: true,
        description: 'JWT refresh token secret',
        environment: ['development', 'staging', 'production'],
      },
      'security.jwt.accessExpiry': {
        type: 'string',
        required: true,
        default: '15m',
        description: 'JWT access token expiry',
        environment: ['development', 'staging', 'production'],
      },
      'security.jwt.refreshExpiry': {
        type: 'string',
        required: true,
        default: '30d',
        description: 'JWT refresh token expiry',
        environment: ['development', 'staging', 'production'],
      },
      'security.bcrypt.rounds': {
        type: 'number',
        required: true,
        default: 12,
        validation: (value) => value >= 10 && value <= 15,
        description: 'BCrypt hash rounds',
        environment: ['development', 'staging', 'production'],
      },
      'security.session.timeout': {
        type: 'number',
        required: true,
        default: 86400000, // 24 hours
        description: 'Session timeout in milliseconds',
        environment: ['development', 'staging', 'production'],
      },
      'security.maxLoginAttempts': {
        type: 'number',
        required: true,
        default: 5,
        description: 'Maximum login attempts before lockout',
        environment: ['development', 'staging', 'production'],
      },
      'security.lockoutDuration': {
        type: 'number',
        required: true,
        default: 900000, // 15 minutes
        description: 'Account lockout duration in milliseconds',
        environment: ['development', 'staging', 'production'],
      },

      // Redis Configuration
      'redis.url': {
        type: 'string',
        required: false,
        sensitive: true,
        description: 'Redis connection URL',
        environment: ['development', 'staging', 'production'],
      },
      'redis.keyPrefix': {
        type: 'string',
        required: false,
        default: 'axonstream:',
        description: 'Redis key prefix',
        environment: ['development', 'staging', 'production'],
      },

      // Email Configuration
      'email.provider': {
        type: 'string',
        required: true,
        default: 'smtp',
        validation: (value) => ['smtp', 'sendgrid', 'ses'].includes(value),
        description: 'Email provider',
        environment: ['development', 'staging', 'production'],
      },
      'email.smtp.host': {
        type: 'string',
        required: false,
        description: 'SMTP host',
        environment: ['development', 'staging', 'production'],
      },
      'email.smtp.port': {
        type: 'number',
        required: false,
        default: 587,
        description: 'SMTP port',
        environment: ['development', 'staging', 'production'],
      },
      'email.smtp.secure': {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Use secure SMTP connection',
        environment: ['development', 'staging', 'production'],
      },
      'email.smtp.user': {
        type: 'string',
        required: false,
        sensitive: true,
        description: 'SMTP username',
        environment: ['development', 'staging', 'production'],
      },
      'email.smtp.password': {
        type: 'string',
        required: false,
        sensitive: true,
        description: 'SMTP password',
        environment: ['development', 'staging', 'production'],
      },
      'email.from': {
        type: 'string',
        required: true,
        default: 'noreply@axonstream.ai',
        description: 'Default from email address',
        environment: ['development', 'staging', 'production'],
      },

      // AI Provider Configuration
      'ai.openai.apiKey': {
        type: 'string',
        required: false,
        sensitive: true,
        description: 'OpenAI API key',
        environment: ['development', 'staging', 'production'],
      },
      'ai.openai.model': {
        type: 'string',
        required: false,
        default: 'gpt-4',
        description: 'Default OpenAI model',
        environment: ['development', 'staging', 'production'],
      },
      'ai.claude.apiKey': {
        type: 'string',
        required: false,
        sensitive: true,
        description: 'Claude API key',
        environment: ['development', 'staging', 'production'],
      },
      'ai.gemini.apiKey': {
        type: 'string',
        required: false,
        sensitive: true,
        description: 'Gemini API key',
        environment: ['development', 'staging', 'production'],
      },

      // Monitoring Configuration
      'monitoring.sentry.dsn': {
        type: 'string',
        required: false,
        sensitive: true,
        description: 'Sentry DSN for error tracking',
        environment: ['staging', 'production'],
      },
      'monitoring.metrics.enabled': {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable metrics collection',
        environment: ['development', 'staging', 'production'],
      },
      'monitoring.logging.level': {
        type: 'string',
        required: true,
        default: 'info',
        validation: (value) => ['debug', 'info', 'warn', 'error'].includes(value),
        description: 'Logging level',
        environment: ['development', 'staging', 'production'],
      },

      // Feature Flags
      'features.workflowBuilder': {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable workflow builder feature',
        environment: ['development', 'staging', 'production'],
      },
      'features.realTimeCollaboration': {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable real-time collaboration',
        environment: ['development', 'staging', 'production'],
      },
      'features.aiProviderFallback': {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable AI provider fallback',
        environment: ['development', 'staging', 'production'],
      },
      'features.advancedAnalytics': {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Enable advanced analytics',
        environment: ['staging', 'production'],
      },

      // Performance Configuration
      'performance.caching.enabled': {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable caching',
        environment: ['development', 'staging', 'production'],
      },
      'performance.caching.ttl': {
        type: 'number',
        required: true,
        default: 3600, // 1 hour
        description: 'Default cache TTL in seconds',
        environment: ['development', 'staging', 'production'],
      },
      'performance.compression.enabled': {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Enable response compression',
        environment: ['development', 'staging', 'production'],
      },
    };
  }

  private loadConfiguration(): void {
    const currentEnv = process.env.NODE_ENV || 'development';

    // Load configuration from various sources
    for (const [key, schemaItem] of Object.entries(this.schema)) {
      // Skip if not applicable to current environment
      if (schemaItem.environment && !schemaItem.environment.includes(currentEnv)) {
        continue;
      }

      let value: any;
      let source: ConfigurationValue['source'] = 'default';

      // 1. Try environment variable
      const envKey = key.toUpperCase().replace(/\./g, '_');
      if (process.env[envKey] !== undefined) {
        value = this.parseValue(process.env[envKey]!, schemaItem.type);
        source = 'environment';
      }
      // 2. Try default value
      else if (schemaItem.default !== undefined) {
        value = schemaItem.default;
        source = 'default';
      }
      // 3. Required but no value found
      else if (schemaItem.required) {
        throw new Error(`Required configuration key '${key}' is missing`);
      }

      // Validate value
      if (value !== undefined && schemaItem.validation && !schemaItem.validation(value)) {
        throw new Error(`Invalid value for configuration key '${key}': ${value}`);
      }

      // Store configuration
      if (value !== undefined) {
        this.config.set(key, {
          key,
          value: schemaItem.sensitive ? this.encrypt(value) : value,
          source,
          lastUpdated: new Date(),
          version: 1,
        });
      }
    }

    monitoring.info('Configuration loaded', {
      totalKeys: this.config.size,
      sources: this.getSourceCounts(),
    });
  }

  private parseValue(value: string, type: ConfigurationSchema[string]['type']): any {
    switch (type) {
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Invalid number value: ${value}`);
        }
        return num;
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          return value.split(',').map(s => s.trim());
        }
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          throw new Error(`Invalid JSON object: ${value}`);
        }
      default:
        return value;
    }
  }

  private encrypt(value: any): string {
    const CryptoJS = require('crypto-js');
    return CryptoJS.AES.encrypt(JSON.stringify(value), this.encryptionKey).toString();
  }

  private decrypt(encryptedValue: string): any {
    const CryptoJS = require('crypto-js');
    const bytes = CryptoJS.AES.decrypt(encryptedValue, this.encryptionKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  private setupConfigurationWatching(): void {
    // Watch for configuration file changes
    if (typeof window === 'undefined') {
      const fs = require('fs');
      const path = require('path');
      
      const configFiles = [
        path.join(process.cwd(), 'config.json'),
        path.join(process.cwd(), 'config.local.json'),
      ];

      configFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.watchFile(file, () => {
            this.reloadConfiguration();
          });
        }
      });
    }
  }

  private reloadConfiguration(): void {
    monitoring.info('Reloading configuration');
    
    const oldConfig = new Map(this.config);
    this.config.clear();
    
    try {
      this.loadConfiguration();
      
      // Notify watchers of changes
      for (const [key, newConfigValue] of this.config.entries()) {
        const oldConfigValue = oldConfig.get(key);
        if (!oldConfigValue || oldConfigValue.value !== newConfigValue.value) {
          this.notifyWatchers(key, newConfigValue.value);
        }
      }
      
      monitoring.info('Configuration reloaded successfully');
    } catch (error) {
      monitoring.error('Failed to reload configuration', error as Error);
      // Restore old configuration
      this.config = oldConfig;
    }
  }

  private notifyWatchers(key: string, value: any): void {
    const watchers = this.watchers.get(key);
    if (watchers) {
      watchers.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          monitoring.error(`Configuration watcher error for key '${key}'`, error as Error);
        }
      });
    }
  }

  private getSourceCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const configValue of this.config.values()) {
      counts[configValue.source] = (counts[configValue.source] || 0) + 1;
    }
    return counts;
  }

  // Public methods
  get<T = any>(key: string, defaultValue?: T): T {
    const configValue = this.config.get(key);
    if (!configValue) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration key '${key}' not found`);
    }

    const schemaItem = this.schema[key];
    let value = configValue.value;

    // Decrypt sensitive values
    if (schemaItem?.sensitive) {
      value = this.decrypt(value);
    }

    return value as T;
  }

  set(key: string, value: any, changedBy: string, reason?: string): void {
    const schemaItem = this.schema[key];
    if (!schemaItem) {
      throw new Error(`Unknown configuration key '${key}'`);
    }

    // Validate value
    if (schemaItem.validation && !schemaItem.validation(value)) {
      throw new Error(`Invalid value for configuration key '${key}': ${value}`);
    }

    const oldConfigValue = this.config.get(key);
    const oldValue = oldConfigValue ? 
      (schemaItem.sensitive ? this.decrypt(oldConfigValue.value) : oldConfigValue.value) : 
      undefined;

    // Create audit log entry
    const auditEntry: ConfigurationAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      oldValue,
      newValue: value,
      changedBy,
      timestamp: new Date(),
      source: 'database',
      reason,
    };

    this.auditLog.push(auditEntry);

    // Keep only last 1000 audit entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Update configuration
    const newConfigValue: ConfigurationValue = {
      key,
      value: schemaItem.sensitive ? this.encrypt(value) : value,
      source: 'database',
      lastUpdated: new Date(),
      version: (oldConfigValue?.version || 0) + 1,
    };

    this.config.set(key, newConfigValue);

    // Notify watchers
    this.notifyWatchers(key, value);

    monitoring.info('Configuration updated', {
      key,
      changedBy,
      reason,
      version: newConfigValue.version,
    });
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  delete(key: string, changedBy: string, reason?: string): void {
    const configValue = this.config.get(key);
    if (!configValue) {
      return;
    }

    const schemaItem = this.schema[key];
    if (schemaItem?.required) {
      throw new Error(`Cannot delete required configuration key '${key}'`);
    }

    const oldValue = schemaItem?.sensitive ? this.decrypt(configValue.value) : configValue.value;

    // Create audit log entry
    const auditEntry: ConfigurationAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      oldValue,
      newValue: undefined,
      changedBy,
      timestamp: new Date(),
      source: 'database',
      reason,
    };

    this.auditLog.push(auditEntry);

    this.config.delete(key);

    monitoring.info('Configuration deleted', {
      key,
      changedBy,
      reason,
    });
  }

  watch(key: string, callback: (value: any) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }

    const watchers = this.watchers.get(key)!;
    watchers.add(callback);

    // Return unsubscribe function
    return () => {
      watchers.delete(callback);
      if (watchers.size === 0) {
        this.watchers.delete(key);
      }
    };
  }

  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, configValue] of this.config.entries()) {
      const schemaItem = this.schema[key];
      let value = configValue.value;

      // Don't expose sensitive values
      if (schemaItem?.sensitive) {
        value = '[REDACTED]';
      }

      result[key] = {
        value,
        source: configValue.source,
        lastUpdated: configValue.lastUpdated,
        version: configValue.version,
      };
    }

    return result;
  }

  getSchema(): ConfigurationSchema {
    return { ...this.schema };
  }

  getAuditLog(key?: string): ConfigurationAuditLog[] {
    if (key) {
      return this.auditLog.filter(entry => entry.key === key);
    }
    return [...this.auditLog];
  }

  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const currentEnv = process.env.NODE_ENV || 'development';

    for (const [key, schemaItem] of Object.entries(this.schema)) {
      // Skip if not applicable to current environment
      if (schemaItem.environment && !schemaItem.environment.includes(currentEnv)) {
        continue;
      }

      const configValue = this.config.get(key);

      // Check required keys
      if (schemaItem.required && !configValue) {
        errors.push(`Required configuration key '${key}' is missing`);
        continue;
      }

      if (configValue) {
        let value = configValue.value;
        
        // Decrypt for validation
        if (schemaItem.sensitive) {
          try {
            value = this.decrypt(value);
          } catch (error) {
            errors.push(`Failed to decrypt configuration key '${key}'`);
            continue;
          }
        }

        // Validate value
        if (schemaItem.validation && !schemaItem.validation(value)) {
          errors.push(`Invalid value for configuration key '${key}': ${value}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  exportConfiguration(includeDefaults: boolean = false): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, configValue] of this.config.entries()) {
      if (!includeDefaults && configValue.source === 'default') {
        continue;
      }

      const schemaItem = this.schema[key];
      let value = configValue.value;

      // Don't export sensitive values
      if (schemaItem?.sensitive) {
        value = '[REDACTED]';
      }

      result[key] = value;
    }

    return result;
  }

  importConfiguration(config: Record<string, any>, changedBy: string): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(config)) {
      try {
        this.set(key, value, changedBy, 'Configuration import');
      } catch (error) {
        errors.push(`Failed to import '${key}': ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const configManager = ConfigurationManager.getInstance();

// React hook for configuration
export const useConfiguration = () => {
  const [config, setConfig] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    // Load initial configuration
    setConfig(configManager.getAll());

    // Watch for changes (in a real implementation, this would be more sophisticated)
    const interval = setInterval(() => {
      setConfig(configManager.getAll());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    config,
    get: configManager.get.bind(configManager),
    set: configManager.set.bind(configManager),
    has: configManager.has.bind(configManager),
    watch: configManager.watch.bind(configManager),
    getSchema: configManager.getSchema.bind(configManager),
    validateConfiguration: configManager.validateConfiguration.bind(configManager),
  };
};