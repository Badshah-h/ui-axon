"use client";

import React, { useState, useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Play, 
  Settings, 
  Share, 
  Download, 
  Upload,
  Zap,
  Users,
  Clock,
  Activity,
  ChevronLeft,
  MoreHorizontal
} from 'lucide-react';
import WorkflowCanvas from '@/components/workflows/WorkflowCanvas';
import NodePalette from '@/components/workflows/NodePalette';
import NodeConfigPanel from '@/components/workflows/NodeConfigPanel';
import { getAxonPulsClient } from '@/lib/axon-puls';
import { Workflow, WorkflowNode, WorkflowEdge } from '@/types/workflow';

interface WorkflowBuilderProps {
  workflowId?: string;
  initialWorkflow?: Workflow;
  onSave?: (workflow: Workflow) => void;
  onExecute?: (workflowId: string) => void;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  workflowId,
  initialWorkflow,
  onSave,
  onExecute
}) => {
  const [workflow, setWorkflow] = useState<Workflow | null>(initialWorkflow || null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStats, setExecutionStats] = useState({
    totalExecutions: 0,
    successRate: 0,
    avgExecutionTime: 0,
    lastExecuted: null as Date | null,
  });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  // Initialize AxonPuls connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        setConnectionStatus('connecting');
        const client = getAxonPulsClient(
          process.env.NEXT_PUBLIC_AXON_PULS_URL || 'ws://localhost:3001',
          localStorage.getItem('auth_token') || undefined
        );
        await client.connect();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to connect to AxonPuls:', error);
        setConnectionStatus('disconnected');
      }
    };

    initializeConnection();
  }, []);

  // Load workflow data
  useEffect(() => {
    if (workflowId && !initialWorkflow) {
      loadWorkflow(workflowId);
    }
  }, [workflowId, initialWorkflow]);

  const loadWorkflow = async (id: string) => {
    try {
      // TODO: Implement API call to load workflow
      // const response = await fetch(`/api/workflows/${id}`);
      // const workflowData = await response.json();
      // setWorkflow(workflowData);
      
      // Mock workflow for now
      const mockWorkflow: Workflow = {
        id,
        name: 'AI Content Generation Pipeline',
        description: 'Automated content generation using multiple AI agents',
        version: 1,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: {
              label: 'Start',
              config: {
                label: 'Start',
                description: 'Start of the workflow'
              }
            }
          },
          {
            id: 'agent-1',
            type: 'agent',
            position: { x: 300, y: 100 },
            data: {
              label: 'Content Generator',
              description: 'Generate initial content based on user prompt',
              config: {
                label: 'Content Generator',
                agentId: 'gpt-4',
                model: 'gpt-4-turbo',
                temperature: 0.7,
                maxTokens: 1000,
                systemPrompt: 'You are a creative content generator.'
              }
            }
          },
          {
            id: 'agent-2',
            type: 'agent',
            position: { x: 500, y: 100 },
            data: {
              label: 'Content Reviewer',
              description: 'Review and improve the generated content',
              config: {
                label: 'Content Reviewer',
                agentId: 'claude-3',
                model: 'claude-3-sonnet',
                temperature: 0.3,
                systemPrompt: 'You are a content reviewer and editor.'
              }
            }
          },
          {
            id: 'end-1',
            type: 'end',
            position: { x: 700, y: 100 },
            data: {
              label: 'End',
              config: {
                label: 'End',
                description: 'End of the workflow'
              }
            }
          }
        ],
        edges: [
          {
            id: 'e1-2',
            source: 'start-1',
            target: 'agent-1',
            animated: true
          },
          {
            id: 'e2-3',
            source: 'agent-1',
            target: 'agent-2',
            animated: true
          },
          {
            id: 'e3-4',
            source: 'agent-2',
            target: 'end-1',
            animated: true
          }
        ],
        variables: {},
        settings: {
          maxExecutionTime: 300,
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential',
            baseDelay: 1000,
            maxDelay: 10000
          },
          errorHandling: {
            onError: 'stop',
            notifyOnError: true
          },
          logging: {
            level: 'info',
            includeInputs: true,
            includeOutputs: true,
            retention: 30
          },
          notifications: {
            onStart: false,
            onComplete: true,
            onError: true,
            channels: []
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        status: 'draft'
      };
      
      setWorkflow(mockWorkflow);
    } catch (error) {
      console.error('Error loading workflow:', error);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!workflow) return;

    try {
      // TODO: Implement API call to save workflow
      // await fetch(`/api/workflows/${workflow.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(workflow)
      // });

      if (onSave) {
        onSave(workflow);
      }
      
      console.log('Workflow saved:', workflow);
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!workflow) return;

    setIsExecuting(true);
    try {
      if (onExecute) {
        onExecute(workflow.id);
      }
      
      // Update execution stats
      setExecutionStats(prev => ({
        ...prev,
        totalExecutions: prev.totalExecutions + 1,
        lastExecuted: new Date()
      }));
    } catch (error) {
      console.error('Error executing workflow:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleNodeSelect = (nodeType: string) => {
    // Add node to center of canvas
    if (!workflow) return;

    const newNode: WorkflowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType as any,
      position: { x: 400, y: 300 },
      data: {
        label: `New ${nodeType}`,
        config: {
          label: `New ${nodeType}`,
          description: `New ${nodeType} node`
        }
      }
    };

    setWorkflow(prev => prev ? {
      ...prev,
      nodes: [...prev.nodes, newNode]
    } : null);
  };

  if (!workflow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p>Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold text-lg">{workflow.name}</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="capitalize">
                  {workflow.status}
                </Badge>
                <span>v{workflow.version}</span>
                <span>•</span>
                <span>{workflow.nodes.length} nodes</span>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="capitalize">{connectionStatus}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Execution Stats */}
            <div className="hidden lg:flex items-center space-x-4 text-sm text-muted-foreground mr-4">
              <div className="flex items-center space-x-1">
                <Activity className="h-4 w-4" />
                <span>{executionStats.totalExecutions} runs</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4" />
                <span>{executionStats.successRate}% success</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{executionStats.avgExecutionTime}ms avg</span>
              </div>
            </div>

            {/* Action Buttons */}
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveWorkflow}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button 
              size="sm" 
              onClick={handleExecuteWorkflow}
              disabled={isExecuting}
            >
              <Play className="h-4 w-4 mr-1" />
              {isExecuting ? 'Running...' : 'Run'}
            </Button>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Node Palette */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <NodePalette onNodeSelect={handleNodeSelect} />
          </ResizablePanel>

          <ResizableHandle />

          {/* Canvas */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <WorkflowCanvas
              workflowId={workflow.id}
              initialNodes={workflow.nodes}
              initialEdges={workflow.edges}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Configuration Panel */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <Tabs defaultValue="properties" className="h-full flex flex-col">
              <div className="border-b px-4 py-2">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="properties" className="flex-1 m-0">
                <NodeConfigPanel
                  selectedNode={selectedNode}
                  onUpdateNodeConfig={(nodeId, config) => {
                    setWorkflow(prev => prev ? {
                      ...prev,
                      nodes: prev.nodes.map(node => 
                        node.id === nodeId 
                          ? { ...node, data: { ...node.data, config } }
                          : node
                      )
                    } : null);
                  }}
                />
              </TabsContent>

              <TabsContent value="settings" className="flex-1 m-0 p-4">
                <Card className="h-full p-4">
                  <h3 className="font-medium mb-4">Workflow Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Max Execution Time</label>
                      <p className="text-xs text-muted-foreground">
                        {workflow.settings.maxExecutionTime}s
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Retry Policy</label>
                      <p className="text-xs text-muted-foreground">
                        Max {workflow.settings.retryPolicy?.maxRetries} retries
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Error Handling</label>
                      <p className="text-xs text-muted-foreground capitalize">
                        {workflow.settings.errorHandling?.onError}
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="flex-1 m-0 p-4">
                <Card className="h-full p-4">
                  <h3 className="font-medium mb-4">Execution History</h3>
                  <div className="space-y-2">
                    {executionStats.lastExecuted ? (
                      <div className="text-sm">
                        <p>Last executed: {executionStats.lastExecuted.toLocaleString()}</p>
                        <p>Total runs: {executionStats.totalExecutions}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No execution history yet
                      </p>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default WorkflowBuilder;