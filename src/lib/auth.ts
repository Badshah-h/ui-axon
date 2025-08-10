import React from 'react';
import { apiClient } from './api-client';
import { errorMonitoring } from './error-monitoring';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    workflow: boolean;
    system: boolean;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
  organizationSlug?: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  organizationName?: string;
  organizationSlug?: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    location?: string;
  };
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

class AuthManager {
  private static instance: AuthManager;
  private state: AuthState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  };
  private listeners: Set<(state: AuthState) => void> = new Set();
  private refreshTimer: NodeJS.Timeout | null = null;
  private storageKey = 'axonstream_auth';
  private refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry

  private constructor() {
    this.initializeAuth();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private async initializeAuth(): Promise<void> {
    try {
      // Load tokens from storage
      const storedAuth = this.loadFromStorage();
      if (storedAuth?.tokens) {
        // Check if tokens are still valid
        if (Date.now() < storedAuth.tokens.expiresAt) {
          this.setState({
            tokens: storedAuth.tokens,
            isAuthenticated: true,
            isLoading: true,
          });

          // Set auth token in API client
          apiClient.setAuthToken(storedAuth.tokens.accessToken);

          // Verify token and get user info
          await this.getCurrentUser();
          
          // Setup token refresh
          this.setupTokenRefresh();
        } else {
          // Try to refresh token
          if (storedAuth.tokens.refreshToken) {
            await this.refreshTokens();
          } else {
            this.clearAuth();
          }
        }
      } else {
        this.setState({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.clearAuth();
    }
  }

  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  private saveToStorage(): void {
    try {
      const authData = {
        tokens: this.state.tokens,
        user: this.state.user,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(authData));
    } catch (error) {
      console.error('Failed to save auth to storage:', error);
    }
  }

  private loadFromStorage(): { tokens: AuthTokens; user: User } | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
      return null;
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
      sessionStorage.clear();
    } catch (error) {
      console.error('Failed to clear auth storage:', error);
    }
  }

  private setupTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.state.tokens) return;

    const timeUntilRefresh = this.state.tokens.expiresAt - Date.now() - this.refreshThreshold;
    
    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTokens();
      }, timeUntilRefresh);
    } else {
      // Token is about to expire, refresh immediately
      this.refreshTokens();
    }
  }

  async login(credentials: LoginCredentials): Promise<void> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await apiClient.post<{
        user: User;
        tokens: AuthTokens;
      }>('/auth/login', credentials);

      const { user, tokens } = response.data;

      this.setState({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Set auth token in API client
      apiClient.setAuthToken(tokens.accessToken);

      // Save to storage
      this.saveToStorage();

      // Setup token refresh
      this.setupTokenRefresh();

      // Track login event
      this.trackAuthEvent('login', { userId: user.id });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      this.setState({
        isLoading: false,
        error: errorMessage,
      });

      errorMonitoring.captureError(error as Error, {
        severity: 'medium',
        category: 'auth',
        timestamp: new Date(),
      });

      throw error;
    }
  }

  async register(data: RegisterData): Promise<void> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await apiClient.post<{
        user: User;
        tokens: AuthTokens;
      }>('/auth/register', data);

      const { user, tokens } = response.data;

      this.setState({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Set auth token in API client
      apiClient.setAuthToken(tokens.accessToken);

      // Save to storage
      this.saveToStorage();

      // Setup token refresh
      this.setupTokenRefresh();

      // Track registration event
      this.trackAuthEvent('register', { userId: user.id });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      this.setState({
        isLoading: false,
        error: errorMessage,
      });

      errorMonitoring.captureError(error as Error, {
        severity: 'medium',
        category: 'auth',
        timestamp: new Date(),
      });

      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Notify server about logout
      if (this.state.tokens) {
        await apiClient.post('/auth/logout', {
          refreshToken: this.state.tokens.refreshToken,
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuth();
      this.trackAuthEvent('logout');
    }
  }

  private clearAuth(): void {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear API client auth
    apiClient.clearAuthToken();

    // Clear storage
    this.clearStorage();

    // Reset state
    this.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }

  async refreshTokens(): Promise<void> {
    try {
      if (!this.state.tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<{
        tokens: AuthTokens;
      }>('/auth/refresh', {
        refreshToken: this.state.tokens.refreshToken,
      });

      const { tokens } = response.data;

      this.setState({
        tokens,
        error: null,
      });

      // Set new auth token in API client
      apiClient.setAuthToken(tokens.accessToken);

      // Save to storage
      this.saveToStorage();

      // Setup next refresh
      this.setupTokenRefresh();

    } catch (error) {
      console.error('Token refresh failed:', error);
      
      errorMonitoring.captureError(error as Error, {
        severity: 'high',
        category: 'auth',
        timestamp: new Date(),
      });

      // Clear auth on refresh failure
      this.clearAuth();
      throw error;
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      const user = response.data;

      this.setState({
        user,
        isLoading: false,
        error: null,
      });

      this.saveToStorage();
      return user;

    } catch (error) {
      console.error('Get current user failed:', error);
      this.clearAuth();
      throw error;
    }
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<User>('/auth/profile', updates);
      const user = response.data;

      this.setState({ user });
      this.saveToStorage();

      return user;
    } catch (error) {
      errorMonitoring.captureError(error as Error, {
        severity: 'medium',
        category: 'auth',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      this.trackAuthEvent('password_change');
    } catch (error) {
      errorMonitoring.captureError(error as Error, {
        severity: 'medium',
        category: 'auth',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      errorMonitoring.captureError(error as Error, {
        severity: 'low',
        category: 'auth',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password: newPassword,
      });
    } catch (error) {
      errorMonitoring.captureError(error as Error, {
        severity: 'medium',
        category: 'auth',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async getSessions(): Promise<SessionInfo[]> {
    try {
      const response = await apiClient.get<SessionInfo[]>('/auth/sessions');
      return response.data;
    } catch (error) {
      errorMonitoring.captureError(error as Error, {
        severity: 'low',
        category: 'auth',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    try {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
    } catch (error) {
      errorMonitoring.captureError(error as Error, {
        severity: 'medium',
        category: 'auth',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async revokeAllSessions(): Promise<void> {
    try {
      await apiClient.post('/auth/revoke-all-sessions');
      // This will invalidate current session too
      this.clearAuth();
    } catch (error) {
      errorMonitoring.captureError(error as Error, {
        severity: 'medium',
        category: 'auth',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  // Permission checking
  hasPermission(permission: string): boolean {
    return this.state.user?.permissions.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    return this.state.user?.roles.includes(role) || false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  // State management
  getState(): AuthState {
    return { ...this.state };
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private trackAuthEvent(event: string, data?: any): void {
    try {
      // Track authentication events for analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', event, {
          event_category: 'auth',
          ...data,
        });
      }
    } catch (error) {
      console.error('Failed to track auth event:', error);
    }
  }

  // Utility methods
  isTokenExpiringSoon(): boolean {
    if (!this.state.tokens) return false;
    return Date.now() > (this.state.tokens.expiresAt - this.refreshThreshold);
  }

  getTimeUntilExpiry(): number {
    if (!this.state.tokens) return 0;
    return Math.max(0, this.state.tokens.expiresAt - Date.now());
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();

// React hook for authentication
export const useAuth = () => {
  const [state, setState] = React.useState<AuthState>(authManager.getState());

  React.useEffect(() => {
    const unsubscribe = authManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    login: authManager.login.bind(authManager),
    register: authManager.register.bind(authManager),
    logout: authManager.logout.bind(authManager),
    refreshTokens: authManager.refreshTokens.bind(authManager),
    getCurrentUser: authManager.getCurrentUser.bind(authManager),
    updateProfile: authManager.updateProfile.bind(authManager),
    changePassword: authManager.changePassword.bind(authManager),
    requestPasswordReset: authManager.requestPasswordReset.bind(authManager),
    resetPassword: authManager.resetPassword.bind(authManager),
    getSessions: authManager.getSessions.bind(authManager),
    revokeSession: authManager.revokeSession.bind(authManager),
    revokeAllSessions: authManager.revokeAllSessions.bind(authManager),
    hasPermission: authManager.hasPermission.bind(authManager),
    hasRole: authManager.hasRole.bind(authManager),
    hasAnyPermission: authManager.hasAnyPermission.bind(authManager),
    hasAllPermissions: authManager.hasAllPermissions.bind(authManager),
    isTokenExpiringSoon: authManager.isTokenExpiringSoon.bind(authManager),
    getTimeUntilExpiry: authManager.getTimeUntilExpiry.bind(authManager),
  };
};

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: string[]
) {
  return function AuthenticatedComponent(props: P) {
    const auth = useAuth();

    if (auth.isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!auth.isAuthenticated) {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
      return null;
    }

    if (requiredPermissions && !auth.hasAllPermissions(requiredPermissions)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}