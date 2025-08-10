"use client";

import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, BaseEdge, EdgeProps, getBezierPath } from 'reactflow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  Wrench,
  GitBranch,
  Users,
  Clock,
  Zap,
  Play,
  Pause,
  Square,
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageSquare,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { NodeData, NodeStatus } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface BaseNodeProps extends NodeProps {
  data: NodeData & {
    status?: NodeStatus;
    progress?: number;
    executionTime?: number;
    error?: string;
    streaming?: boolean;
    streamContent?: string;
    isMinimized?: boolean;
  };
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'agent': return Bot;
    case 'tool': return Wrench;
    case 'condition': return GitBranch;
    case 'parallel': return GitBranch;
    case 'human_input': return Users;
    case 'delay': return Clock;
    case 'hybrid': return Zap;
    default: return Settings;
  }
};

const getStatusColor = (status?: NodeStatus) => {
  switch (status) {
    case 'running': return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
    case 'success': return 'border-green-500 bg-green-50 dark:bg-green-950';
    case 'error': return 'border-red-500 bg-red-50 dark:bg-red-950';
    case 'waiting': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
    case 'skipped': return 'border-gray-400 bg-gray-50 dark:bg-gray-950';
    default: return 'border-border bg-background';
  }
};

const getStatusIcon = (status?: NodeStatus) => {
  switch (status) {
    case 'running': return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
    case 'success': return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'error': return <AlertCircle className="h-3 w-3 text-red-500" />;
    case 'waiting': return <Clock className="h-3 w-3 text-yellow-500" />;
    case 'skipped': return <Square className="h-3 w-3 text-gray-400" />;
    default: return null;
  }
};

const BaseNode: React.FC<BaseNodeProps> = ({ data, selected, type }) => {
  const [isMinimized, setIsMinimized] = useState(data.isMinimized || false);
  const [showStream, setShowStream] = useState(false);

  const Icon = getNodeIcon(type || 'default');
  const statusColor = getStatusColor(data.status);
  const statusIcon = getStatusIcon(data.status);

  useEffect(() => {
    if (data.streaming && data.streamContent) {
      setShowStream(true);
    }
  }, [data.streaming, data.streamContent]);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const handleStreamToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStream(!showStream);
  };

  return (
    <Card
      className={cn(
        'workflow-node min-w-[200px] max-w-[300px] transition-all duration-200',
        statusColor,
        selected && 'ring-2 ring-primary ring-offset-2',
        data.status === 'running' && 'animate-pulse-glow'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary border-2 border-background"
      />

      <CardHeader className="pb-2 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">
                {data.label || `${type} Node`}
              </h3>
              <Badge variant="outline" className="text-xs mt-1 capitalize">
                {type}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {statusIcon}
            {data.streaming && data.streamContent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleStreamToggle}
              >
                {showStream ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleMinimize}
            >
              {isMinimized ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="px-3 py-2 pt-0">
          {data.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {data.description}
            </p>
          )}

          {/* Status Information */}
          {data.status && (
            <div className="space-y-2 mb-2">
              {data.status === 'running' && data.progress !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progress</span>
                    <span>{Math.round(data.progress)}%</span>
                  </div>
                  <Progress value={data.progress} className="h-1" />
                </div>
              )}

              {data.executionTime && (
                <div className="text-xs text-muted-foreground">
                  Execution: {data.executionTime}ms
                </div>
              )}

              {data.error && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-2 rounded">
                  {data.error}
                </div>
              )}
            </div>
          )}

          {/* Node-specific content */}
          {renderNodeSpecificContent(type || 'default', data)}

          {/* Streaming content */}
          {showStream && data.streaming && data.streamContent && (
            <div className="mt-2 p-2 bg-muted rounded text-xs max-h-20 overflow-y-auto custom-scrollbar">
              <div className="flex items-center space-x-1 mb-1">
                <MessageSquare className="h-3 w-3" />
                <span className="font-medium">Live Output</span>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
              <div className="whitespace-pre-wrap font-mono">
                {data.streamContent}
              </div>
            </div>
          )}

          {/* Node controls for running nodes */}
          {data.status === 'running' && (
            <div className="flex space-x-1 mt-2">
              <Button variant="outline" size="sm" className="h-6 text-xs">
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-xs">
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            </div>
          )}
        </CardContent>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary border-2 border-background"
      />
    </Card>
  );
};

const renderNodeSpecificContent = (type: string, data: NodeData) => {
  switch (type) {
    case 'agent':
      return (
        <div className="space-y-1">
          {data.config.agentId && (
            <div className="text-xs">
              <span className="text-muted-foreground">Agent:</span> {data.config.agentId}
            </div>
          )}
          {data.config.model && (
            <div className="text-xs">
              <span className="text-muted-foreground">Model:</span> {data.config.model}
            </div>
          )}
          {data.config.temperature !== undefined && (
            <div className="text-xs">
              <span className="text-muted-foreground">Temperature:</span> {data.config.temperature}
            </div>
          )}
        </div>
      );

    case 'tool':
      return (
        <div className="space-y-1">
          {data.config.toolId && (
            <div className="text-xs">
              <span className="text-muted-foreground">Tool:</span> {data.config.toolId}
            </div>
          )}
        </div>
      );

    case 'condition':
      return (
        <div className="space-y-1">
          {data.config.condition && (
            <div className="text-xs font-mono bg-muted p-1 rounded">
              {data.config.condition}
            </div>
          )}
        </div>
      );

    case 'parallel':
      return (
        <div className="space-y-1">
          <div className="text-xs">
            <span className="text-muted-foreground">Branches:</span> {data.config.branches || 2}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Aggregation:</span> {data.config.aggregation || 'all'}
          </div>
        </div>
      );

    case 'human_input':
      return (
        <div className="space-y-1">
          {data.config.inputType && (
            <div className="text-xs">
              <span className="text-muted-foreground">Type:</span> {data.config.inputType}
            </div>
          )}
          {data.config.timeout && (
            <div className="text-xs">
              <span className="text-muted-foreground">Timeout:</span> {data.config.timeout}m
            </div>
          )}
        </div>
      );

    case 'delay':
      return (
        <div className="space-y-1">
          <div className="text-xs">
            <span className="text-muted-foreground">Duration:</span> {data.config.delayTime} {data.config.delayUnit}
          </div>
        </div>
      );

    case 'hybrid':
      return (
        <div className="space-y-1">
          {data.config.agentId && (
            <div className="text-xs">
              <span className="text-muted-foreground">Base Agent:</span> {data.config.agentId}
            </div>
          )}
          {data.config.toolIds && (
            <div className="text-xs">
              <span className="text-muted-foreground">Tools:</span> {data.config.toolIds.length}
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
};

// Specific node components
export const AgentNode = memo((props: NodeProps) => (
  <BaseNode {...props} />
));

export const ToolNode = memo((props: NodeProps) => (
  <BaseNode {...props} />
));

export const ConditionNode = memo((props: NodeProps) => (
  <BaseNode {...props} />
));

export const ParallelNode = memo((props: NodeProps) => (
  <BaseNode {...props} />
));

export const HumanInputNode = memo((props: NodeProps) => (
  <BaseNode {...props} />
));

export const DelayNode = memo((props: NodeProps) => (
  <BaseNode {...props} />
));

export const HybridNode = memo((props: NodeProps) => (
  <BaseNode {...props} />
));

// Start and End nodes
export const StartNode = memo((props: NodeProps) => (
  <Card className="workflow-node w-24 h-24 flex items-center justify-center bg-green-50 dark:bg-green-950 border-green-500">
    <div className="text-center">
      <Play className="h-6 w-6 text-green-600 mx-auto mb-1" />
      <span className="text-xs font-medium">Start</span>
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      className="w-3 h-3 !bg-green-500 border-2 border-background"
    />
  </Card>
));

export const EndNode = memo((props: NodeProps) => (
  <Card className="workflow-node w-24 h-24 flex items-center justify-center bg-red-50 dark:bg-red-950 border-red-500">
    <Handle
      type="target"
      position={Position.Top}
      className="w-3 h-3 !bg-red-500 border-2 border-background"
    />
    <div className="text-center">
      <Square className="h-6 w-6 text-red-600 mx-auto mb-1" />
      <span className="text-xs font-medium">End</span>
    </div>
  </Card>
));

// Custom edge component
export const DefaultEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  style,
  interactionWidth,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerStart={markerStart}
      markerEnd={markerEnd}
      style={style}
      interactionWidth={interactionWidth}
    />
  );
};

// Export node types for ReactFlow
export const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  condition: ConditionNode,
  parallel: ParallelNode,
  human_input: HumanInputNode,
  delay: DelayNode,
  hybrid: HybridNode,
  start: StartNode,
  end: EndNode,
};

AgentNode.displayName = 'AgentNode';
ToolNode.displayName = 'ToolNode';
ConditionNode.displayName = 'ConditionNode';
ParallelNode.displayName = 'ParallelNode';
HumanInputNode.displayName = 'HumanInputNode';
DelayNode.displayName = 'DelayNode';
HybridNode.displayName = 'HybridNode';
StartNode.displayName = 'StartNode';
EndNode.displayName = 'EndNode';