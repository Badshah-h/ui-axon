"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
} from "reactflow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Save, Play, Trash2, ZoomIn, ZoomOut, Square } from "lucide-react";
import NodeConfigPanel from "./NodeConfigPanel";
import { AgentNode, ToolNode, ConditionNode, ParallelNode, HumanInputNode, StartNode, EndNode, DefaultEdge   } from './nodes/WorkflowNodes';
import { useAxonPuls } from '@/lib/axon-puls';
import { Badge } from "../ui/badge";

// Define custom node types
const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  condition: ConditionNode,
  parallel: ParallelNode, 
  human_input: HumanInputNode,
  start: StartNode,
  end: EndNode,
};

// Define custom edge types
const edgeTypes = {
  default: DefaultEdge,
};

interface WorkflowCanvasProps {
  workflowId?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  readOnly?: boolean;
}

const WorkflowCanvas = ({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  readOnly = false,
}: WorkflowCanvasProps) => {
  // State for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("canvas");
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, any>>({});

  // Reference to the ReactFlow instance
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // AxonPuls integration
  const { subscribeToWorkflow, executeWorkflow, cancelWorkflow } = useAxonPuls();

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setActiveTab("config");
  }, []);

  // Handle edge connection
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges],
  );

  // Handle node deletion
  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            edge.source !== selectedNode.id && edge.target !== selectedNode.id,
        ),
      );
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Handle workflow saving
  const handleSaveWorkflow = useCallback(async () => {
    if (!reactFlowInstance) return;

    setIsSaving(true);
    try {
      // Get the current flow data
      const flowData = reactFlowInstance.toObject();

      // TODO: Implement API call to save workflow
      // Example: await fetch('/api/workflows', { method: 'POST', body: JSON.stringify(flowData) });

      console.log("Workflow saved:", flowData);
      // Show success notification
    } catch (error) {
      console.error("Error saving workflow:", error);
      // Show error notification
    } finally {
      setIsSaving(false);
    }
  }, [reactFlowInstance]);

  // Subscribe to workflow events
  useEffect(() => {
    if (!workflowId) return;

    const unsubscribe = subscribeToWorkflow(workflowId, (event) => {
      console.log('Workflow event:', event);
      
      switch (event.type) {
        case 'workflow.started':
          setIsExecuting(true);
          setExecutionId(event.data.executionId);
          break;
          
        case 'workflow.completed':
        case 'workflow.failed':
        case 'workflow.cancelled':
          setIsExecuting(false);
          setExecutionId(null);
          break;
          
        case 'node.started':
          updateNodeStatus(event.nodeId!, { status: 'running', progress: 0 });
          break;
          
        case 'node.completed':
          updateNodeStatus(event.nodeId!, { 
            status: 'success', 
            progress: 100,
            executionTime: event.data.duration,
            output: event.data.output 
          });
          break;
          
        case 'node.failed':
          updateNodeStatus(event.nodeId!, { 
            status: 'error', 
            error: event.data.error,
            executionTime: event.data.duration 
          });
          break;
          
        case 'node.waiting':
          updateNodeStatus(event.nodeId!, { status: 'waiting' });
          break;
          
        case 'agent.stream':
          updateNodeStatus(event.nodeId!, { 
            streaming: true,
            streamContent: event.data.content 
          });
          break;
      }
    });

    return unsubscribe;
  }, [workflowId, subscribeToWorkflow]);

  const updateNodeStatus = useCallback((nodeId: string, statusUpdate: any) => {
    setNodeStatuses(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], ...statusUpdate }
    }));

    // Update the actual node data
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...statusUpdate
          }
        };
      }
      return node;
    }));
  }, [setNodes]);

  // Enhanced workflow execution
  const handleRunWorkflow = useCallback(async () => {
    if (!workflowId) return;

    try {
      // Reset all node statuses
      setNodes(nds => nds.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: 'idle',
          progress: undefined,
          error: undefined,
          executionTime: undefined,
          streaming: false,
          streamContent: undefined
        }
      })));

      // Execute workflow via AxonPuls
      executeWorkflow(workflowId, {});
      
    } catch (error) {
      console.error('Error executing workflow:', error);
    }
  }, [workflowId, executeWorkflow, setNodes]);

  // Enhanced workflow cancellation
  const handleCancelWorkflow = useCallback(async () => {
    if (!workflowId || !executionId) return;

    try {
      cancelWorkflow(workflowId, executionId);
    } catch (error) {
      console.error('Error cancelling workflow:', error);
    }
  }, [workflowId, executionId, cancelWorkflow]);

  // Handle node configuration update
  const handleNodeConfigUpdate = useCallback(
    (nodeId: string, config: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                config,
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Add a new node to the canvas
  const addNewNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `New ${type}`, config: {} },
      };
      setNodes((nds) => [...nds, newNode]);
      return newNode;
    },
    [setNodes],
  );

  // Handle drag over for node palette items
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle drop from node palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      // Get the position where the node was dropped
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Add the new node
      const newNode = addNewNode(type, position);
      setSelectedNode(newNode);
      setActiveTab("config");
    },
    [reactFlowInstance, addNewNode],
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="flex justify-between items-center p-2 border-b">
          <TabsList>
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveWorkflow}
              disabled={isSaving || readOnly}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            {!isExecuting ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunWorkflow}
                disabled={!workflowId}
              >
                <Play className="h-4 w-4 mr-1" />
                Run
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelWorkflow}
              >
                <Square className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="canvas" className="flex-1 relative">
          <div className="h-full w-full" ref={reactFlowWrapper}>
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes as EdgeTypes}
                fitView
                snapToGrid
                snapGrid={[8, 8]}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                minZoom={0.2}
                maxZoom={4}
                deleteKeyCode={["Backspace", "Delete"]}
                selectionKeyCode={"Control"}
                multiSelectionKeyCode={"Shift"}
                defaultEdgeOptions={{
                  type: "default",
                  animated: true,
                }}
                className="workflow-canvas"
              >
                <Background
                  color="hsl(var(--muted-foreground) / 0.15)" 
                  gap={20} 
                  size={1} 
                  variant={BackgroundVariant.Default} 
                />
                <Controls />
                <MiniMap
                  nodeStrokeColor={(n) => {
                    const status = nodeStatuses[n.id]?.status;
                    return status === 'running' ? '#3b82f6' :
                           status === 'success' ? '#10b981' :
                           status === 'error' ? '#ef4444' :
                           n.selected ? '#8b5cf6' : '#64748b';
                  }}
                  nodeColor={(n) => {
                    const status = nodeStatuses[n.id]?.status;
                    return status === 'running' ? '#dbeafe' :
                           status === 'success' ? '#d1fae5' :
                           status === 'error' ? '#fee2e2' :
                           '#f8fafc';
                  }}
                  className="!bg-background !border-border"
                />
                <Panel position="top-right" className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => reactFlowInstance?.zoomIn()}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => reactFlowInstance?.zoomOut()}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => reactFlowInstance?.fitView()}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  {selectedNode && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={handleDeleteNode}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </Panel>

                {/* Execution status overlay */}
                {isExecuting && (
                  <Panel position="top-left" className="bg-background/95 backdrop-blur-sm border rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                      <span className="text-sm font-medium">Workflow Executing...</span>
                      {executionId && (
                        <Badge variant="outline" className="text-xs">
                          {executionId.slice(-8)}
                        </Badge>
                      )}
                    </div>
                  </Panel>
                )}
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </TabsContent>

        <TabsContent value="config" className="flex-1">
          <Card className="h-full overflow-auto p-4">
            {selectedNode ? (
              <NodeConfigPanel
                node={selectedNode}
                onUpdate={(config) =>
                  handleNodeConfigUpdate(selectedNode.id, config)
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a node to configure
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="execution" className="flex-1">
          <Card className="h-full overflow-auto p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Execution Status</h3>
                {executionId && (
                  <Badge variant="outline">ID: {executionId}</Badge>
                )}
              </div>
              
              {/* Node execution status */}
              <div className="space-y-2">
                <h4 className="font-medium">Node Status</h4>
                <div className="grid gap-2">
                  {nodes.map(node => {
                    const status = nodeStatuses[node.id];
                    return (
                      <div key={node.id} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{node.data.label}</span>
                        <div className="flex items-center space-x-2">
                          {status?.executionTime && (
                            <span className="text-xs text-muted-foreground">
                              {status.executionTime}ms
                            </span>
                          )}
                          <Badge 
                            variant={
                              status?.status === 'success' ? 'default' :
                              status?.status === 'error' ? 'destructive' :
                              status?.status === 'running' ? 'secondary' :
                              'outline'
                            }
                          >
                            {status?.status || 'idle'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="flex-1">
          <Card className="h-full overflow-auto p-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Execution Logs</h3>
              <div className="space-y-2 font-mono text-sm">
                {/* Real-time logs will be displayed here */}
                <div className="text-muted-foreground">
                  Logs will appear here during workflow execution...
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkflowCanvas;