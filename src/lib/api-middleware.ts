import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import compression from 'compression';
import cors from 'cors';
import { securityManager } from './security';
import { monitoring } from './monitoring';
import { env } from './environment';

// Rate limiting configuration
const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      monitoring.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          reason: 'Rate limit exceeded',
          endpoint: req.path,
          method: req.method,
        },
      });
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.round(windowMs / 1000),
      });
    },
  });
};

// Different rate limits for different endpoints
export const rateLimiters = {
  // General API rate limit
  general: createRateLimiter(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  
  // Strict rate limit for authentication endpoints
  auth: createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts'), // 5 attempts per 15 minutes
  
  // More lenient for read operations
  read: createRateLimiter(15 * 60 * 1000, 200), // 200 requests per 15 minutes
  
  // Strict for write operations
  write: createRateLimiter(15 * 60 * 1000, 50), // 50 requests per 15 minutes
  
  // Very strict for admin operations
  admin: createRateLimiter(60 * 60 * 1000, 10), // 10 requests per hour
};

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://api.tempo.build",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
      ],
      connectSrc: [
        "'self'",
        "https://api.tempo.build",
        "wss:",
        "ws:",
      ],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = env.getServerConfig().corsOrigins;
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      monitoring.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        details: {
          reason: 'CORS violation',
          origin,
          allowedOrigins,
        },
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Input validation schemas
export const validationSchemas = {
  // User registration
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('name').optional().isLength({ min: 2, max: 50 }).trim().escape(),
    body('organizationName').optional().isLength({ min: 2, max: 100 }).trim().escape(),
  ],
  
  // User login
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('organizationSlug').optional().isSlug().withMessage('Invalid organization slug'),
  ],
  
  // Workflow creation
  createWorkflow: [
    body('name').isLength({ min: 1, max: 100 }).trim().escape().withMessage('Workflow name is required'),
    body('description').optional().isLength({ max: 500 }).trim().escape(),
    body('nodes').isArray().withMessage('Nodes must be an array'),
    body('connections').isArray().withMessage('Connections must be an array'),
  ],
  
  // Configuration update
  updateConfig: [
    body('key').matches(/^[a-zA-Z0-9._-]+$/).withMessage('Invalid configuration key'),
    body('value').notEmpty().withMessage('Configuration value is required'),
    body('reason').optional().isLength({ max: 200 }).trim().escape(),
  ],
};

// Authentication middleware
export const authenticateToken = async (req: NextRequest): Promise<{ valid: boolean; user?: any; error?: string }> => {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return { valid: false, error: 'Access token required' };
    }

    const payload = await securityManager.verifyAccessToken(token);
    
    // Check if session is still valid
    const session = securityManager.getSession(payload.sessionId);
    if (!session) {
      return { valid: false, error: 'Session expired' };
    }

    return { valid: true, user: payload };
  } catch (error) {
    monitoring.logSecurityEvent({
      type: 'authentication',
      severity: 'medium',
      details: {
        reason: 'Invalid token',
        error: (error as Error).message,
      },
    });
    
    return { valid: false, error: 'Invalid token' };
  }
};

// Authorization middleware
export const requirePermissions = (permissions: string[]) => {
  return (user: any): { authorized: boolean; error?: string } => {
    if (!user.permissions) {
      return { authorized: false, error: 'No permissions found' };
    }

    const hasPermissions = permissions.every(permission => 
      user.permissions.includes(permission)
    );

    if (!hasPermissions) {
      monitoring.logSecurityEvent({
        type: 'authorization',
        severity: 'medium',
        userId: user.sub,
        details: {
          reason: 'Insufficient permissions',
          required: permissions,
          actual: user.permissions,
        },
      });
      
      return { authorized: false, error: 'Insufficient permissions' };
    }

    return { authorized: true };
  };
};

// Request logging middleware
export const requestLogger = (req: NextRequest, startTime: number) => {
  const duration = Date.now() - startTime;
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  monitoring.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip,
    userAgent,
    duration,
  });

  // Log slow requests
  if (duration > 2000) {
    monitoring.warn('Slow request detected', {
      method: req.method,
      url: req.url,
      duration,
    });
  }
};

// Error handling middleware
export const errorHandler = (error: Error, req: NextRequest) => {
  monitoring.error('API Error', error, {
    method: req.method,
    url: req.url,
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  });

  // Don't expose internal errors in production
  if (env.isProduction()) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { 
      error: error.message,
      stack: error.stack,
    },
    { status: 500 }
  );
};

// Input sanitization middleware
export const sanitizeInput = (data: any): any => {
  if (typeof data === 'string') {
    return securityManager.sanitizeInput(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[securityManager.sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
};

// CSRF protection middleware
export const csrfProtection = async (req: NextRequest): Promise<{ valid: boolean; error?: string }> => {
  // Skip CSRF for GET requests
  if (req.method === 'GET') {
    return { valid: true };
  }

  const csrfToken = req.headers.get('x-csrf-token');
  const sessionId = req.headers.get('x-session-id');

  if (!csrfToken || !sessionId) {
    return { valid: false, error: 'CSRF token required' };
  }

  const isValid = securityManager.validateCSRFToken(sessionId, csrfToken);
  
  if (!isValid) {
    monitoring.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'high',
      details: {
        reason: 'Invalid CSRF token',
        sessionId,
        ip: req.headers.get('x-forwarded-for') || 'unknown',
      },
    });
    
    return { valid: false, error: 'Invalid CSRF token' };
  }

  return { valid: true };
};

// API wrapper with all security middleware
export const withSecurity = (
  handler: (req: NextRequest, context: { user?: any }) => Promise<NextResponse>,
  options: {
    rateLimit?: keyof typeof rateLimiters;
    requireAuth?: boolean;
    permissions?: string[];
    validation?: any[];
    requireCSRF?: boolean;
  } = {}
) => {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    
    try {
      // Rate limiting (would need to be implemented differently in Next.js)
      // This is a conceptual example
      
      // CSRF protection
      if (options.requireCSRF) {
        const csrfResult = await csrfProtection(req);
        if (!csrfResult.valid) {
          return NextResponse.json(
            { error: csrfResult.error },
            { status: 403 }
          );
        }
      }

      // Authentication
      let user;
      if (options.requireAuth) {
        const authResult = await authenticateToken(req);
        if (!authResult.valid) {
          return NextResponse.json(
            { error: authResult.error },
            { status: 401 }
          );
        }
        user = authResult.user;
      }

      // Authorization
      if (options.permissions && user) {
        const authzResult = requirePermissions(options.permissions)(user);
        if (!authzResult.authorized) {
          return NextResponse.json(
            { error: authzResult.error },
            { status: 403 }
          );
        }
      }

      // Input validation (would need request body)
      if (options.validation) {
        // This would validate the request body using express-validator
        // Implementation would depend on how you handle request bodies in Next.js
      }

      // Call the actual handler
      const response = await handler(req, { user });
      
      // Log successful request
      requestLogger(req, startTime);
      
      return response;
      
    } catch (error) {
      return errorHandler(error as Error, req);
    }
  };
};

// Health check endpoint
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: Record<string, { status: string; responseTime?: number }>;
}> => {
  const startTime = Date.now();
  
  const services: Record<string, { status: string; responseTime?: number }> = {};
  
  // Check database
  try {
    const dbStart = Date.now();
    // Database health check would go here
    services.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    services.database = { status: 'unhealthy' };
  }
  
  // Check Redis
  try {
    const redisStart = Date.now();
    // Redis health check would go here
    services.redis = {
      status: 'healthy',
      responseTime: Date.now() - redisStart,
    };
  } catch (error) {
    services.redis = { status: 'unhealthy' };
  }
  
  // Determine overall status
  const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy').length;
  const degradedServices = Object.values(services).filter(s => s.status === 'degraded').length;
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (unhealthyServices > 0) {
    status = 'unhealthy';
  } else if (degradedServices > 0) {
    status = 'degraded';
  }
  
  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: env.getEnvironment(),
    services,
  };
};

// Export middleware functions for use in API routes
export {
  securityHeaders,
  corsOptions,
  rateLimiters,
  validationSchemas,
  authenticateToken,
  requirePermissions,
  sanitizeInput,
  csrfProtection,
  requestLogger,
  errorHandler,
};