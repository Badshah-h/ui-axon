"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import {
  Workflow,
  Bot,
  Wrench,
  Zap,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Play,
  Pause,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Star,
  MessageSquare,
  Share2,
  Copy,
  ExternalLink
} from "lucide-react";

// Mock data for dashboard
const dashboardStats = {
  workflows: { total: 24, active: 18, completed: 156, failed: 3 },
  agents: { total: 12, active: 8, sessions: 45, avgResponseTime: 1.2 },
  tools: { total: 36, active: 28, executions: 1247, successRate: 98.5 },
  providers: { total: 6, active: 4, totalCost: 234.56, avgLatency: 0.8 }
};

const recentActivity = [
  {
    id: 1,
    type: "workflow",
    title: "Customer Support Workflow",
    action: "executed",
    status: "success",
    time: "2 minutes ago",
    user: "John Doe",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john"
  },
  {
    id: 2,
    type: "agent",
    title: "Sales Assistant Agent",
    action: "created",
    status: "success",
    time: "15 minutes ago",
    user: "Sarah Chen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
  },
  {
    id: 3,
    type: "tool",
    title: "Email Sender Tool",
    action: "updated",
    status: "success",
    time: "1 hour ago",
    user: "Mike Johnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike"
  },
  {
    id: 4,
    type: "workflow",
    title: "Data Processing Pipeline",
    action: "failed",
    status: "error",
    time: "2 hours ago",
    user: "Emily Watson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily"
  }
];

const executionData = [
  { name: "Mon", workflows: 24, agents: 18, tools: 45 },
  { name: "Tue", workflows: 32, agents: 25, tools: 52 },
  { name: "Wed", workflows: 28, agents: 22, tools: 48 },
  { name: "Thu", workflows: 35, agents: 30, tools: 58 },
  { name: "Fri", workflows: 42, agents: 35, tools: 65 },
  { name: "Sat", workflows: 18, agents: 15, tools: 32 },
  { name: "Sun", workflows: 15, agents: 12, tools: 28 }
];

const performanceData = [
  { name: "00:00", latency: 0.8, success: 98.5 },
  { name: "04:00", latency: 0.7, success: 99.1 },
  { name: "08:00", latency: 1.2, success: 97.8 },
  { name: "12:00", latency: 1.5, success: 96.5 },
  { name: "16:00", latency: 1.8, success: 95.2 },
  { name: "20:00", latency: 1.1, success: 98.8 }
];

const providerUsage = [
  { name: "OpenAI", value: 45, color: "#8884d8" },
  { name: "Claude", value: 25, color: "#82ca9d" },
  { name: "Gemini", value: 20, color: "#ffc658" },
  { name: "Mistral", value: 10, color: "#ff7300" }
];

const topWorkflows = [
  {
    id: 1,
    name: "Customer Support Automation",
    executions: 156,
    successRate: 98.5,
    avgDuration: "2.3s",
    status: "active",
    lastRun: "2 minutes ago"
  },
  {
    id: 2,
    name: "Lead Generation Pipeline",
    executions: 89,
    successRate: 96.2,
    avgDuration: "4.1s",
    status: "active",
    lastRun: "15 minutes ago"
  },
  {
    id: 3,
    name: "Content Moderation Flow",
    executions: 234,
    successRate: 99.1,
    avgDuration: "1.8s",
    status: "active",
    lastRun: "5 minutes ago"
  },
  {
    id: 4,
    name: "Data Processing Pipeline",
    executions: 45,
    successRate: 87.3,
    avgDuration: "8.2s",
    status: "error",
    lastRun: "2 hours ago"
  }
];

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState("7d");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "workflow":
        return <Workflow className="w-4 h-4" />;
      case "agent":
        return <Bot className="w-4 h-4" />;
      case "tool":
        return <Wrench className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your AI orchestration platform.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Workflow className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.workflows.active}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12%
              </span>
              from last month
            </p>
            <div className="mt-2">
              <Progress value={75} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
            <Bot className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.agents.active}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +8%
              </span>
              from last month
            </p>
            <div className="mt-2">
              <Progress value={67} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tools</CardTitle>
            <Wrench className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.tools.active}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +15%
              </span>
              from last month
            </p>
            <div className="mt-2">
              <Progress value={78} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.tools.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +2.1%
              </span>
              from last month
            </p>
            <div className="mt-2">
              <Progress value={98.5} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Trends */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Execution Trends</CardTitle>
            <CardDescription>
              Daily execution counts for workflows, agents, and tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={executionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="workflows" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="agents" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                <Area type="monotone" dataKey="tools" stackId="1" stroke="#ffc658" fill="#ffc658" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Average latency and success rate over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="latency" stroke="#8884d8" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="success" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Provider Usage and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider Usage */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>AI Provider Usage</CardTitle>
            <CardDescription>
              Distribution of AI provider usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={providerUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {providerUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {providerUsage.map((provider, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: provider.color }}
                    />
                    <span className="text-sm">{provider.name}</span>
                  </div>
                  <span className="text-sm font-medium">{provider.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest actions across your platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={activity.avatar} />
                    <AvatarFallback>{activity.user.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(activity.type)}
                      <span className="text-sm font-medium truncate">{activity.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.action}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-muted-foreground">by {activity.user}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  </div>
                  {getStatusIcon(activity.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Workflows */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Workflows</CardTitle>
              <CardDescription>
                Most active workflows in your organization
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topWorkflows.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Workflow className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">{workflow.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {workflow.executions} executions • Last run {workflow.lastRun}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{workflow.successRate}%</div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{workflow.avgDuration}</div>
                    <div className="text-xs text-muted-foreground">Avg Duration</div>
                  </div>
                  <Badge variant={workflow.status === "active" ? "default" : "destructive"}>
                    {workflow.status}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}