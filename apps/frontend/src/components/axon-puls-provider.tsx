"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getAxonPulsClient, AxonPulsClient } from '@/lib/axon-puls';
import { errorMonitoring } from '@/lib/error-monitoring';
import { useAuth } from '@/lib/auth';

interface AxonPulsContextType {
  client: AxonPulsClient | null;
  isConnected: boolean;
  connectionStatus: {
    connected: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  };
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AxonPulsContext = createContext<AxonPulsContextType | null>(null);

interface AxonPulsProviderProps {
  children: React.ReactNode;
}

export const AxonPulsProvider: React.FC<AxonPulsProviderProps> = ({ children }) => {
  const [client, setClient] = useState<AxonPulsClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
  });
  
  const { isAuthenticated, tokens } = useAuth();
  const connectionAttempted = useRef(false);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = async () => {
    try {
      if (!tokens?.accessToken) {
        console.warn('No auth token available for AxonPuls connection');
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_AXONPULS_URL || 'ws://localhost:3001';
      const axonPulsClient = getAxonPulsClient(serverUrl, tokens.accessToken);
      
      await axonPulsClient.connect();
      
      setClient(axonPulsClient);
      setIsConnected(true);
      setConnectionStatus(axonPulsClient.getConnectionStatus());
      
      console.log('AxonPuls connected successfully');
      
    } catch (error) {
      console.error('AxonPuls connection failed:', error);
      
      errorMonitoring.captureError(error as Error, {
        severity: 'medium',
        category: 'system',
        timestamp: new Date(),
      });
      
      setIsConnected(false);
      
      // Retry connection with exponential backoff
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      
      const retryDelay = Math.min(1000 * Math.pow(2, connectionStatus.reconnectAttempts), 30000);
      reconnectTimer.current = setTimeout(() => {
        if (connectionStatus.reconnectAttempts < connectionStatus.maxReconnectAttempts) {
          setConnectionStatus(prev => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1,
          }));
          connect();
        }
      }, retryDelay);
    }
  };

  const disconnect = () => {
    if (client) {
      client.disconnect();
      setClient(null);
      setIsConnected(false);
      setConnectionStatus({
        connected: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
      });
    }
    
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && tokens?.accessToken && !connectionAttempted.current) {
      connectionAttempted.current = true;
      connect();
    } else if (!isAuthenticated && client) {
      disconnect();
      connectionAttempted.current = false;
    }
  }, [isAuthenticated, tokens?.accessToken]);

  // Update connection status periodically
  useEffect(() => {
    if (!client) return;

    const statusInterval = setInterval(() => {
      const status = client.getConnectionStatus();
      setConnectionStatus(status);
      setIsConnected(status.connected);
    }, 5000);

    return () => clearInterval(statusInterval);
  }, [client]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Update auth token when it changes
  useEffect(() => {
    if (client && tokens?.accessToken) {
      client.updateAuthToken(tokens.accessToken);
    }
  }, [client, tokens?.accessToken]);

  const contextValue: AxonPulsContextType = {
    client,
    isConnected,
    connectionStatus,
    connect,
    disconnect,
  };

  return (
    <AxonPulsContext.Provider value={contextValue}>
      {children}
      
      {/* Connection status indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`
            px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
            ${isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            }
          `}>
            <div className="flex items-center space-x-2">
              <div className={`
                w-2 h-2 rounded-full
                ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}
              `} />
              <span>
                AxonPuls {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {connectionStatus.reconnectAttempts > 0 && (
                <span className="text-xs opacity-75">
                  (Retry {connectionStatus.reconnectAttempts}/{connectionStatus.maxReconnectAttempts})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </AxonPulsContext.Provider>
  );
};

export const useAxonPulsContext = () => {
  const context = useContext(AxonPulsContext);
  if (!context) {
    throw new Error('useAxonPulsContext must be used within an AxonPulsProvider');
  }
  return context;
};