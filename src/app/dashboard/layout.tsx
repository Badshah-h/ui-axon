"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Workflow,
  Bot,
  Wrench,
  Zap,
  Users,
  Settings,
  BarChart3,
  Shield,
  Globe,
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Command,
  Plus,
  Menu,
  X,
  HelpCircle,
  LogOut,
  User,
  Building,
  CreditCard,
  Palette,
  Database,
  Key,
  Activity,
  FileText,
  Code,
  Puzzle,
  Brain,
  MessageSquare,
  Calendar,
  Archive,
  Star,
  Bookmark
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  badge?: string;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    href: "/dashboard"
  },
  {
    id: "workflows",
    label: "Workflows",
    icon: Workflow,
    href: "/workflows",
    badge: "12",
    children: [
      { id: "workflow-builder", label: "Builder", icon: Plus, href: "/workflows/builder" },
      { id: "workflow-templates", label: "Templates", icon: Archive, href: "/workflows/templates" },
      { id: "workflow-executions", label: "Executions", icon: Activity, href: "/workflows/executions" }
    ]
  },
  {
    id: "agents",
    label: "AI Agents",
    icon: Bot,
    href: "/dashboard/agents",
    badge: "8",
    children: [
      { id: "agent-builder", label: "Agent Builder", icon: Brain, href: "/dashboard/agents/builder" },
      { id: "agent-templates", label: "Templates", icon: Star, href: "/dashboard/agents/templates" },
      { id: "agent-sessions", label: "Live Sessions", icon: MessageSquare, href: "/dashboard/agents/sessions" }
    ]
  },
  {
    id: "tools",
    label: "Tools",
    icon: Wrench,
    href: "/dashboard/tools",
    badge: "24",
    children: [
      { id: "tool-manager", label: "Tool Manager", icon: Puzzle, href: "/dashboard/tools/manager" },
      { id: "tool-builder", label: "Tool Builder", icon: Code, href: "/dashboard/tools/builder" },
      { id: "tool-marketplace", label: "Marketplace", icon: Globe, href: "/dashboard/tools/marketplace" }
    ]
  },
  {
    id: "providers",
    label: "AI Providers",
    icon: Zap,
    href: "/dashboard/providers",
    children: [
      { id: "provider-config", label: "Configuration", icon: Settings, href: "/dashboard/providers/config" },
      { id: "provider-monitoring", label: "Monitoring", icon: Activity, href: "/dashboard/providers/monitoring" },
      { id: "provider-costs", label: "Cost Analysis", icon: BarChart3, href: "/dashboard/providers/costs" }
    ]
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
    children: [
      { id: "analytics-overview", label: "Overview", icon: BarChart3, href: "/dashboard/analytics/overview" },
      { id: "analytics-performance", label: "Performance", icon: Activity, href: "/dashboard/analytics/performance" },
      { id: "analytics-usage", label: "Usage", icon: FileText, href: "/dashboard/analytics/usage" }
    ]
  },
  {
    id: "collaboration",
    label: "Collaboration",
    icon: Users,
    href: "/dashboard/collaboration",
    children: [
      { id: "team-members", label: "Team Members", icon: Users, href: "/dashboard/collaboration/members" },
      { id: "shared-workflows", label: "Shared Workflows", icon: Workflow, href: "/dashboard/collaboration/workflows" },
      { id: "comments", label: "Comments", icon: MessageSquare, href: "/dashboard/collaboration/comments" }
    ]
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Globe,
    href: "/dashboard/integrations",
    children: [
      { id: "webhooks", label: "Webhooks", icon: Zap, href: "/dashboard/integrations/webhooks" },
      { id: "api-keys", label: "API Keys", icon: Key, href: "/dashboard/integrations/api-keys" },
      { id: "embeds", label: "Embeds", icon: Code, href: "/dashboard/integrations/embeds" }
    ]
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    href: "/dashboard/security",
    children: [
      { id: "rbac", label: "Roles & Permissions", icon: Shield, href: "/dashboard/security/rbac" },
      { id: "audit-logs", label: "Audit Logs", icon: FileText, href: "/dashboard/security/audit" },
      { id: "sessions", label: "Sessions", icon: Activity, href: "/dashboard/security/sessions" }
    ]
  }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isItemActive = (item: NavigationItem): boolean => {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) return true;
    if (item.children && item.children.length > 0) {
      return item.children.some(child => (
        pathname === child.href || pathname.startsWith(child.href + '/')
      ));
    }
    return false;
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = isItemActive(item);
    const destinationHref = hasChildren ? (item.children?.[0]?.href || item.href) : item.href;

    return (
      <div key={item.id} className="space-y-1">
        <div className="flex items-center">
          <Link
            href={destinationHref}
            className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${active
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              } ${level > 0 ? 'ml-4' : ''}`}
          >
            <item.icon className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-3'} ${active ? 'text-primary-foreground' : ''}`} />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge variant={active ? "secondary" : "outline"} className="ml-2 text-xs">
                    {item.badge}
                  </Badge>
                )}
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-4 h-4 p-0 ml-2"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleExpanded(item.id);
                    }}
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                )}
              </>
            )}
          </Link>
        </div>

        {hasChildren && isExpanded && !sidebarCollapsed && (
          <div className="space-y-1">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Command Palette */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Command className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search workflows, agents, tools..."
                  className="border-0 bg-transparent focus-visible:ring-0"
                  autoFocus
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Quick Actions</div>
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Workflow
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" size="sm">
                    <Bot className="w-4 h-4 mr-2" />
                    Create New Agent
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" size="sm">
                    <Wrench className="w-4 h-4 mr-2" />
                    Create New Tool
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold gradient-text">AxtonStreamAI</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-2">
            {navigationItems.map(item => renderNavigationItem(item))}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="border-t p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between h-full px-4">
            {/* Left Side */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center space-x-2 text-muted-foreground"
              >
                <Search className="w-4 h-4" />
                <span>Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4" />
                <Badge className="absolute -top-1 -right-1 w-2 h-2 p-0 bg-red-500" />
              </Button>

              <ThemeToggle />

              <Separator orientation="vertical" className="h-6" />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 px-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium">John Doe</div>
                      <div className="text-xs text-muted-foreground">john@company.com</div>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Building className="w-4 h-4 mr-2" />
                    Organization
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}