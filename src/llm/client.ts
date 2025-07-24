import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { 
  LLMProvider, 
  LLMMessage, 
  LLMTool, 
  LLMResponse, 
  LLMConfig,
  LLMToolCall 
} from './types';

export interface SearchOptions {
  search_parameters?: {
    mode: string;
  };
}

export class LLMClient {
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;
  private grokClient?: OpenAI;
  private localClient?: OpenAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.initializeClient();
  }

  private initializeClient() {
    switch (this.config.provider) {
      case 'anthropic':
        this.anthropicClient = new Anthropic({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseURL,
        });
        break;
      case 'openai':
        this.openaiClient = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseURL || 'https://api.openai.com/v1',
        });
        break;
      case 'grok':
        this.grokClient = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseURL || 'https://api.x.ai/v1',
        });
        break;
      case 'local':
        this.localClient = new OpenAI({
          apiKey: this.config.apiKey || 'local-key',
          baseURL: this.config.baseURL || 'http://localhost:1234/v1',
        });
        break;
    }
  }

  getCurrentModel(): string {
    return this.config.model;
  }

  setModel(model: string): void {
    this.config.model = model;
  }

  setProvider(provider: LLMProvider, apiKey: string, baseURL?: string): void {
    this.config = {
      provider,
      model: this.config.model,
      apiKey,
      baseURL,
    };
    this.initializeClient();
  }

  private convertMessagesToAnthropic(messages: LLMMessage[]): any[] {
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    return conversationMessages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.tool_call_id,
              content: msg.content,
            }
          ]
        };
      }

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        return {
          role: 'assistant',
          content: [
            ...(msg.content ? [{ type: 'text', text: msg.content }] : []),
            ...msg.tool_calls.map(tc => ({
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments),
            }))
          ]
        };
      }

      return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      };
    });
  }

  private convertToolsToAnthropic(tools: LLMTool[]): any[] {
    return tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));
  }

  private convertAnthropicResponse(response: any): LLMResponse {
    const content = response.content;
    let messageContent = '';
    let toolCalls: LLMToolCall[] = [];

    for (const item of content) {
      if (item.type === 'text') {
        messageContent += item.text;
      } else if (item.type === 'tool_use') {
        toolCalls.push({
          id: item.id,
          type: 'function',
          function: {
            name: item.name,
            arguments: JSON.stringify(item.input),
          },
        });
      }
    }

    return {
      choices: [{
        message: {
          role: 'assistant',
          content: messageContent || null,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        }
      }]
    };
  }

  async chat(
    messages: LLMMessage[],
    tools?: LLMTool[],
    model?: string,
    searchOptions?: SearchOptions
  ): Promise<LLMResponse> {
    const modelToUse = model || this.config.model;

    try {
      switch (this.config.provider) {
        case 'anthropic':
          if (!this.anthropicClient) throw new Error('Anthropic client not initialized');
          
          const systemMessage = messages.find(m => m.role === 'system');
          const anthropicMessages = this.convertMessagesToAnthropic(messages);
          const anthropicTools = tools ? this.convertToolsToAnthropic(tools) : undefined;

          const anthropicResponse = await this.anthropicClient.messages.create({
            model: modelToUse,
            max_tokens: 4096,
            system: systemMessage?.content,
            messages: anthropicMessages,
            tools: anthropicTools,
          });

          return this.convertAnthropicResponse(anthropicResponse);

        case 'openai':
          if (!this.openaiClient) throw new Error('OpenAI client not initialized');
          
          const openaiResponse = await this.openaiClient.chat.completions.create({
            model: modelToUse,
            messages: messages as any,
            tools: tools as any,
            tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
          });

          return openaiResponse as LLMResponse;

        case 'grok':
          if (!this.grokClient) throw new Error('Grok client not initialized');
          
          const grokResponse = await this.grokClient.chat.completions.create({
            model: modelToUse,
            messages: messages as any,
            tools: tools as any,
            tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
            ...searchOptions,
          });

          return grokResponse as LLMResponse;

        case 'local':
          if (!this.localClient) throw new Error('Local LLM client not initialized');
          
          const localResponse = await this.localClient.chat.completions.create({
            model: modelToUse,
            messages: messages as any,
            tools: tools as any,
            tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
          });

          return localResponse as LLMResponse;

        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error: any) {
      throw new Error(`${this.config.provider.toUpperCase()} API error: ${error.message}`);
    }
  }

  async *chatStream(
    messages: LLMMessage[],
    tools?: LLMTool[],
    model?: string,
    searchOptions?: SearchOptions
  ): AsyncGenerator<any, void, unknown> {
    const modelToUse = model || this.config.model;

    try {
      switch (this.config.provider) {
        case 'anthropic':
          if (!this.anthropicClient) throw new Error('Anthropic client not initialized');
          
          const systemMessage = messages.find(m => m.role === 'system');
          const anthropicMessages = this.convertMessagesToAnthropic(messages);
          const anthropicTools = tools ? this.convertToolsToAnthropic(tools) : undefined;

          const anthropicStream = await this.anthropicClient.messages.create({
            model: modelToUse,
            max_tokens: 4096,
            system: systemMessage?.content,
            messages: anthropicMessages,
            tools: anthropicTools,
            stream: true,
          });

          for await (const chunk of anthropicStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              yield {
                choices: [{
                  delta: {
                    content: chunk.delta.text,
                  }
                }]
              };
            } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
              yield {
                choices: [{
                  delta: {
                    tool_calls: [{
                      id: chunk.content_block.id,
                      type: 'function',
                      function: {
                        name: chunk.content_block.name,
                        arguments: "", // Start with empty string, will be filled by input_json_delta
                      },
                    }]
                  }
                }]
              };
            } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'input_json_delta') {
              // Handle streaming tool arguments for Anthropic
              // Note: Anthropic uses content block index, but we need to map to tool_calls array index
              // Content block 0 is text, content block 1+ are tool calls, so subtract 1
              const toolCallIndex = Math.max(0, (chunk.index || 1) - 1);
              yield {
                choices: [{
                  delta: {
                    tool_calls: [{
                      index: toolCallIndex,
                      function: {
                        arguments: chunk.delta.partial_json,
                      },
                    }]
                  }
                }]
              };
            }
          }
          break;

        case 'openai':
          if (!this.openaiClient) throw new Error('OpenAI client not initialized');
          
          const openaiStream = await this.openaiClient.chat.completions.create({
            model: modelToUse,
            messages: messages as any,
            tools: tools as any,
            tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
            stream: true,
          });

          for await (const chunk of openaiStream) {
            yield chunk;
          }
          break;

        case 'grok':
          if (!this.grokClient) throw new Error('Grok client not initialized');
          
          const grokStream = await this.grokClient.chat.completions.create({
            model: modelToUse,
            messages: messages as any,
            tools: tools as any,
            tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
            stream: true,
            ...searchOptions,
          });

          for await (const chunk of grokStream) {
            yield chunk;
          }
          break;

        case 'local':
          if (!this.localClient) throw new Error('Local LLM client not initialized');
          
          const localStream = await this.localClient.chat.completions.create({
            model: modelToUse,
            messages: messages as any,
            tools: tools as any,
            tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
            stream: true,
          });

          for await (const chunk of localStream) {
            yield chunk;
          }
          break;

        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error: any) {
      throw new Error(`${this.config.provider.toUpperCase()} API error: ${error.message}`);
    }
  }
}