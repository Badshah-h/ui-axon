'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Settings,
  Eye,
  Lock,
  Zap,
  BarChart3,
  Users,
  Database,
  Server,
  Wifi,
  HardDrive
} from 'lucide-react';
import { monitoring, useMonitoring } from '@/lib/monitoring';
import { vulnerabilityScanner } from '@/lib/vulnerability-scanner';
import { configManager, useConfiguration } from '@/lib/configuration';
import { uiOptimizer, useAccessibility, usePerformanceOptimization } from '@/lib/ui-optimization';

interface SecurityMetrics {
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  openVulnerabilities: number;
  complianceScore: number;
  lastScanDate: Date;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
}

interface SystemStatus {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
}

export default function SecurityDashboard() {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    totalVulnerabilities: 0,
    criticalVulnerabilities: 0,
    openVulnerabilities: 0,
    complianceScore: 95,
    lastScanDate: new Date(),
    systemHealth: 'healthy',
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    uptime: 99.9,
    memoryUsage: 65,
    cpuUsage: 45,
    activeUsers: 1247,
    requestsPerMinute: 3420,
    errorRate: 0.02,
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [isScanning, setIsScanning] = useState(false);

  const { getSystemHealth, recordMetric } = useMonitoring();
  const { config } = useConfiguration();
  const { config: accessibilityConfig, updateConfig: updateAccessibilityConfig } = useAccessibility();
  const { measurePerformance } = usePerformanceOptimization();

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      // Load vulnerability data
      const vulnerabilities = vulnerabilityScanner.getVulnerabilities();
      const openVulns = vulnerabilities.filter(v => v.status === 'open');
      const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical' && v.status === 'open');
      
      // Load compliance data
      const complianceChecks = vulnerabilityScanner.getComplianceStatus();
      const compliantChecks = complianceChecks.filter(c => c.status === 'compliant').length;
      const complianceScore = (compliantChecks / complianceChecks.length) * 100;

      // Load system health
      const health = await getSystemHealth();

      setSecurityMetrics({
        totalVulnerabilities: vulnerabilities.length,
        criticalVulnerabilities: criticalVulns.length,
        openVulnerabilities: openVulns.length,
        complianceScore,
        lastScanDate: vulnerabilityScanner.getLatestScan()?.timestamp || new Date(),
        systemHealth: health.status,
      });

      // Update system status with real data
      setSystemStatus(prev => ({
        ...prev,
        memoryUsage: health.memory.percentage,
        uptime: (health.uptime / 86400) * 100, // Convert to percentage
      }));

    } catch (error) {
      console.error('Failed to load security data:', error);
    }
  };

  const runSecurityScan = async () => {
    setIsScanning(true);
    try {
      await vulnerabilityScanner.runFullScan();
      await loadSecurityData();
    } catch (error) {
      console.error('Security scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Security & Monitoring Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Production-grade security, monitoring, and performance optimization
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={securityMetrics.systemHealth === 'healthy' ? 'default' : 'destructive'}>
            <Activity className="w-4 h-4 mr-1" />
            System {securityMetrics.systemHealth}
          </Badge>
          <Button onClick={runSecurityScan} disabled={isScanning}>
            {isScanning ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Run Security Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {securityMetrics.criticalVulnerabilities > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 dark:text-red-200">Critical Security Alert</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            {securityMetrics.criticalVulnerabilities} critical vulnerabilities detected. Immediate action required.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.complianceScore.toFixed(1)}%</div>
            <Progress value={securityMetrics.complianceScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Compliance with security standards
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Vulnerabilities</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.openVulnerabilities}</div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={getSeverityColor('critical')}>
                {securityMetrics.criticalVulnerabilities} Critical
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus.uptime.toFixed(2)}%</div>
            <Progress value={systemStatus.uptime} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Last 30 days availability
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus.activeUsers.toLocaleString()}</div>
            <div className="text-xs text-green-600 mt-2">
              +12% from last week
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Memory Usage</span>
                  <span className="text-sm font-medium">{systemStatus.memoryUsage}%</span>
                </div>
                <Progress value={systemStatus.memoryUsage} />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">CPU Usage</span>
                  <span className="text-sm font-medium">{systemStatus.cpuUsage}%</span>
                </div>
                <Progress value={systemStatus.cpuUsage} />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Error Rate</span>
                  <span className="text-sm font-medium">{systemStatus.errorRate}%</span>
                </div>
                <Progress value={systemStatus.errorRate} className="bg-red-100" />
              </CardContent>
            </Card>

            {/* Recent Security Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Recent Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Security scan completed</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Failed login attempt detected</p>
                      <p className="text-xs text-muted-foreground">15 minutes ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Configuration updated</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vulnerability Assessment</CardTitle>
              <CardDescription>
                Comprehensive security vulnerability analysis and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vulnerabilityScanner.getVulnerabilities('open').map((vuln) => (
                  <div key={vuln.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{vuln.title}</h4>
                      <Badge className={getSeverityColor(vuln.severity)}>
                        {vuln.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{vuln.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Location: {vuln.location}</span>
                      <span>Discovered: {vuln.discoveredAt.toLocaleDateString()}</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded">
                      <p className="text-sm"><strong>Recommendation:</strong> {vuln.recommendation}</p>
                    </div>
                  </div>
                ))}
                
                {vulnerabilityScanner.getVulnerabilities('open').length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Open Vulnerabilities</h3>
                    <p className="text-muted-foreground">Your system is secure!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['GDPR', 'SOC2', 'HIPAA'].map((standard) => (
              <Card key={standard}>
                <CardHeader>
                  <CardTitle className="text-lg">{standard} Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {vulnerabilityScanner.getComplianceStatus()
                      .filter(check => check.standard === standard)
                      .map((check) => (
                        <div key={check.requirement} className="flex items-center space-x-2">
                          {check.status === 'compliant' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm">{check.requirement}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Requests/min</span>
                    <span className="text-sm font-medium">{systemStatus.requestsPerMinute.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg Response Time</span>
                    <span className="text-sm font-medium">245ms</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <span className="text-sm font-medium">{systemStatus.errorRate}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Connections</span>
                    <span className="text-sm font-medium">8/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wifi className="w-5 h-5 mr-2" />
                  Service Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'API Gateway', status: 'operational', uptime: '99.9%' },
                    { name: 'Database', status: 'operational', uptime: '99.8%' },
                    { name: 'Redis Cache', status: 'operational', uptime: '100%' },
                    { name: 'Email Service', status: 'degraded', uptime: '98.5%' },
                  ].map((service) => (
                    <div key={service.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          service.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        <span className="text-sm">{service.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{service.uptime}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  UI Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">First Contentful Paint</span>
                    <span className="text-sm font-medium">1.2s</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Largest Contentful Paint</span>
                    <span className="text-sm font-medium">2.1s</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cumulative Layout Shift</span>
                    <span className="text-sm font-medium">0.05</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bundle Size</span>
                    <span className="text-sm font-medium">245 KB</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Accessibility Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Font Size</span>
                    <select 
                      value={accessibilityConfig.fontSize}
                      onChange={(e) => updateAccessibilityConfig({ 
                        fontSize: e.target.value as any 
                      })}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="extra-large">Extra Large</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Contrast</span>
                    <input
                      type="checkbox"
                      checked={accessibilityConfig.enableHighContrast}
                      onChange={(e) => updateAccessibilityConfig({ 
                        enableHighContrast: e.target.checked 
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Reduced Motion</span>
                    <input
                      type="checkbox"
                      checked={accessibilityConfig.enableReducedMotion}
                      onChange={(e) => updateAccessibilityConfig({ 
                        enableReducedMotion: e.target.checked 
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Management</CardTitle>
              <CardDescription>
                Secure configuration management with audit logging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Application Settings</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Environment:</span>
                        <Badge variant="outline">{config['app.environment'] || 'development'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Debug Mode:</span>
                        <Badge variant={config['app.debug'] ? 'destructive' : 'default'}>
                          {config['app.debug'] ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Security Settings</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>JWT Expiry:</span>
                        <span>{config['security.jwt.accessExpiry'] || '15m'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Login Attempts:</span>
                        <span>{config['security.maxLoginAttempts'] || '5'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Configuration Audit Log</h4>
                  <div className="text-sm text-muted-foreground">
                    Recent configuration changes would be displayed here with timestamps,
                    user information, and change details.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}