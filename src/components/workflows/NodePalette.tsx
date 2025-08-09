"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Wrench, 
  GitBranch, 
  Users, 
  Clock, 
  Zap,
  Play,
  Square,
  Webhook,
  Globe,
  Database,
  RotateCcw,
  Shuffle,
  Search,
  Sparkles,
  Cpu,
  MessageSquare,
  FileText,
  Mail,
  Calendar,
  Image,
  Code,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'core' | 'ai' | 'logic' | 'io' | 'utility' | 'integration';
  color: string;
  isNew?: boolean;
  isPro?: boolean;
}

const nodeTypes: NodeType[] = [
  // Core nodes
  {
    id: 'start',
    name: 'Start',
    description: 'Entry point for workflow execution',
    icon: Play,
    category: 'core',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  {
    id: 'end',
    name: 'End',
    description: 'Exit point for workflow execution',
    icon: Square,
    category: 'core',
    color: 'bg-red-100 text-red-700 border-red-200',
  },

  // AI nodes
  {
    id: 'agent',
    name: 'AI Agent',
    description: 'Execute AI agent with configurable models and prompts',
    icon: Bot,
    category: 'ai',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    isNew: true,
  },
  {
    id: 'hybrid',
    name: 'Hybrid Agent',
    description: 'AI agent with tool calling capabilities',
    icon: Zap,
    category: 'ai',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    isPro: true,
  },
  {
    id: 'tool',
    name: 'Tool',
    description: 'Execute external tools and APIs',
    icon: Wrench,
    category: 'ai',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },

  // Logic nodes
  {
    id: 'condition',
    name: 'Condition',
    description: 'Branch workflow based on conditions',
    icon: GitBranch,
    category: 'logic',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  {
    id: 'parallel',
    name: 'Parallel',
    description: 'Execute multiple branches simultaneously',
    icon: GitBranch,
    category: 'logic',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  {
    id: 'loop',
    name: 'Loop',
    description: 'Repeat execution based on conditions',
    icon: RotateCcw,
    category: 'logic',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  {
    id: 'switch',
    name: 'Switch',
    description: 'Multi-way branching based on values',
    icon: Shuffle,
    category: 'logic',
    color: 'bg-teal-100 text-teal-700 border-teal-200',
  },

  // I/O nodes
  {
    id: 'human_input',
    name: 'Human Input',
    description: 'Wait for human input or approval',
    icon: Users,
    category: 'io',
    color: 'bg-pink-100 text-pink-700 border-pink-200',
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Receive data from external webhooks',
    icon: Webhook,
    category: 'io',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    id: 'api_call',
    name: 'API Call',
    description: 'Make HTTP requests to external APIs',
    icon: Globe,
    category: 'io',
    color: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  {
    id: 'file_input',
    name: 'File Input',
    description: 'Read and process files',
    icon: FileText,
    category: 'io',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },

  // Utility nodes
  {
    id: 'delay',
    name: 'Delay',
    description: 'Add time delays to workflow execution',
    icon: Clock,
    category: 'utility',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  {
    id: 'data_transform',
    name: 'Transform',
    description: 'Transform and manipulate data',
    icon: Code,
    category: 'utility',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  {
    id: 'filter',
    name: 'Filter',
    description: 'Filter data based on criteria',
    icon: Filter,
    category: 'utility',
    color: 'bg-lime-100 text-lime-700 border-lime-200',
  },

  // Integration nodes
  {
    id: 'database',
    name: 'Database',
    description: 'Query and update databases',
    icon: Database,
    category: 'integration',
    color: 'bg-stone-100 text-stone-700 border-stone-200',
    isPro: true,
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Send and receive emails',
    icon: Mail,
    category: 'integration',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Manage calendar events and scheduling',
    icon: Calendar,
    category: 'integration',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    isPro: true,
  },
  {
    id: 'image_processing',
    name: 'Image Processing',
    description: 'Process and analyze images',
    icon: Image,
    category: 'integration',
    color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    isPro: true,
  },
];

const categories = [
  { id: 'all', name: 'All Nodes', icon: Sparkles },
  { id: 'core', name: 'Core', icon: Cpu },
  { id: 'ai', name: 'AI & Agents', icon: Bot },
  { id: 'logic', name: 'Logic', icon: GitBranch },
  { id: 'io', name: 'Input/Output', icon: MessageSquare },
  { id: 'utility', name: 'Utility', icon: Wrench },
  { id: 'integration', name: 'Integration', icon: Globe },
];

interface NodePaletteProps {
  className?: string;
  onNodeSelect?: (nodeType: string) => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ 
  className,
  onNodeSelect 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const filteredNodes = nodeTypes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedNode(nodeType);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
  };

  const handleNodeClick = (nodeType: string) => {
    if (onNodeSelect) {
      onNodeSelect(nodeType);
    }
  };

  const renderNodeItem = (node: NodeType) => {
    const Icon = node.icon;
    const isDragging = draggedNode === node.id;

    return (
      <div
        key={node.id}
        draggable
        onDragStart={(e) => handleDragStart(e, node.id)}
        onDragEnd={handleDragEnd}
        onClick={() => handleNodeClick(node.id)}
        className={cn(
          'group relative p-3 rounded-lg border-2 border-dashed cursor-move transition-all duration-200',
          'hover:border-solid hover:shadow-md hover:scale-105',
          'active:scale-95',
          node.color,
          isDragging && 'opacity-50 scale-95'
        )}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm truncate">{node.name}</h4>
              {node.isNew && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  New
                </Badge>
              )}
              {node.isPro && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  Pro
                </Badge>
              )}
            </div>
            <p className="text-xs opacity-80 line-clamp-2">
              {node.description}
            </p>
          </div>
        </div>

        {/* Drag indicator */}
        <div className="absolute inset-0 bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      </div>
    );
  };

  return (
    <Card className={cn('h-full flex flex-col bg-background', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Sparkles className="h-5 w-5 mr-2" />
          Node Palette
        </CardTitle>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="h-full flex flex-col">
          <div className="px-4 border-b">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1 h-auto p-1">
              {categories.slice(0, 6).map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="text-xs p-2 flex flex-col items-center space-y-1"
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden lg:inline">{category.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            {categories.map((category) => (
              <TabsContent
                key={category.id}
                value={category.id}
                className="h-full m-0 p-4"
              >
                <ScrollArea className="h-full">
                  <div className="space-y-3">
                    {filteredNodes.length > 0 ? (
                      filteredNodes.map(renderNodeItem)
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No nodes found</p>
                        <p className="text-xs mt-1">Try adjusting your search or category filter</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </CardContent>

      {/* Usage hint */}
      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Drag nodes to the canvas or click to add at center
        </p>
      </div>
    </Card>
  );
};

export default NodePalette;