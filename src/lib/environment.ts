// Environment configuration with validation and type safety
export interface EnvironmentConfig {
  // App configuration
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_API_URL: string;
  
  // AxonPuls configuration
  NEXT_PUBLIC_AXONPULS_URL: string;
  
  // Authentication
  NEXT_PUBLIC_AUTH_ENABLED: boolean;
  
  // Analytics
  NEXT_PUBLIC_GA_ID?: string;
  NEXT_PUBLIC_ANALYTICS_ENABLED: boolean;
  
  // Feature flags
  NEXT_PUBLIC_FEATURES: {
    workflows: boolean;
    agents: boolean;
    tools: boolean;
    integrations: boolean;
    templates: boolean;
    collaboration: boolean;
    analytics: boolean;
  };
  
  // Performance
  NEXT_PUBLIC_PERFORMANCE_MONITORING: boolean;
  NEXT_PUBLIC_ERROR_REPORTING: boolean;
  
  // Development
  NEXT_PUBLIC_DEBUG: boolean;
  NEXT_PUBLIC_MOCK_API: boolean;
}

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.loadAndValidateConfig();
  }

  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  private loadAndValidateConfig(): EnvironmentConfig {
    const config: EnvironmentConfig = {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
      NEXT_PUBLIC_AXONPULS_URL: process.env.NEXT_PUBLIC_AXONPULS_URL || 'ws://localhost:3001',
      NEXT_PUBLIC_AUTH_ENABLED: this.parseBoolean(process.env.NEXT_PUBLIC_AUTH_ENABLED, true),
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      NEXT_PUBLIC_ANALYTICS_ENABLED: this.parseBoolean(process.env.NEXT_PUBLIC_ANALYTICS_ENABLED, false),
      NEXT_PUBLIC_FEATURES: {
        workflows: this.parseBoolean(process.env.NEXT_PUBLIC_FEATURE_WORKFLOWS, true),
        agents: this.parseBoolean(process.env.NEXT_PUBLIC_FEATURE_AGENTS, true),
        tools: this.parseBoolean(process.env.NEXT_PUBLIC_FEATURE_TOOLS, true),
        integrations: this.parseBoolean(process.env.NEXT_PUBLIC_FEATURE_INTEGRATIONS, true),
        templates: this.parseBoolean(process.env.NEXT_PUBLIC_FEATURE_TEMPLATES, true),
        collaboration: this.parseBoolean(process.env.NEXT_PUBLIC_FEATURE_COLLABORATION, false),
        analytics: this.parseBoolean(process.env.NEXT_PUBLIC_FEATURE_ANALYTICS, false),
      },
      NEXT_PUBLIC_PERFORMANCE_MONITORING: this.parseBoolean(process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING, true),
      NEXT_PUBLIC_ERROR_REPORTING: this.parseBoolean(process.env.NEXT_PUBLIC_ERROR_REPORTING, true),
      NEXT_PUBLIC_DEBUG: this.parseBoolean(process.env.NEXT_PUBLIC_DEBUG, false),
      NEXT_PUBLIC_MOCK_API: this.parseBoolean(process.env.NEXT_PUBLIC_MOCK_API, false),
    };

    this.validateConfig(config);
    return config;
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  private validateConfig(config: EnvironmentConfig): void {
    const errors: string[] = [];

    // Validate required URLs
    if (!this.isValidUrl(config.NEXT_PUBLIC_APP_URL)) {
      errors.push('NEXT_PUBLIC_APP_URL must be a valid URL');
    }

    if (!config.NEXT_PUBLIC_API_URL) {
      errors.push('NEXT_PUBLIC_API_URL is required');
    }

    if (!config.NEXT_PUBLIC_AXONPULS_URL) {
      errors.push('NEXT_PUBLIC_AXONPULS_URL is required');
    }

    // Validate analytics configuration
    if (config.NEXT_PUBLIC_ANALYTICS_ENABLED && !config.NEXT_PUBLIC_GA_ID) {
      errors.push('NEXT_PUBLIC_GA_ID is required when analytics is enabled');
    }

    // Validate environment-specific settings
    if (config.NODE_ENV === 'production') {
      if (config.NEXT_PUBLIC_DEBUG) {
        console.warn('Debug mode is enabled in production');
      }
      
      if (config.NEXT_PUBLIC_MOCK_API) {
        errors.push('Mock API should not be enabled in production');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Environment configuration errors:\n${errors.join('\n')}`);
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    return this.config[key];
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  isFeatureEnabled(feature: keyof EnvironmentConfig['NEXT_PUBLIC_FEATURES']): boolean {
    return this.config.NEXT_PUBLIC_FEATURES[feature];
  }

  getApiUrl(path: string = ''): string {
    const baseUrl = this.config.NEXT_PUBLIC_API_URL;
    if (path.startsWith('/')) {
      return `${baseUrl}${path}`;
    }
    return `${baseUrl}/${path}`;
  }

  getAppUrl(path: string = ''): string {
    const baseUrl = this.config.NEXT_PUBLIC_APP_URL;
    if (path.startsWith('/')) {
      return `${baseUrl}${path}`;
    }
    return `${baseUrl}/${path}`;
  }

  // Runtime configuration updates (for feature flags)
  updateFeatureFlag(feature: keyof EnvironmentConfig['NEXT_PUBLIC_FEATURES'], enabled: boolean): void {
    this.config.NEXT_PUBLIC_FEATURES[feature] = enabled;
    
    // Persist to localStorage for client-side persistence
    if (typeof window !== 'undefined') {
      const featureFlags = JSON.parse(localStorage.getItem('featureFlags') || '{}');
      featureFlags[feature] = enabled;
      localStorage.setItem('featureFlags', JSON.stringify(featureFlags));
    }
  }

  // Load feature flags from localStorage
  private loadFeatureFlagsFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const storedFlags = JSON.parse(localStorage.getItem('featureFlags') || '{}');
        Object.entries(storedFlags).forEach(([feature, enabled]) => {
          if (feature in this.config.NEXT_PUBLIC_FEATURES) {
            this.config.NEXT_PUBLIC_FEATURES[feature as keyof typeof this.config.NEXT_PUBLIC_FEATURES] = Boolean(enabled);
          }
        });
      } catch (error) {
        console.error('Failed to load feature flags from storage:', error);
      }
    }
  }

  // Debug information
  getDebugInfo(): Record<string, any> {
    return {
      environment: this.config.NODE_ENV,
      features: this.config.NEXT_PUBLIC_FEATURES,
      urls: {
        app: this.config.NEXT_PUBLIC_APP_URL,
        api: this.config.NEXT_PUBLIC_API_URL,
        axonpuls: this.config.NEXT_PUBLIC_AXONPULS_URL,
      },
      flags: {
        auth: this.config.NEXT_PUBLIC_AUTH_ENABLED,
        analytics: this.config.NEXT_PUBLIC_ANALYTICS_ENABLED,
        debug: this.config.NEXT_PUBLIC_DEBUG,
        mockApi: this.config.NEXT_PUBLIC_MOCK_API,
        performanceMonitoring: this.config.NEXT_PUBLIC_PERFORMANCE_MONITORING,
        errorReporting: this.config.NEXT_PUBLIC_ERROR_REPORTING,
      },
    };
  }
}

// Export singleton instance
export const env = EnvironmentManager.getInstance();

// React hook for environment configuration
export const useEnvironment = () => {
  return {
    config: env.getConfig(),
    get: env.get.bind(env),
    isProduction: env.isProduction(),
    isDevelopment: env.isDevelopment(),
    isTest: env.isTest(),
    isFeatureEnabled: env.isFeatureEnabled.bind(env),
    getApiUrl: env.getApiUrl.bind(env),
    getAppUrl: env.getAppUrl.bind(env),
    updateFeatureFlag: env.updateFeatureFlag.bind(env),
    getDebugInfo: env.getDebugInfo.bind(env),
  };
};

// Environment-specific constants
export const CONSTANTS = {
  // API endpoints
  API_ENDPOINTS: {
    AUTH: '/auth',
    WORKFLOWS: '/workflows',
    AGENTS: '/agents',
    TOOLS: '/tools',
    INTEGRATIONS: '/integrations',
    TEMPLATES: '/templates',
    USERS: '/users',
    ORGANIZATIONS: '/organizations',
  },
  
  // Local storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'axonstream_auth',
    USER_PREFERENCES: 'axonstream_preferences',
    FEATURE_FLAGS: 'featureFlags',
    THEME: 'theme',
    LANGUAGE: 'language',
  },
  
  // Event types
  EVENTS: {
    WORKFLOW_STARTED: 'workflow.started',
    WORKFLOW_COMPLETED: 'workflow.completed',
    WORKFLOW_FAILED: 'workflow.failed',
    NODE_STARTED: 'node.started',
    NODE_COMPLETED: 'node.completed',
    NODE_FAILED: 'node.failed',
    USER_ACTION: 'user.action',
    SYSTEM_ERROR: 'system.error',
  },
  
  // Timeouts and limits
  TIMEOUTS: {
    API_REQUEST: 30000,
    WORKFLOW_EXECUTION: 300000, // 5 minutes
    NODE_EXECUTION: 60000, // 1 minute
    WEBSOCKET_RECONNECT: 5000,
  },
  
  LIMITS: {
    MAX_WORKFLOW_NODES: 100,
    MAX_PARALLEL_EXECUTIONS: 10,
    MAX_RETRY_ATTEMPTS: 3,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_CACHE_SIZE: 100,
  },
  
  // UI constants
  UI: {
    SIDEBAR_WIDTH: 280,
    HEADER_HEIGHT: 64,
    FOOTER_HEIGHT: 48,
    CANVAS_GRID_SIZE: 20,
    NODE_MIN_WIDTH: 200,
    NODE_MIN_HEIGHT: 100,
  },
} as const;

// Type-safe environment variables access
export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value || defaultValue || '';
};

// Validate environment on module load
try {
  env.getConfig();
  console.log('✅ Environment configuration loaded successfully');
} catch (error) {
  console.error('❌ Environment configuration error:', error);
  if (env.isProduction()) {
    throw error; // Fail fast in production
  }
}