import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import { env } from './environment';

export interface SecurityConfig {
  jwtAccessExpiry: string;
  jwtRefreshExpiry: string;
  bcryptRounds: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  csrfTokenExpiry: number;
}

export interface TokenPayload {
  sub: string;
  org: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

export interface SessionData {
  id: string;
  userId: string;
  organizationId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    fingerprint: string;
  };
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
}

class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private accessPrivateKey: crypto.KeyObject | null = null;
  private accessPublicKey: crypto.KeyObject | null = null;
  private refreshPrivateKey: crypto.KeyObject | null = null;
  private refreshPublicKey: crypto.KeyObject | null = null;
  private loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();
  private activeSessions = new Map<string, SessionData>();
  private csrfTokens = new Map<string, { token: string; expiresAt: Date }>();

  private constructor() {
    this.config = {
      jwtAccessExpiry: '15m',
      jwtRefreshExpiry: '30d',
      bcryptRounds: 12,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      csrfTokenExpiry: 60 * 60 * 1000, // 1 hour
    };
    
    this.initializeKeys();
    this.startCleanupTasks();
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  private async initializeKeys(): Promise<void> {
    try {
      // In production, load from KMS/Vault
      if (env.isProduction()) {
        await this.loadKeysFromKMS();
      } else {
        // Development: generate or load from files
        await this.loadOrGenerateKeys();
      }
    } catch (error) {
      console.error('Failed to initialize security keys:', error);
      throw new Error('Security initialization failed');
    }
  }

  private async loadKeysFromKMS(): Promise<void> {
    // Production implementation would integrate with AWS KMS, Azure Key Vault, etc.
    // For now, we'll use environment variables as a fallback
    const accessPrivatePem = process.env.JWT_ACCESS_PRIVATE_KEY;
    const accessPublicPem = process.env.JWT_ACCESS_PUBLIC_KEY;
    const refreshPrivatePem = process.env.JWT_REFRESH_PRIVATE_KEY;
    const refreshPublicPem = process.env.JWT_REFRESH_PUBLIC_KEY;

    if (!accessPrivatePem || !accessPublicPem || !refreshPrivatePem || !refreshPublicPem) {
      throw new Error('JWT keys not found in environment variables');
    }

    this.accessPrivateKey = await importPKCS8(accessPrivatePem, 'RS256');
    this.accessPublicKey = await importSPKI(accessPublicPem, 'RS256');
    this.refreshPrivateKey = await importPKCS8(refreshPrivatePem, 'RS256');
    this.refreshPublicKey = await importSPKI(refreshPublicPem, 'RS256');
  }

  private async loadOrGenerateKeys(): Promise<void> {
    // Generate RSA key pairs for development
    const accessKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const refreshKeyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    this.accessPrivateKey = await importPKCS8(accessKeyPair.privateKey, 'RS256');
    this.accessPublicKey = await importSPKI(accessKeyPair.publicKey, 'RS256');
    this.refreshPrivateKey = await importPKCS8(refreshKeyPair.privateKey, 'RS256');
    this.refreshPublicKey = await importSPKI(refreshKeyPair.publicKey, 'RS256');
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>): Promise<string> {
    if (!this.accessPrivateKey) {
      throw new Error('Access private key not initialized');
    }

    const jwt = new SignJWT({ ...payload, type: 'access' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(this.config.jwtAccessExpiry);

    return jwt.sign(this.accessPrivateKey);
  }

  async generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>): Promise<string> {
    if (!this.refreshPrivateKey) {
      throw new Error('Refresh private key not initialized');
    }

    const jwt = new SignJWT({ ...payload, type: 'refresh' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(this.config.jwtRefreshExpiry);

    return jwt.sign(this.refreshPrivateKey);
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    if (!this.accessPublicKey) {
      throw new Error('Access public key not initialized');
    }

    const { payload } = await jwtVerify(token, this.accessPublicKey);
    return payload as TokenPayload;
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    if (!this.refreshPublicKey) {
      throw new Error('Refresh public key not initialized');
    }

    const { payload } = await jwtVerify(token, this.refreshPublicKey);
    return payload as TokenPayload;
  }

  // Session management with rotation
  createSession(sessionData: Omit<SessionData, 'id' | 'createdAt' | 'lastActiveAt' | 'isRevoked'>): SessionData {
    const sessionId = this.generateSecureId();
    const now = new Date();
    
    const session: SessionData = {
      id: sessionId,
      createdAt: now,
      lastActiveAt: now,
      isRevoked: false,
      ...sessionData,
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): SessionData | null {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return null;
    }
    
    // Update last active time
    session.lastActiveAt = new Date();
    return session;
  }

  revokeSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isRevoked = true;
    }
  }

  revokeAllUserSessions(userId: string): void {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        session.isRevoked = true;
      }
    }
  }

  // Rate limiting for login attempts
  checkLoginAttempts(identifier: string): { allowed: boolean; remainingAttempts: number; lockoutEnds?: Date } {
    const attempts = this.loginAttempts.get(identifier);
    
    if (!attempts) {
      return { allowed: true, remainingAttempts: this.config.maxLoginAttempts };
    }

    const now = new Date();
    const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();
    
    // Reset attempts if lockout period has passed
    if (timeSinceLastAttempt > this.config.lockoutDuration) {
      this.loginAttempts.delete(identifier);
      return { allowed: true, remainingAttempts: this.config.maxLoginAttempts };
    }

    if (attempts.count >= this.config.maxLoginAttempts) {
      const lockoutEnds = new Date(attempts.lastAttempt.getTime() + this.config.lockoutDuration);
      return { allowed: false, remainingAttempts: 0, lockoutEnds };
    }

    return { 
      allowed: true, 
      remainingAttempts: this.config.maxLoginAttempts - attempts.count 
    };
  }

  recordLoginAttempt(identifier: string, success: boolean): void {
    if (success) {
      this.loginAttempts.delete(identifier);
      return;
    }

    const existing = this.loginAttempts.get(identifier);
    this.loginAttempts.set(identifier, {
      count: (existing?.count || 0) + 1,
      lastAttempt: new Date(),
    });
  }

  // CSRF protection
  generateCSRFToken(sessionId: string): string {
    const token = this.generateSecureId();
    const expiresAt = new Date(Date.now() + this.config.csrfTokenExpiry);
    
    this.csrfTokens.set(sessionId, { token, expiresAt });
    return token;
  }

  validateCSRFToken(sessionId: string, token: string): boolean {
    const stored = this.csrfTokens.get(sessionId);
    if (!stored || stored.expiresAt < new Date()) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token)
    );
  }

  // Secure ID generation
  generateSecureId(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Device fingerprinting
  generateDeviceFingerprint(userAgent: string, ip: string, additionalData?: Record<string, any>): string {
    const data = JSON.stringify({
      userAgent,
      ip,
      ...additionalData,
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Input sanitization
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // SQL injection prevention (for raw queries)
  escapeSQL(input: string): string {
    return input.replace(/'/g, "''").replace(/;/g, '');
  }

  // XSS prevention
  escapeHTML(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    
    return input.replace(/[&<>"'/]/g, (s) => map[s]);
  }

  // Cleanup tasks
  private startCleanupTasks(): void {
    // Clean expired sessions every hour
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);

    // Clean expired CSRF tokens every 30 minutes
    setInterval(() => {
      this.cleanupExpiredCSRFTokens();
    }, 30 * 60 * 1000);

    // Clean old login attempts every hour
    setInterval(() => {
      this.cleanupOldLoginAttempts();
    }, 60 * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now || session.isRevoked) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  private cleanupExpiredCSRFTokens(): void {
    const now = new Date();
    for (const [sessionId, tokenData] of this.csrfTokens.entries()) {
      if (tokenData.expiresAt < now) {
        this.csrfTokens.delete(sessionId);
      }
    }
  }

  private cleanupOldLoginAttempts(): void {
    const now = new Date();
    for (const [identifier, attempts] of this.loginAttempts.entries()) {
      const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();
      if (timeSinceLastAttempt > this.config.lockoutDuration) {
        this.loginAttempts.delete(identifier);
      }
    }
  }

  // Security headers
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': this.generateCSP(),
    };
  }

  private generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.tempo.build wss: ws:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

    return directives.join('; ');
  }

  // Audit logging
  logSecurityEvent(event: {
    type: 'login' | 'logout' | 'failed_login' | 'token_refresh' | 'session_revoked' | 'suspicious_activity';
    userId?: string;
    sessionId?: string;
    ip: string;
    userAgent: string;
    details?: Record<string, any>;
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event.type,
      userId: event.userId,
      sessionId: event.sessionId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details,
    };

    // In production, send to secure logging service
    if (env.isProduction()) {
      this.sendToSecureLogger(logEntry);
    } else {
      console.log('Security Event:', logEntry);
    }
  }

  private sendToSecureLogger(logEntry: any): void {
    // Implementation would send to secure logging service
    // e.g., AWS CloudTrail, Azure Monitor, etc.
  }

  // Get security metrics
  getSecurityMetrics(): {
    activeSessions: number;
    failedLoginAttempts: number;
    lockedAccounts: number;
    csrfTokens: number;
  } {
    const now = new Date();
    const lockedAccounts = Array.from(this.loginAttempts.values()).filter(
      attempt => attempt.count >= this.config.maxLoginAttempts &&
      (now.getTime() - attempt.lastAttempt.getTime()) < this.config.lockoutDuration
    ).length;

    return {
      activeSessions: this.activeSessions.size,
      failedLoginAttempts: this.loginAttempts.size,
      lockedAccounts,
      csrfTokens: this.csrfTokens.size,
    };
  }
}

export const securityManager = SecurityManager.getInstance();