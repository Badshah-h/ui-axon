import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MistralAI } from '@mistralai/mistralai';
import { Agent, AIProvider, StreamingResponse } from '@/types/workflow';

export interface AIProviderConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  project?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: any;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  functions?: any[];
  functionCall?: any;
  responseFormat?: { type: 'text' | 'json_object' };
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finishReason: string;
  }[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export abstract class BaseAIProvider {
  protected config: AIProviderConfig;
  
  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract getProvider(): AIProvider;
  abstract chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;
  abstract streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void>;
  abstract getAvailableModels(): Promise<string[]>;
  abstract validateConfig(): Promise<boolean>;
}

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
      project: config.project,
    });
  }

  getProvider(): AIProvider {
    return 'openai';
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages as any,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stop,
        functions: options.functions,
        function_call: options.functionCall,
        response_format: options.responseFormat,
      });

      return response as ChatCompletionResponse;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        ...options,
        stream: true,
      } as any);

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          onChunk({
            id: chunk.id,
            type: 'text',
            content: delta.content,
            delta: delta.content,
          });
        }

        if (chunk.choices[0]?.finish_reason) {
          onChunk({
            id: chunk.id,
            type: 'complete',
            content: '',
            metadata: {
              finishReason: chunk.choices[0].finish_reason,
              usage: chunk.usage,
            },
          });
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      onChunk({
        id: 'error',
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      return models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export class AnthropicProvider extends BaseAIProvider {
  private client: Anthropic;

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  getProvider(): AIProvider {
    return 'anthropic';
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      // Convert messages format for Anthropic
      const systemMessage = options.messages.find(m => m.role === 'system');
      const messages = options.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

      const response = await this.client.messages.create({
        model: options.model,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature,
        system: systemMessage?.content,
        messages: messages as any,
      });

      // Convert response to OpenAI format
      return {
        id: response.id,
        object: 'chat.completion',
        created: Date.now(),
        model: options.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.content[0].type === 'text' ? response.content[0].text : '',
          },
          finishReason: response.stop_reason || 'stop',
        }],
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  async streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    try {
      const systemMessage = options.messages.find(m => m.role === 'system');
      const messages = options.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

      const stream = await this.client.messages.create({
        model: options.model,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature,
        system: systemMessage?.content,
        messages: messages as any,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          onChunk({
            id: 'anthropic-stream',
            type: 'text',
            content: chunk.delta.text,
            delta: chunk.delta.text,
          });
        }

        if (chunk.type === 'message_stop') {
          onChunk({
            id: 'anthropic-stream',
            type: 'complete',
            content: '',
            metadata: {
              finishReason: 'stop',
            },
          });
        }
      }
    } catch (error) {
      console.error('Anthropic streaming error:', error);
      onChunk({
        id: 'error',
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export class GoogleProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI;

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  getProvider(): AIProvider {
    return 'google';
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      const model = this.client.getGenerativeModel({ model: options.model });
      
      // Convert messages to Google format
      const history = options.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const systemMessage = options.messages.find(m => m.role === 'system');
      const lastMessage = options.messages[options.messages.length - 1];

      const chat = model.startChat({
        history: history.slice(0, -1),
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          topP: options.topP,
          stopSequences: options.stop,
        },
        systemInstruction: systemMessage?.content,
      });

      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;

      return {
        id: `google-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: options.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.text(),
          },
          finishReason: 'stop',
        }],
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      console.error('Google AI API error:', error);
      throw error;
    }
  }

  async streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    try {
      const model = this.client.getGenerativeModel({ model: options.model });
      
      const history = options.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const systemMessage = options.messages.find(m => m.role === 'system');
      const lastMessage = options.messages[options.messages.length - 1];

      const chat = model.startChat({
        history: history.slice(0, -1),
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          topP: options.topP,
          stopSequences: options.stop,
        },
        systemInstruction: systemMessage?.content,
      });

      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          onChunk({
            id: `google-${Date.now()}`,
            type: 'text',
            content: chunkText,
            delta: chunkText,
          });
        }
      }

      onChunk({
        id: `google-${Date.now()}`,
        type: 'complete',
        content: '',
        metadata: {
          finishReason: 'stop',
        },
      });
    } catch (error) {
      console.error('Google AI streaming error:', error);
      onChunk({
        id: 'error',
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-pro-vision',
    ];
  }

  async validateConfig(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('test');
      return true;
    } catch (error) {
      return false;
    }
  }
}

export class MistralProvider extends BaseAIProvider {
  private client: MistralAI;

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new MistralAI(config.apiKey);
  }

  getProvider(): AIProvider {
    return 'mistral';
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.chat({
        model: options.model,
        messages: options.messages as any,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        stop: options.stop,
      });

      return {
        id: response.id || `mistral-${Date.now()}`,
        object: 'chat.completion',
        created: response.created || Date.now(),
        model: response.model || options.model,
        choices: response.choices.map(choice => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content,
          },
          finishReason: choice.finishReason,
        })),
        usage: {
          promptTokens: response.usage?.promptTokens || 0,
          completionTokens: response.usage?.completionTokens || 0,
          totalTokens: response.usage?.totalTokens || 0,
        },
      };
    } catch (error) {
      console.error('Mistral API error:', error);
      throw error;
    }
  }

  async streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    try {
      const stream = await this.client.chatStream({
        model: options.model,
        messages: options.messages as any,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        stop: options.stop,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          onChunk({
            id: chunk.id || `mistral-${Date.now()}`,
            type: 'text',
            content: delta.content,
            delta: delta.content,
          });
        }

        if (chunk.choices[0]?.finishReason) {
          onChunk({
            id: chunk.id || `mistral-${Date.now()}`,
            type: 'complete',
            content: '',
            metadata: {
              finishReason: chunk.choices[0].finishReason,
              usage: chunk.usage,
            },
          });
        }
      }
    } catch (error) {
      console.error('Mistral streaming error:', error);
      onChunk({
        id: 'error',
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.client.listModels();
      return models.data.map(model => model.id).sort();
    } catch (error) {
      console.error('Error fetching Mistral models:', error);
      return [
        'mistral-large-latest',
        'mistral-medium-latest',
        'mistral-small-latest',
        'open-mistral-7b',
        'open-mixtral-8x7b',
        'open-mixtral-8x22b',
      ];
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.client.listModels();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// AI Provider Factory
export class AIProviderFactory {
  private static providers: Map<string, BaseAIProvider> = new Map();

  static createProvider(provider: AIProvider, config: AIProviderConfig): BaseAIProvider {
    const key = `${provider}-${config.apiKey.slice(-8)}`;
    
    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    let providerInstance: BaseAIProvider;

    switch (provider) {
      case 'openai':
        providerInstance = new OpenAIProvider(config);
        break;
      case 'anthropic':
        providerInstance = new AnthropicProvider(config);
        break;
      case 'google':
        providerInstance = new GoogleProvider(config);
        break;
      case 'mistral':
        providerInstance = new MistralProvider(config);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    this.providers.set(key, providerInstance);
    return providerInstance;
  }

  static async validateProvider(provider: AIProvider, config: AIProviderConfig): Promise<boolean> {
    try {
      const providerInstance = this.createProvider(provider, config);
      return await providerInstance.validateConfig();
    } catch (error) {
      console.error(`Error validating ${provider} provider:`, error);
      return false;
    }
  }

  static async getAvailableModels(provider: AIProvider, config: AIProviderConfig): Promise<string[]> {
    try {
      const providerInstance = this.createProvider(provider, config);
      return await providerInstance.getAvailableModels();
    } catch (error) {
      console.error(`Error fetching models for ${provider}:`, error);
      return [];
    }
  }

  static clearCache(): void {
    this.providers.clear();
  }
}

// Smart routing system for multi-provider support
export class AIRouter {
  private providers: Map<AIProvider, BaseAIProvider> = new Map();
  private fallbackOrder: AIProvider[] = [];
  private costOptimization = true;
  private performanceTracking = true;

  constructor(
    providerConfigs: Record<AIProvider, AIProviderConfig>,
    fallbackOrder: AIProvider[] = ['openai', 'anthropic', 'google', 'mistral']
  ) {
    // Initialize providers
    Object.entries(providerConfigs).forEach(([provider, config]) => {
      try {
        const providerInstance = AIProviderFactory.createProvider(provider as AIProvider, config);
        this.providers.set(provider as AIProvider, providerInstance);
      } catch (error) {
        console.error(`Failed to initialize ${provider} provider:`, error);
      }
    });

    this.fallbackOrder = fallbackOrder.filter(provider => this.providers.has(provider));
  }

  async chatCompletion(
    options: ChatCompletionOptions,
    preferredProvider?: AIProvider
  ): Promise<ChatCompletionResponse> {
    const providers = preferredProvider 
      ? [preferredProvider, ...this.fallbackOrder.filter(p => p !== preferredProvider)]
      : this.fallbackOrder;

    let lastError: Error | null = null;

    for (const provider of providers) {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) continue;

      try {
        const startTime = Date.now();
        const response = await providerInstance.chatCompletion(options);
        const duration = Date.now() - startTime;

        if (this.performanceTracking) {
          console.log(`${provider} completion took ${duration}ms`);
        }

        return response;
      } catch (error) {
        console.error(`${provider} provider failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  async streamChatCompletion(
    options: ChatCompletionOptions,
    onChunk: (chunk: StreamingResponse) => void,
    preferredProvider?: AIProvider
  ): Promise<void> {
    const providers = preferredProvider 
      ? [preferredProvider, ...this.fallbackOrder.filter(p => p !== preferredProvider)]
      : this.fallbackOrder;

    let lastError: Error | null = null;

    for (const provider of providers) {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) continue;

      try {
        await providerInstance.streamChatCompletion(options, onChunk);
        return;
      } catch (error) {
        console.error(`${provider} streaming failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw lastError || new Error('All AI providers failed for streaming');
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  async validateAllProviders(): Promise<Record<AIProvider, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [provider, instance] of this.providers) {
      try {
        results[provider] = await instance.validateConfig();
      } catch (error) {
        results[provider] = false;
      }
    }

    return results as Record<AIProvider, boolean>;
  }
}