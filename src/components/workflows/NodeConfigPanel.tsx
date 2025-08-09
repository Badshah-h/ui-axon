"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Info, Settings, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NodeConfigPanelProps {
  node?: any;
  selectedNode?: any;
  onUpdate?: (config: any) => void;
  onUpdateNodeConfig?: (nodeId: string, config: any) => void;
  onClose?: () => void;
  availableAgents?: any[];
  availableTools?: any[];
}

const NodeConfigPanel = ({
  node,
  selectedNode,
  onUpdate,
  onUpdateNodeConfig,
  onClose,
  availableAgents = [],
  availableTools = [],
}: NodeConfigPanelProps) => {
  const currentNode = node || selectedNode;
  const [config, setConfig] = useState<any>({});
  const [activeTab, setActiveTab] = useState("general");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (currentNode) {
      setConfig(currentNode.data?.config || {});
      validateConfig(currentNode.data?.config || {});
    }
  }, [currentNode]);

  const validateConfig = (configData: any) => {
    const errors: string[] = [];

    // Basic validation based on node type
    if (currentNode) {
      const nodeType = currentNode.type;

      if (nodeType === "agent" && !configData.agentId) {
        errors.push("Agent must be selected");
      }

      if (nodeType === "tool" && !configData.toolId) {
        errors.push("Tool must be selected");
      }

      if (nodeType === "condition" && !configData.condition) {
        errors.push("Condition expression is required");
      }

      if (!configData.label || configData.label.trim() === "") {
        errors.push("Label is required");
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleChange = (field: string, value: any) => {
    const updatedConfig = { ...config, [field]: value };
    setConfig(updatedConfig);
    validateConfig(updatedConfig);

    // Debounce update to parent
    const timeoutId = setTimeout(() => {
      if (currentNode) {
        if (onUpdateNodeConfig) {
          onUpdateNodeConfig(currentNode.id, updatedConfig);
        }
        if (onUpdate) {
          onUpdate(updatedConfig);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSave = () => {
    if (validateConfig(config) && currentNode) {
      if (onUpdateNodeConfig) {
        onUpdateNodeConfig(currentNode.id, config);
      }
      if (onUpdate) {
        onUpdate(config);
      }
      if (onClose) onClose();
    }
  };

  if (!currentNode) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background p-6 rounded-lg border">
        <div className="text-center text-muted-foreground">
          <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No Node Selected</h3>
          <p className="mt-2">Select a node on the canvas to configure it</p>
        </div>
      </div>
    );
  }

  const renderNodeTypeSpecificConfig = () => {
    const nodeType = currentNode.type;

    switch (nodeType) {
      case "agent":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agentId">Select Agent</Label>
              <Select
                value={config.agentId || ""}
                onValueChange={(value) => handleChange("agentId", value)}
              >
                <SelectTrigger id="agentId">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config.agentId && (
              <div className="space-y-2">
                <Label htmlFor="agentConfig">Agent Configuration</Label>
                <Textarea
                  id="agentConfig"
                  placeholder='{"temperature": 0.7, "max_tokens": 500}'
                  value={config.agentConfig || ""}
                  onChange={(e) => handleChange("agentConfig", e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Enter JSON configuration for the agent
                </p>
              </div>
            )}
          </div>
        );

      case "tool":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="toolId">Select Tool</Label>
              <Select
                value={config.toolId || ""}
                onValueChange={(value) => handleChange("toolId", value)}
              >
                <SelectTrigger id="toolId">
                  <SelectValue placeholder="Select a tool" />
                </SelectTrigger>
                <SelectContent>
                  {availableTools.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>
                      {tool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config.toolId && (
              <div className="space-y-2">
                <Label htmlFor="toolParams">Tool Parameters</Label>
                <Textarea
                  id="toolParams"
                  placeholder='{"param1": "value1", "param2": "value2"}'
                  value={config.toolParams || ""}
                  onChange={(e) => handleChange("toolParams", e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Enter JSON parameters for the tool
                </p>
              </div>
            )}
          </div>
        );

      case "condition":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition Expression</Label>
              <Textarea
                id="condition"
                placeholder="result.success === true"
                value={config.condition || ""}
                onChange={(e) => handleChange("condition", e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Enter a JavaScript expression that evaluates to true or false
              </p>
            </div>

            <div className="pt-2">
              <Label className="mb-2 block">Condition Paths</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-md bg-muted/20">
                  <Badge variant="outline" className="mb-2">
                    True
                  </Badge>
                  <p className="text-xs">When condition evaluates to true</p>
                </div>
                <div className="p-3 border rounded-md bg-muted/20">
                  <Badge variant="outline" className="mb-2">
                    False
                  </Badge>
                  <p className="text-xs">When condition evaluates to false</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "parallel":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branches">Number of Parallel Branches</Label>
              <Input
                id="branches"
                type="number"
                min="2"
                max="10"
                value={config.branches || 2}
                onChange={(e) =>
                  handleChange("branches", parseInt(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aggregation">Result Aggregation</Label>
              <Select
                value={config.aggregation || "all"}
                onValueChange={(value) => handleChange("aggregation", value)}
              >
                <SelectTrigger id="aggregation">
                  <SelectValue placeholder="Select aggregation method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wait for all branches</SelectItem>
                  <SelectItem value="any">
                    Continue on first completion
                  </SelectItem>
                  <SelectItem value="majority">
                    Continue on majority completion
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "human_input":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">User Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Please provide additional information..."
                value={config.prompt || ""}
                onChange={(e) => handleChange("prompt", e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inputType">Input Type</Label>
              <Select
                value={config.inputType || "text"}
                onValueChange={(value) => handleChange("inputType", value)}
              >
                <SelectTrigger id="inputType">
                  <SelectValue placeholder="Select input type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="choice">Multiple Choice</SelectItem>
                  <SelectItem value="file">File Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.inputType === "choice" && (
              <div className="space-y-2">
                <Label htmlFor="choices">Choices (one per line)</Label>
                <Textarea
                  id="choices"
                  placeholder="Option 1
Option 2
Option 3"
                  value={config.choices || ""}
                  onChange={(e) => handleChange("choices", e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="required"
                checked={config.required !== false}
                onCheckedChange={(checked) => handleChange("required", checked)}
              />
              <Label htmlFor="required">Input is required</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (minutes)</Label>
              <Input
                id="timeout"
                type="number"
                min="1"
                max="1440"
                value={config.timeout || 60}
                onChange={(e) =>
                  handleChange("timeout", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                Workflow will timeout after this period if no input is received
              </p>
            </div>
          </div>
        );

      case "delay":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delayTime">Delay Duration</Label>
              <div className="flex space-x-2">
                <Input
                  id="delayTime"
                  type="number"
                  min="1"
                  value={config.delayTime || 5}
                  onChange={(e) =>
                    handleChange("delayTime", parseInt(e.target.value))
                  }
                  className="flex-1"
                />
                <Select
                  value={config.delayUnit || "seconds"}
                  onValueChange={(value) => handleChange("delayUnit", value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "hybrid":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agentId">Base Agent</Label>
              <Select
                value={config.agentId || ""}
                onValueChange={(value) => handleChange("agentId", value)}
              >
                <SelectTrigger id="agentId">
                  <SelectValue placeholder="Select base agent" />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toolIds">Available Tools</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {availableTools.map((tool) => (
                  <div key={tool.id} className="flex items-center space-x-2">
                    <Switch
                      id={`tool-${tool.id}`}
                      checked={(config.toolIds || []).includes(tool.id)}
                      onCheckedChange={(checked) => {
                        const currentTools = config.toolIds || [];
                        const updatedTools = checked
                          ? [...currentTools, tool.id]
                          : currentTools.filter((id: string) => id !== tool.id);
                        handleChange("toolIds", updatedTools);
                      }}
                    />
                    <Label htmlFor={`tool-${tool.id}`}>{tool.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hybridConfig">Hybrid Configuration</Label>
              <Textarea
                id="hybridConfig"
                placeholder='{"max_tool_calls": 3, "auto_fallback": true}'
                value={config.hybridConfig || ""}
                onChange={(e) => handleChange("hybridConfig", e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Enter JSON configuration for the hybrid node
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-8 text-center">
            <Info className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p>Configuration not available for this node type</p>
          </div>
        );
    }
  };

  return (
    <Card className="w-full h-full bg-background border overflow-hidden flex flex-col">
      <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center">
            <Badge variant="outline" className="mr-2 capitalize">
              {currentNode.type}
            </Badge>
            {config.label || "Untitled Node"}
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Configure node settings and parameters
          </CardDescription>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <div className="px-4 border-b">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="specific">Configuration</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="general" className="p-4 space-y-4 m-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Node Label</Label>
                <Input
                  id="label"
                  placeholder="Enter node label"
                  value={config.label || ""}
                  onChange={(e) => handleChange("label", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter node description"
                  value={config.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="specific" className="p-4 space-y-4 m-0">
            {renderNodeTypeSpecificConfig()}
          </TabsContent>

          <TabsContent value="advanced" className="p-4 space-y-4 m-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retries">Max Retries</Label>
                <Input
                  id="retries"
                  type="number"
                  min="0"
                  max="10"
                  value={config.retries || 0}
                  onChange={(e) =>
                    handleChange("retries", parseInt(e.target.value))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min="1"
                  max="300"
                  value={config.timeout || 30}
                  onChange={(e) =>
                    handleChange("timeout", parseInt(e.target.value))
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="continueOnError"
                  checked={config.continueOnError || false}
                  onCheckedChange={(checked) =>
                    handleChange("continueOnError", checked)
                  }
                />
                <Label htmlFor="continueOnError">
                  Continue workflow on error
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customId">Custom Node ID</Label>
                <Input
                  id="customId"
                  placeholder="Enter custom ID (optional)"
                  value={config.customId || ""}
                  onChange={(e) => handleChange("customId", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used for referencing this node in expressions
                </p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {validationErrors.length > 0 && (
        <div className="px-4 py-3 border-t">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-5 text-sm">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <CardFooter className="px-4 py-3 border-t flex justify-between">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={validationErrors.length > 0}
          className="ml-auto"
        >
          <Check className="mr-2 h-4 w-4" />
          Apply Changes
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NodeConfigPanel;
