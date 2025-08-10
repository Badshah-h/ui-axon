"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authManager, AuthState, useAuth } from '@/lib/auth';
import { errorMonitoring } from '@/lib/error-monitoring';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(authManager.getState());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authManager.subscribe((state) => {
      setAuthState(state);
      setIsInitialized(true);
    });

    // Initialize auth state
    setIsInitialized(true);

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Track authentication events for monitoring
    if (authState.isAuthenticated && authState.user) {
      errorMonitoring.captureError('User authenticated', {
        severity: 'low',
        category: 'auth',
        timestamp: new Date(),
        userId: authState.user.id,
      });
    }
  }, [authState.isAuthenticated, authState.user]);

  // Show loading spinner during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};