"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import {
  Save,
  Play,
  Pause,
  Square,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Grid3X3,
  AlignCenter,
  Download,
  Upload,
  Share2,
  Settings,
  MoreHorizontal,
  Plus,
  Trash2,
  Copy,
  Edit,
  Eye,
  History,
  GitBranch,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Workflow,
  Bot,
  Wrench,
  Zap,
  Users,
  Timer,
  Split,
  Merge,
  ArrowRight,
  PlayCircle,
  StopCircle,
  RefreshCw,
  FileText,
  Code,
  Database,
  Globe,
  Mail,
  MessageSquare,
  Calendar,
  Image,
  FileImage,
  Search,
  Filter,
  SortAsc,
  Layers,
  Move,
  RotateCw,
  Scissors,
  Link,
  Unlink
} from "lucide-react";

// Enhanced workflow builder with production-grade features
export default function WorkflowBuilderPage() {
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Node types with enhanced configurations
  const nodeTypes = [
    {
      category: "Triggers",
      items: [
        { id: "webhook", name: "Webhook", icon: Globe, description: "HTTP webhook trigger", color: "bg-blue-500" },
        { id: "schedule", name: "Schedule", icon: Clock, description: "Time-based trigger", color: "bg-green-500" },
        { id: "manual", name: "Manual", icon: PlayCircle, description: "Manual execution", color: "bg-purple-500" },
        { id: "event", name: "Event", icon: Zap, description: "Event-driven trigger", color: "bg-yellow-500" }
      ]
    },
    {
      category: "AI Agents",
      items: [
        { id: "chat-agent", name: "Chat Agent", icon: MessageSquare, description: "Conversational AI agent", color: "bg-indigo-500" },
        { id: "task-agent", name: "Task Agent", icon: Bot, description: "Task-specific agent", color: "bg-cyan-500" },
        { id: "analysis-agent", name: "Analysis Agent", icon: Search, description: "Data analysis agent", color: "bg-teal-500" },
        { id: "creative-agent", name: "Creative Agent", icon: Image, description: "Content creation agent", color: "bg-pink-500" }
      ]
    },
    {
      category: "Tools",
      items: [
        { id: "email-tool", name: "Email", icon: Mail, description: "Send emails", color: "bg-red-500" },
        { id: "database-tool", name: "Database", icon: Database, description: "Database operations", color: "bg-orange-500" },
        { id: "api-tool", name: "API Call", icon: Globe, description: "HTTP API requests", color: "bg-blue-600" },
        { id: "file-tool", name: "File Handler", icon: FileText, description: "File operations", color: "bg-gray-500" },
        { id: "transform-tool", name: "Transform", icon: Code, description: "Data transformation", color: "bg-violet-500" },
        { id: "search-tool", name: "Search", icon: Search, description: "Search operations", color: "bg-emerald-500" }
      ]
    },
    {
      category: "Logic",
      items: [
        { id: "condition", name: "Condition", icon: GitBranch, description: "Conditional branching", color: "bg-amber-500" },
        { id: "parallel", name: "Parallel", icon: Split, description: "Parallel execution", color: "bg-lime-500" },
        { id: "merge", name: "Merge", icon: Merge, description: "Merge parallel flows", color: "bg-rose-500" },
        { id: "delay", name: "Delay", icon: Timer, description: "Add delays", color: "bg-slate-500" },
        { id: "loop", name: "Loop", icon: RotateCw, description: "Loop execution", color: "bg-fuchsia-500" }
      ]
    },
    {
      category: "Human Input",
      items: [
        { id: "approval", name: "Approval", icon: CheckCircle, description: "Human approval step", color: "bg-green-600" },
        { id: "form-input", name: "Form Input", icon: Edit, description: "Collect form data", color: "bg-blue-700" },
        { id: "review", name: "Review", icon: Eye, description: "Human review step", color: "bg-purple-600" }
      ]
    }
  ];

  // Mock workflow data
  const [workflowNodes, setWorkflowNodes] = useState([
    {
      id: "1",
      type: "webhook",
      position: { x: 100, y: 100 },
      data: { 
        label: "Webhook Trigger",
        config: { url: "/webhook/customer-support", method: "POST" },
        status: "idle"
      }
    },
    {
      id: "2", 
      type: "chat-agent",
      position: { x: 300, y: 100 },
      data: { 
        label: "Support Agent",
        config: { model: "gpt-4", temperature: 0.7 },
        status: "idle"
      }
    },
    {
      id: "3",
      type: "condition",
      position: { x: 500, y: 100 },
      data: { 
        label: "Issue Resolved?",
        config: { condition: "response.resolved === true" },
        status: "idle"
      }
    }
  ]);

  const [workflowEdges, setWorkflowEdges] = useState([
    { id: "e1-2", source: "1", target: "2", type: "smoothstep" },
    { id: "e2-3", source: "2", target: "3", type: "smoothstep" }
  ]);

  // Workflow execution simulation
  const handleExecuteWorkflow = async () => {
    setIsExecuting(true);
    setExecutionStatus("running");
    
    try {
      // Simulate workflow execution with real-time updates
      for (let i = 0; i < workflowNodes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setWorkflowNodes(prev => prev.map((node: any) => 
          node.id === workflowNodes[i].id 
            ? { ...node, data: { ...node.data, status: "running" } }
            : node
        ));
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setWorkflowNodes(prev => prev.map((node: any) => 
          node.id === workflowNodes[i].id 
            ? { ...node, data: { ...node.data, status: "success" } }
            : node
        ));
      }
      
      setExecutionStatus("success");
      toast({
        title: "Workflow Executed Successfully",
        description: "All nodes completed successfully",
      });
    } catch (error) {
      setExecutionStatus("error");
      toast({
        title: "Workflow Execution Failed",
        description: "An error occurred during execution",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
      
      // Reset node statuses after 3 seconds
      setTimeout(() => {
        setWorkflowNodes(prev => prev.map((node: any) => ({
          ...node,
          data: { ...node.data, status: "idle" }
        })));
        setExecutionStatus("idle");
      }, 3000);
    }
  };

  const handleSaveWorkflow = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastSaved(new Date());
      setIsDirty(false);
      toast({
        title: "Workflow Saved",
        description: "Your workflow has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save workflow",
        variant: "destructive",
      });
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && isDirty) {
      const timer = setTimeout(() => {
        handleSaveWorkflow();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoSave, isDirty]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getNodeIcon = (type: string) => {
    const nodeType = nodeTypes
      .flatMap(category => category.items)
      .find(item => item.id === type);
    
    if (nodeType) {
      const IconComponent = nodeType.icon;
      return <IconComponent className="w-4 h-4" />;
    }
    return <Workflow className="w-4 h-4" />;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-4">
          <Input
            value={workflowName}
            onChange={(e) => {
              setWorkflowName(e.target.value);
              setIsDirty(true);
            }}
            className="text-lg font-semibold bg-transparent border-none focus-visible:ring-0 px-0"
          />
          {isDirty && <Badge variant="outline">Unsaved</Badge>}
          {lastSaved && (
            <span className="text-sm text-muted-foreground">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Execution Controls */}
          <div className="flex items-center space-x-1 mr-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExecuteWorkflow}
              disabled={isExecuting}
              className="bg-green-500 hover:bg-green-600 text-white border-green-500"
            >
              {isExecuting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isExecuting ? "Running..." : "Execute"}
            </Button>
            
            {isExecuting && (
              <Button variant="outline" size="sm">
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-1 mr-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomLevel(prev => Math.min(prev + 25, 200))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {zoomLevel}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomLevel(prev => Math.max(prev - 25, 25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant={showGrid ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowGrid(!showGrid)}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={showMinimap ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowMinimap(!showMinimap)}
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <Button variant="outline" size="sm" onClick={handleSaveWorkflow}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Users className="w-4 h-4 mr-2" />
                Invite Collaborators
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Code className="w-4 h-4 mr-2" />
                Generate Code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Workflow Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <History className="w-4 h-4 mr-2" />
                Version History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Upload className="w-4 h-4 mr-2" />
                Import Workflow
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Workflow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <div className="w-80 border-r bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2">Node Palette</h3>
            <Input placeholder="Search nodes..." className="mb-4" />
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {nodeTypes.map((category) => (
                <div key={category.category}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    {category.category}
                  </h4>
                  <div className="space-y-2">
                    {category.items.map((node) => (
                      <div
                        key={node.id}
                        className="flex items-center p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors group"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/reactflow", node.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                      >
                        <div className={`w-8 h-8 rounded-lg ${node.color} flex items-center justify-center mr-3`}>
                          <node.icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{node.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {node.description}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative">
          {/* Canvas */}
          <div 
            className={`w-full h-full ${showGrid ? 'bg-grid-pattern' : ''}`}
            style={{ 
              backgroundSize: `${zoomLevel}px ${zoomLevel}px`,
              transform: `scale(${zoomLevel / 100})`
            }}
          >
            {/* Workflow Nodes */}
            <div className="absolute inset-0 p-8">
              {workflowNodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute glass-card p-4 min-w-[200px] cursor-move hover:shadow-lg transition-all duration-200"
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    transform: selectedNodes.includes(node.id) ? 'scale(1.05)' : 'scale(1)',
                    borderColor: selectedNodes.includes(node.id) ? 'hsl(var(--primary))' : undefined
                  }}
                  onClick={() => {
                    setSelectedNodes(prev => 
                      prev.includes(node.id) 
                        ? prev.filter(id => id !== node.id)
                        : [...prev, node.id]
                    );
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getNodeIcon(node.type)}
                      <span className="font-medium text-sm">{node.data.label}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(node.data.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-6 h-6">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-3">
                    {node.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  
                  {/* Connection Points */}
                  <div className="flex justify-between">
                    <div className="w-3 h-3 rounded-full bg-muted border-2 border-background -ml-6 mt-2" />
                    <div className="w-3 h-3 rounded-full bg-muted border-2 border-background -mr-6 mt-2" />
                  </div>
                </div>
              ))}
              
              {/* Connection Lines */}
              <svg className="absolute inset-0 pointer-events-none">
                {workflowEdges.map((edge) => {
                  const sourceNode = workflowNodes.find(n => n.id === edge.source);
                  const targetNode = workflowNodes.find(n => n.id === edge.target);
                  
                  if (!sourceNode || !targetNode) return null;
                  
                  const x1 = sourceNode.position.x + 200;
                  const y1 = sourceNode.position.y + 50;
                  const x2 = targetNode.position.x;
                  const y2 = targetNode.position.y + 50;
                  
                  return (
                    <line
                      key={edge.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="hsl(var(--border))"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
                
                {/* Arrow marker */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="hsl(var(--border))"
                    />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>

          {/* Execution Status Overlay */}
          {executionStatus === "running" && (
            <div className="absolute top-4 right-4 glass-card p-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium">Executing Workflow...</span>
              </div>
            </div>
          )}

          {/* Minimap */}
          {showMinimap && (
            <div className="absolute bottom-4 right-4 w-48 h-32 glass-card p-2">
              <div className="w-full h-full bg-muted/20 rounded relative">
                {workflowNodes.map((node) => (
                  <div
                    key={node.id}
                    className="absolute w-4 h-3 bg-primary/60 rounded"
                    style={{
                      left: `${(node.position.x / 800) * 100}%`,
                      top: `${(node.position.y / 600) * 100}%`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        <div className="w-80 border-l bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Properties</h3>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4">
              {selectedNodes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Workflow className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a node to view its properties</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedNodes.map((nodeId) => {
                    const node = workflowNodes.find(n => n.id === nodeId);
                    if (!node) return null;
                    
                    return (
                      <Card key={nodeId}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center space-x-2">
                            {getNodeIcon(node.type)}
                            <span>{node.data.label}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor={`name-${nodeId}`} className="text-xs">Name</Label>
                            <Input
                              id={`name-${nodeId}`}
                              value={node.data.label}
                              onChange={(e) => {
                                setWorkflowNodes(prev => prev.map((n: any) => 
                                  n.id === nodeId 
                                    ? { ...n, data: { ...n.data, label: e.target.value } }
                                    : n
                                ));
                                setIsDirty(true);
                              }}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">Configuration</Label>
                            <div className="mt-2 p-3 bg-muted rounded-lg">
                              <pre className="text-xs text-muted-foreground">
                                {JSON.stringify(node.data.config, null, 2)}
                              </pre>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              <Edit className="w-3 h-3 mr-1" />
                              Configure
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              <Play className="w-3 h-3 mr-1" />
                              Test
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}