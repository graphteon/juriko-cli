import { LLMClient } from "../llm/client";
import { LLMMessage, LLMToolCall, LLMConfig, LLMProvider } from "../llm/types";
import { TextEditorTool, BashTool, TodoTool, ConfirmationTool, CondenseTool } from "../tools";
import { ToolResult } from "../types";
import { EventEmitter } from "events";
import { createTokenCounter, TokenCounter } from "../utils/token-counter";
import { loadCustomInstructions } from "../utils/custom-instructions";
import { mcpManager, mcpToolsIntegration } from "../mcp";
import {
  condenseConversation,
  shouldCondenseConversation,
  getModelTokenLimit,
  CondenseResponse
} from "../utils/condense";
import { parseToolCallArguments, validateArgumentTypes } from "../utils/argument-parser";
import { SystemPromptBuilder, PromptOptions } from "./prompts/system-prompt-builder";
import { ResponseFormatter, ResponseStyle } from "../utils/response-formatter";
import { BatchToolExecutor, BatchResult } from "../tools/batch-executor";
import { getEffectiveSettings } from "../utils/user-settings";

export interface ChatEntry {
  type: "user" | "assistant" | "tool_result" | "tool_call";
  content: string;
  timestamp: Date;
  toolCalls?: LLMToolCall[];
  toolCall?: LLMToolCall;
  toolResult?: { success: boolean; output?: string; error?: string };
  isStreaming?: boolean;
}

export interface StreamingChunk {
  type: "content" | "tool_calls" | "tool_result" | "done" | "token_count";
  content?: string;
  toolCalls?: LLMToolCall[];
  toolCall?: LLMToolCall;
  toolResult?: ToolResult;
  tokenCount?: number;
}

const MULTI_LLM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "view_file",
      description: "View the contents of a file or list directory contents",
      parameters: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "The path to the file or directory to view"
          },
          start_line: {
            type: "number",
            description: "Optional: Start line number for partial file viewing"
          },
          end_line: {
            type: "number",
            description: "Optional: End line number for partial file viewing"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "create_file",
      description: "Create a new file with the given content. Only use this for files that don't exist yet.",
      parameters: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "The path where the file should be created"
          },
          content: {
            type: "string",
            description: "The content to write to the file"
          }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "str_replace_editor",
      description: "Replace text in an existing file. Always use this to edit or update existing files.",
      parameters: {
        type: "object" as const,
        properties: {
          path: {
            type: "string",
            description: "The path to the file to edit"
          },
          old_str: {
            type: "string",
            description: "The exact text to replace"
          },
          new_str: {
            type: "string",
            description: "The new text to replace with"
          }
        },
        required: ["path", "old_str", "new_str"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "bash",
      description: "Execute a bash command",
      parameters: {
        type: "object" as const,
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute"
          }
        },
        required: ["command"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "create_todo_list",
      description: "Create a visual todo list for planning and tracking tasks",
      parameters: {
        type: "object" as const,
        properties: {
          todos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                status: { type: "string", enum: ["pending", "in_progress", "completed"] }
              },
              required: ["task", "priority", "status"]
            }
          }
        },
        required: ["todos"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "update_todo_list",
      description: "Update existing todos in your todo list",
      parameters: {
        type: "object" as const,
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "number" },
                status: { type: "string", enum: ["pending", "in_progress", "completed"] },
                task: { type: "string" }
              },
              required: ["index"]
            }
          }
        },
        required: ["updates"]
      }
    }
  },
];

export class MultiLLMAgent extends EventEmitter {
  private llmClient: LLMClient;
  private textEditor: TextEditorTool;
  private bash: BashTool;
  private todoTool: TodoTool;
  private confirmationTool: ConfirmationTool;
  private condenseTool: CondenseTool;
  private chatHistory: ChatEntry[] = [];
  private messages: LLMMessage[] = [];
  private tokenCounter: TokenCounter;
  private abortController: AbortController | null = null;
  private llmConfig: LLMConfig;
  private responseStyle: ResponseStyle;
  private batchExecutor: BatchToolExecutor;
  private enableBatching: boolean;

  constructor(llmClient: LLMClient, llmConfig?: LLMConfig) {
    super();
    this.llmClient = llmClient;
    this.textEditor = new TextEditorTool();
    this.bash = new BashTool();
    this.todoTool = new TodoTool();
    this.confirmationTool = new ConfirmationTool();
    this.condenseTool = new CondenseTool();
    
    // Initialize LLM config for condensing - use provided config or derive from current client
    this.llmConfig = llmConfig || this.deriveLLMConfigFromClient();
    
    // Initialize token counter with the current model for accurate counting
    this.tokenCounter = createTokenCounter(this.llmClient.getCurrentModel());

    // Initialize batch executor
    this.batchExecutor = new BatchToolExecutor();

    // Initialize MCP system (async, but don't block constructor)
    this.initializeMCP().catch(error => {
      console.warn('Failed to initialize MCP system:', error.message);
    });

    // Initialize settings and build system prompt (async)
    this.initializeSettings();
  }

  private async initializeSettings(): Promise<void> {
    try {
      // Get effective settings (user config + env overrides)
      const settings = await getEffectiveSettings();
      
      // Initialize response style
      this.responseStyle = this.createResponseStyleFromSettings(settings.responseStyle);
      
      // Initialize batching
      this.enableBatching = settings.enableBatching;

      // Build system prompt using settings
      const customInstructions = loadCustomInstructions();
      const promptOptions: PromptOptions = {
        concise: this.responseStyle.concise,
        securityLevel: settings.securityLevel,
        customInstructions,
        workingDirectory: process.cwd(),
        enableCodeReferences: settings.enableCodeReferences,
        enableBatching: settings.enableBatching
      };

      const systemPrompt = SystemPromptBuilder.buildPrompt(promptOptions);

      // Initialize with system message
      this.messages.push({
        role: "system",
        content: systemPrompt,
      });
    } catch (error) {
      console.warn('Failed to load user settings, using defaults:', error);
      
      // Fallback to environment variables and defaults
      this.responseStyle = this.getResponseStyleFromEnv();
      this.enableBatching = this.getBatchingEnabledFromEnv();

      const customInstructions = loadCustomInstructions();
      const promptOptions: PromptOptions = {
        concise: this.responseStyle.concise,
        securityLevel: this.getSecurityLevelFromEnv(),
        customInstructions,
        workingDirectory: process.cwd(),
        enableCodeReferences: this.getCodeReferencesEnabledFromEnv(),
        enableBatching: this.enableBatching
      };

      const systemPrompt = SystemPromptBuilder.buildPrompt(promptOptions);

      this.messages.push({
        role: "system",
        content: systemPrompt,
      });
    }
  }

  private createResponseStyleFromSettings(style: 'concise' | 'verbose' | 'balanced'): ResponseStyle {
    switch (style) {
      case 'concise':
        return ResponseFormatter.createConciseStyle();
      case 'verbose':
        return ResponseFormatter.createVerboseStyle();
      default:
        return ResponseFormatter.createBalancedStyle();
    }
  }

  private getResponseStyleFromEnv(): ResponseStyle {
    const styleEnv = process.env.JURIKO_RESPONSE_STYLE;
    
    switch (styleEnv) {
      case 'concise':
        return ResponseFormatter.createConciseStyle();
      case 'verbose':
        return ResponseFormatter.createVerboseStyle();
      default:
        return ResponseFormatter.createBalancedStyle();
    }
  }

  private getSecurityLevelFromEnv(): 'low' | 'medium' | 'high' {
    const level = process.env.JURIKO_SECURITY_LEVEL;
    if (level === 'low' || level === 'medium' || level === 'high') {
      return level;
    }
    return 'medium'; // Default
  }

  private getBatchingEnabledFromEnv(): boolean {
    const enabled = process.env.JURIKO_ENABLE_BATCHING?.toLowerCase();
    return enabled === 'true' || enabled === '1';
  }

  private getCodeReferencesEnabledFromEnv(): boolean {
    const enabled = process.env.JURIKO_ENABLE_CODE_REFERENCES?.toLowerCase();
    return enabled !== 'false' && enabled !== '0'; // Default to true unless explicitly disabled
  }

  setResponseStyle(style: ResponseStyle): void {
    this.responseStyle = style;
    // Rebuild system prompt with new style
    this.rebuildSystemPrompt().catch(error => {
      console.warn('Failed to rebuild system prompt:', error);
    });
  }

  getResponseStyle(): ResponseStyle {
    return { ...this.responseStyle };
  }

  private async rebuildSystemPrompt(): Promise<void> {
    try {
      // Get current effective settings
      const settings = await getEffectiveSettings();
      
      // Update response style
      this.responseStyle = this.createResponseStyleFromSettings(settings.responseStyle);
      
      // Update batching
      this.enableBatching = settings.enableBatching;

      const customInstructions = loadCustomInstructions();
      const promptOptions: PromptOptions = {
        concise: this.responseStyle.concise,
        securityLevel: settings.securityLevel,
        customInstructions,
        workingDirectory: process.cwd(),
        enableCodeReferences: settings.enableCodeReferences,
        enableBatching: settings.enableBatching
      };

      const systemPrompt = SystemPromptBuilder.buildPrompt(promptOptions);

      // Update the system message
      const systemMessageIndex = this.messages.findIndex(m => m.role === 'system');
      if (systemMessageIndex !== -1) {
        this.messages[systemMessageIndex] = {
          role: "system",
          content: systemPrompt,
        };
      }
    } catch (error) {
      console.warn('Failed to rebuild system prompt with user settings:', error);
      // Fallback to environment-based rebuild
      this.rebuildSystemPromptFromEnv();
    }
  }

  private rebuildSystemPromptFromEnv(): void {
    const customInstructions = loadCustomInstructions();
    const promptOptions: PromptOptions = {
      concise: this.responseStyle.concise,
      securityLevel: this.getSecurityLevelFromEnv(),
      customInstructions,
      workingDirectory: process.cwd(),
      enableCodeReferences: this.getCodeReferencesEnabledFromEnv(),
      enableBatching: this.enableBatching
    };

    const systemPrompt = SystemPromptBuilder.buildPrompt(promptOptions);

    // Update the system message
    const systemMessageIndex = this.messages.findIndex(m => m.role === 'system');
    if (systemMessageIndex !== -1) {
      this.messages[systemMessageIndex] = {
        role: "system",
        content: systemPrompt,
      };
    }
  }

  private deriveLLMConfigFromClient(): LLMConfig {
    // Extract the current configuration from the LLM client
    const currentModel = this.llmClient.getCurrentModel();
    
    // Determine provider based on model name
    let provider: LLMProvider = 'openai'; // default fallback
    let apiKey = '';
    let baseURL: string | undefined;
    
    // Check for Anthropic models
    if (currentModel.includes('claude')) {
      provider = 'anthropic';
      apiKey = process.env.ANTHROPIC_API_KEY || '';
      baseURL = process.env.ANTHROPIC_BASE_URL;
    }
    // Check for Grok models
    else if (currentModel.includes('grok')) {
      provider = 'grok';
      apiKey = process.env.GROK_API_KEY || '';
      baseURL = process.env.GROK_BASE_URL || 'https://api.x.ai/v1';
    }
    // Check for local models
    else if (currentModel === 'custom-model' || process.env.LOCAL_LLM_BASE_URL) {
      provider = 'local';
      apiKey = process.env.LOCAL_LLM_API_KEY || 'local-key';
      baseURL = process.env.LOCAL_LLM_BASE_URL || 'http://localhost:1234/v1';
    }
    // Default to OpenAI
    else {
      provider = 'openai';
      apiKey = process.env.OPENAI_API_KEY || '';
      baseURL = process.env.OPENAI_BASE_URL;
    }
    
    return {
      provider,
      model: currentModel,
      apiKey,
      baseURL
    };
  }

  private async initializeMCP(): Promise<void> {
    try {
      await mcpManager.initialize();
    } catch (error: any) {
      console.warn('MCP initialization failed:', error.message);
    }
  }

  private async getAvailableTools(): Promise<any[]> {
    try {
      const mcpTools = await mcpManager.getAvailableJurikoTools();
      return [...MULTI_LLM_TOOLS, ...mcpTools];
    } catch (error) {
      console.warn('Failed to load MCP tools, using default tools only');
      return MULTI_LLM_TOOLS;
    }
  }

  async processUserMessage(message: string): Promise<ChatEntry[]> {
    // Add user message to conversation
    const userEntry: ChatEntry = {
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    this.chatHistory.push(userEntry);
    this.messages.push({ role: "user", content: message });

    const newEntries: ChatEntry[] = [userEntry];
    const maxToolRounds = 10; // Prevent infinite loops
    let toolRounds = 0;

    try {
      const availableTools = await this.getAvailableTools();
      let currentResponse = await this.llmClient.chat(
        this.messages,
        availableTools
      );

      // Agent loop - continue until no more tool calls or max rounds reached
      while (toolRounds < maxToolRounds) {
        const assistantMessage = currentResponse.choices[0]?.message;

        if (!assistantMessage) {
          throw new Error("No response from AI");
        }

        // Handle tool calls
        if (
          assistantMessage.tool_calls &&
          assistantMessage.tool_calls.length > 0
        ) {
          toolRounds++;

          // Add assistant message with tool calls
          const assistantEntry: ChatEntry = {
            type: "assistant",
            content: assistantMessage.content || "Using tools to help you...",
            timestamp: new Date(),
            toolCalls: assistantMessage.tool_calls,
          };
          this.chatHistory.push(assistantEntry);
          newEntries.push(assistantEntry);

          // Add assistant message to conversation
          this.messages.push({
            role: "assistant",
            content: assistantMessage.content || "Using tools to help you...",
            tool_calls: assistantMessage.tool_calls,
          });

          // Execute tool calls with batching if enabled
          if (this.enableBatching && assistantMessage.tool_calls.length > 1) {
            try {
              const batchResponse = await this.batchExecutor.executeBatch(
                assistantMessage.tool_calls,
                (toolCall) => this.executeTool(toolCall)
              );
              
              // Process batch results
              for (let i = 0; i < assistantMessage.tool_calls.length; i++) {
                const toolCall = assistantMessage.tool_calls[i];
                const batchResult = batchResponse.results[i];
                const result = batchResult.success
                  ? { success: true, output: batchResult.output }
                  : { success: false, error: batchResult.error };

                const toolResultEntry: ChatEntry = {
                  type: "tool_result",
                  content: result.success
                    ? result.output || "Success"
                    : result.error || "Error occurred",
                  timestamp: new Date(),
                  toolCall: toolCall,
                  toolResult: result,
                };
                this.chatHistory.push(toolResultEntry);
                newEntries.push(toolResultEntry);

                // Add tool result to messages with proper format (needed for AI context)
                this.messages.push({
                  role: "tool",
                  content: result.success
                    ? result.output || "Success"
                    : result.error || "Error",
                  tool_call_id: toolCall.id,
                });
              }
            } catch (error) {
              console.error('Batch execution failed, falling back to sequential:', error);
              // Fall back to sequential execution
              for (const toolCall of assistantMessage.tool_calls) {
                const result = await this.executeTool(toolCall);

                const toolResultEntry: ChatEntry = {
                  type: "tool_result",
                  content: result.success
                    ? result.output || "Success"
                    : result.error || "Error occurred",
                  timestamp: new Date(),
                  toolCall: toolCall,
                  toolResult: result,
                };
                this.chatHistory.push(toolResultEntry);
                newEntries.push(toolResultEntry);

                // Add tool result to messages with proper format (needed for AI context)
                this.messages.push({
                  role: "tool",
                  content: result.success
                    ? result.output || "Success"
                    : result.error || "Error",
                  tool_call_id: toolCall.id,
                });
              }
            }
          } else {
            // Execute tool calls sequentially
            for (const toolCall of assistantMessage.tool_calls) {
              const result = await this.executeTool(toolCall);

              const toolResultEntry: ChatEntry = {
                type: "tool_result",
                content: result.success
                  ? result.output || "Success"
                  : result.error || "Error occurred",
                timestamp: new Date(),
                toolCall: toolCall,
                toolResult: result,
              };
              this.chatHistory.push(toolResultEntry);
              newEntries.push(toolResultEntry);

              // Add tool result to messages with proper format (needed for AI context)
              this.messages.push({
                role: "tool",
                content: result.success
                  ? result.output || "Success"
                  : result.error || "Error",
                tool_call_id: toolCall.id,
              });
            }
          }

          // Get next response - this might contain more tool calls
          currentResponse = await this.llmClient.chat(
            this.messages,
            availableTools
          );
        } else {
          // No more tool calls, add final response
          const finalEntry: ChatEntry = {
            type: "assistant",
            content:
              assistantMessage.content ||
              "I understand, but I don't have a specific response.",
            timestamp: new Date(),
          };
          this.chatHistory.push(finalEntry);
          this.messages.push({
            role: "assistant",
            content: assistantMessage.content || "I understand, but I don't have a specific response.",
          });
          newEntries.push(finalEntry);
          break; // Exit the loop
        }
      }

      if (toolRounds >= maxToolRounds) {
        const warningEntry: ChatEntry = {
          type: "assistant",
          content:
            "Maximum tool execution rounds reached. Stopping to prevent infinite loops.",
          timestamp: new Date(),
        };
        this.chatHistory.push(warningEntry);
        newEntries.push(warningEntry);
      }

      return newEntries;
    } catch (error: any) {
      const errorEntry: ChatEntry = {
        type: "assistant",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      };
      this.chatHistory.push(errorEntry);
      return [userEntry, errorEntry];
    }
  }

  private messageReducer(previous: any, item: any): any {
    const delta = item.choices[0]?.delta || {};
    
    // Deep clone previous to avoid mutations
    const result = JSON.parse(JSON.stringify(previous || {}));
    
    // Handle content accumulation
    if (delta.content) {
      result.content = (result.content || '') + delta.content;
    }
    
    // Handle role
    if (delta.role) {
      result.role = delta.role;
    }
    
    // Handle tool_calls with special logic for streaming
    if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
      if (!result.tool_calls) {
        result.tool_calls = [];
      }
      
      for (let i = 0; i < delta.tool_calls.length; i++) {
        const deltaToolCall = delta.tool_calls[i];
        
        if (!deltaToolCall) continue;
        
        // Find existing tool call by ID or index
        let existingToolCall = null;
        let targetIndex = i;
        
        // Use index from streaming chunk if available
        if (deltaToolCall.index !== undefined) {
          targetIndex = deltaToolCall.index;
        }
        
        // If this tool call has an ID, look for existing tool call with same ID
        if (deltaToolCall.id) {
          const existingIndex = result.tool_calls.findIndex((tc: any) => tc && tc.id === deltaToolCall.id);
          if (existingIndex !== -1) {
            existingToolCall = result.tool_calls[existingIndex];
            targetIndex = existingIndex;
          }
        }
        
        // Ensure we have a tool call object at the target index
        if (!existingToolCall) {
          while (result.tool_calls.length <= targetIndex) {
            result.tool_calls.push({});
          }
          existingToolCall = result.tool_calls[targetIndex];
        }
        
        // Merge tool call properties
        if (deltaToolCall.id) {
          existingToolCall.id = deltaToolCall.id;
        }
        if (deltaToolCall.type) {
          existingToolCall.type = deltaToolCall.type;
        }
        
        // Handle function object
        if (deltaToolCall.function) {
          if (!existingToolCall.function) {
            existingToolCall.function = {};
          }
          
          if (deltaToolCall.function.name) {
            existingToolCall.function.name = deltaToolCall.function.name;
          }
          
          if (deltaToolCall.function.arguments !== undefined) {
            // Accumulate arguments as string
            existingToolCall.function.arguments = (existingToolCall.function.arguments || '') + deltaToolCall.function.arguments;
          }
        }
        
        // Clean up index property if it exists
        if ('index' in existingToolCall) {
          delete existingToolCall.index;
        }
      }
    }
    
    return result;
  }

  async *processUserMessageStream(
    message: string
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    // Create new abort controller for this request
    this.abortController = new AbortController();

    // Add user message to conversation
    const userEntry: ChatEntry = {
      type: "user",
      content: message,
      timestamp: new Date(),
    };
    this.chatHistory.push(userEntry);
    this.messages.push({ role: "user", content: message });

    // Calculate initial input tokens
    let currentTokens = this.tokenCounter.countMessageTokens(
      this.messages as any
    );
    
    // Check if we need to condense before processing
    const modelTokenLimit = getModelTokenLimit(this.llmClient.getCurrentModel());
    if (await shouldCondenseConversation(currentTokens, modelTokenLimit)) {
      yield {
        type: "content",
        content: "\n🔄 Token usage is approaching the limit (75%). Condensing conversation to preserve context...\n",
      };
      
      try {
        const condenseResult = await this.performCondense(true);
        if (condenseResult.error) {
          yield {
            type: "content",
            content: `\n⚠️ Condense failed: ${condenseResult.error}\n`,
          };
        } else {
          yield {
            type: "content",
            content: `\n✅ Conversation condensed successfully. Token count reduced from ${currentTokens} to ${condenseResult.newContextTokens}.\n`,
          };
          // Update current token count after condensing
          currentTokens = condenseResult.newContextTokens;
        }
      } catch (error: any) {
        yield {
          type: "content",
          content: `\n⚠️ Condense error: ${error.message}\n`,
        };
      }
    }
    
    yield {
      type: "token_count",
      tokenCount: currentTokens,
    };

    const maxToolRounds = 30; // Prevent infinite loops
    let toolRounds = 0;

    try {
      // Agent loop - continue until no more tool calls or max rounds reached
      while (toolRounds < maxToolRounds) {
        // Check if operation was cancelled
        if (this.abortController?.signal.aborted) {
          yield {
            type: "content",
            content: "\n\n[Operation cancelled by user]",
          };
          yield { type: "done" };
          return;
        }

        // Stream response and accumulate
        const availableTools = await this.getAvailableTools();
        const stream = this.llmClient.chatStream(
          this.messages,
          availableTools
        );
        let accumulatedMessage: any = {};
        let accumulatedContent = "";
        let toolCallsYielded = false;

        for await (const chunk of stream) {
          // Check for cancellation in the streaming loop
          if (this.abortController?.signal.aborted) {
            yield {
              type: "content",
              content: "\n\n[Operation cancelled by user]",
            };
            yield { type: "done" };
            return;
          }

          if (!chunk.choices?.[0]) continue;

          // Accumulate the message using reducer
          accumulatedMessage = this.messageReducer(accumulatedMessage, chunk);

          // Check for tool calls - yield when we have complete tool calls with function names AND complete arguments
          if (!toolCallsYielded && accumulatedMessage.tool_calls?.length > 0) {
            // Check if we have at least one complete tool call with function name AND complete arguments
            const hasCompleteTool = accumulatedMessage.tool_calls.some(
              (tc: any) => tc.function?.name && tc.function?.arguments &&
              // Check if arguments is valid JSON (complete)
              (() => {
                try {
                  JSON.parse(tc.function.arguments);
                  return true;
                } catch {
                  return false;
                }
              })()
            );
            if (hasCompleteTool) {
              yield {
                type: "tool_calls",
                toolCalls: accumulatedMessage.tool_calls,
              };
              toolCallsYielded = true;
            }
          }

          // Stream content as it comes
          if (chunk.choices[0].delta?.content) {
            accumulatedContent += chunk.choices[0].delta.content;

            yield {
              type: "content",
              content: chunk.choices[0].delta.content,
            };
          }
        }

        // Add assistant entry to history
        const assistantEntry: ChatEntry = {
          type: "assistant",
          content: accumulatedMessage.content || "Using tools to help you...",
          timestamp: new Date(),
          toolCalls: accumulatedMessage.tool_calls || undefined,
        };
        this.chatHistory.push(assistantEntry);

        // Add accumulated message to conversation
        this.messages.push({
          role: "assistant",
          content: accumulatedMessage.content || "Using tools to help you...",
          tool_calls: accumulatedMessage.tool_calls,
        });

        // Handle tool calls if present
        if (accumulatedMessage.tool_calls?.length > 0) {
          toolRounds++;

          // Only yield tool_calls if we haven't already yielded them during streaming
          // AND they have complete arguments
          if (!toolCallsYielded) {
            // Filter to only complete tool calls with valid JSON arguments
            const completeToolCalls = accumulatedMessage.tool_calls.filter((tc: any) => {
              if (!tc.function?.name || !tc.function?.arguments) return false;
              try {
                JSON.parse(tc.function.arguments);
                return true;
              } catch {
                return false;
              }
            });
            
            if (completeToolCalls.length > 0) {
              yield {
                type: "tool_calls",
                toolCalls: completeToolCalls,
              };
            }
          }

          // Execute tools with batching if enabled
          if (this.enableBatching && accumulatedMessage.tool_calls.length > 1) {
            try {
              const batchResponse = await this.batchExecutor.executeBatch(
                accumulatedMessage.tool_calls,
                (toolCall) => this.executeTool(toolCall)
              );
              
              // Process batch results
              for (let i = 0; i < accumulatedMessage.tool_calls.length; i++) {
                // Check for cancellation before processing each result
                if (this.abortController?.signal.aborted) {
                  yield {
                    type: "content",
                    content: "\n\n[Operation cancelled by user]",
                  };
                  yield { type: "done" };
                  return;
                }

                const toolCall = accumulatedMessage.tool_calls[i];
                const batchResult = batchResponse.results[i];
                const result = batchResult.success
                  ? { success: true, output: batchResult.output }
                  : { success: false, error: batchResult.error };

                const toolResultEntry: ChatEntry = {
                  type: "tool_result",
                  content: result.success
                    ? result.output || "Success"
                    : result.error || "Error occurred",
                  timestamp: new Date(),
                  toolCall: toolCall,
                  toolResult: result,
                };
                this.chatHistory.push(toolResultEntry);

                yield {
                  type: "tool_result",
                  toolCall,
                  toolResult: result,
                };

                // Add tool result with proper format (needed for AI context)
                this.messages.push({
                  role: "tool",
                  content: result.success
                    ? result.output || "Success"
                    : result.error || "Error",
                  tool_call_id: toolCall.id,
                });
              }
            } catch (error) {
              console.error('Batch execution failed, falling back to sequential:', error);
              // Fall back to sequential execution
              for (const toolCall of accumulatedMessage.tool_calls) {
                // Check for cancellation before executing each tool
                if (this.abortController?.signal.aborted) {
                  yield {
                    type: "content",
                    content: "\n\n[Operation cancelled by user]",
                  };
                  yield { type: "done" };
                  return;
                }

                const result = await this.executeTool(toolCall);

                const toolResultEntry: ChatEntry = {
                  type: "tool_result",
                  content: result.success
                    ? result.output || "Success"
                    : result.error || "Error occurred",
                  timestamp: new Date(),
                  toolCall: toolCall,
                  toolResult: result,
                };
                this.chatHistory.push(toolResultEntry);

                yield {
                  type: "tool_result",
                  toolCall,
                  toolResult: result,
                };

                // Add tool result with proper format (needed for AI context)
                this.messages.push({
                  role: "tool",
                  content: result.success
                    ? result.output || "Success"
                    : result.error || "Error",
                  tool_call_id: toolCall.id,
                });
              }
            }
          } else {
            // Execute tools sequentially
            for (const toolCall of accumulatedMessage.tool_calls) {
              // Check for cancellation before executing each tool
              if (this.abortController?.signal.aborted) {
                yield {
                  type: "content",
                  content: "\n\n[Operation cancelled by user]",
                };
                yield { type: "done" };
                return;
              }

              const result = await this.executeTool(toolCall);

              const toolResultEntry: ChatEntry = {
                type: "tool_result",
                content: result.success
                  ? result.output || "Success"
                  : result.error || "Error occurred",
                timestamp: new Date(),
                toolCall: toolCall,
                toolResult: result,
              };
              this.chatHistory.push(toolResultEntry);

              yield {
                type: "tool_result",
                toolCall,
                toolResult: result,
              };

              // Add tool result with proper format (needed for AI context)
              this.messages.push({
                role: "tool",
                content: result.success
                  ? result.output || "Success"
                  : result.error || "Error",
                tool_call_id: toolCall.id,
              });
            }
          }

          // Update token count after adding tool results and check for condensing
          currentTokens = this.tokenCounter.countMessageTokens(this.messages as any);
          
          // Check if we need to condense during conversation growth
          if (await shouldCondenseConversation(currentTokens, modelTokenLimit)) {
            yield {
              type: "content",
              content: "\n🔄 Token usage reached 75% during conversation. Condensing to preserve context...\n",
            };
            
            try {
              const condenseResult = await this.performCondense(true);
              if (condenseResult.error) {
                yield {
                  type: "content",
                  content: `\n⚠️ Condense failed: ${condenseResult.error}\n`,
                };
              } else {
                yield {
                  type: "content",
                  content: `\n✅ Conversation condensed. Token count reduced from ${currentTokens} to ${condenseResult.newContextTokens}.\n`,
                };
                currentTokens = condenseResult.newContextTokens;
              }
            } catch (error: any) {
              yield {
                type: "content",
                content: `\n⚠️ Condense error: ${error.message}\n`,
              };
            }
          }
          
          // Emit updated token count
          yield {
            type: "token_count",
            tokenCount: currentTokens,
          };

          // Continue the loop to get the next response (which might have more tool calls)
        } else {
          // No tool calls, we're done
          break;
        }
      }

      if (toolRounds >= maxToolRounds) {
        yield {
          type: "content",
          content:
            "\n\nMaximum tool execution rounds reached. Stopping to prevent infinite loops.",
        };
      }

      yield { type: "done" };
    } catch (error: any) {
      // Check if this was a cancellation
      if (this.abortController?.signal.aborted) {
        yield {
          type: "content",
          content: "\n\n[Operation cancelled by user]",
        };
        yield { type: "done" };
        return;
      }

      const errorEntry: ChatEntry = {
        type: "assistant",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      };
      this.chatHistory.push(errorEntry);
      yield {
        type: "content",
        content: errorEntry.content,
      };
      yield { type: "done" };
    } finally {
      // Clean up abort controller
      this.abortController = null;
    }
  }

  private async performCondense(isAutomaticTrigger: boolean = false): Promise<CondenseResponse> {
    const currentTokens = this.tokenCounter.countMessageTokens(this.messages as any);
    
    // Convert LLMMessage[] to JurikoMessage[] for condense function
    const jurikoMessages = this.messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      tool_calls: msg.tool_calls,
      tool_call_id: msg.tool_call_id
    }));
    
    const condenseResult = await condenseConversation(
      jurikoMessages,
      this.llmConfig,
      this.tokenCounter,
      currentTokens,
      {
        maxMessagesToKeep: 0, // Don't keep any old messages, replace everything with summary
        isAutomaticTrigger,
        systemPrompt: (() => {
          const systemMsg = this.messages.find(m => m.role === 'system');
          if (systemMsg?.content) {
            return typeof systemMsg.content === 'string' ? systemMsg.content : JSON.stringify(systemMsg.content);
          }
          return "You are JURIKO CLI, an AI assistant that helps with file editing, coding tasks, and system operations.";
        })()
      }
    );

    if (!condenseResult.error) {
      // Completely replace messages with condensed version
      this.messages = condenseResult.messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        tool_calls: (msg as any).tool_calls,
        tool_call_id: (msg as any).tool_call_id
      }));
      
      // Completely replace chat history with just the condensed summary
      this.chatHistory = [{
        type: "user",
        content: `Previous conversation summary:\n\n${condenseResult.summary}`,
        timestamp: new Date(),
      }];
    }

    return condenseResult;
  }

  private async executeTool(toolCall: LLMToolCall): Promise<ToolResult> {
    try {
      const args = parseToolCallArguments(toolCall);

      // Get the tool schema for validation
      const availableTools = await this.getAvailableTools();
      const toolSchema = availableTools.find(tool => tool.function.name === toolCall.function.name);
      
      // Validate and auto-parse arguments if schema is available
      if (toolSchema?.function?.parameters) {
        const validationError = validateArgumentTypes(args, toolSchema.function.parameters);
        if (validationError) {
          return {
            success: false,
            error: `Argument validation failed: ${validationError}`,
          };
        }
      }

      switch (toolCall.function.name) {
        case "view_file":
          const range: [number, number] | undefined =
            args.start_line && args.end_line
              ? [args.start_line, args.end_line]
              : undefined;
          return await this.textEditor.view(args.path, range);

        case "create_file":
          return await this.textEditor.create(args.path, args.content);

        case "str_replace_editor":
          return await this.textEditor.strReplace(
            args.path,
            args.old_str,
            args.new_str
          );

        case "bash":
          return await this.bash.execute(args.command);

        case "create_todo_list":
          return await this.todoTool.createTodoList(args.todos);

        case "update_todo_list":
          return await this.todoTool.updateTodoList(args.updates);


        default:
          // Check if it's an MCP tool
          if (mcpToolsIntegration.isMCPTool(toolCall.function.name)) {
            return await mcpToolsIntegration.executeMCPTool(toolCall.function.name, args);
          }
          
          return {
            success: false,
            error: `Unknown tool: ${toolCall.function.name}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Tool execution error: ${error.message}`,
      };
    }
  }

  getChatHistory(): ChatEntry[] {
    return [...this.chatHistory];
  }

  getCurrentDirectory(): string {
    return this.bash.getCurrentDirectory();
  }

  async executeBashCommand(command: string): Promise<ToolResult> {
    return await this.bash.execute(command);
  }

  getCurrentModel(): string {
    return this.llmClient.getCurrentModel();
  }

  setModel(model: string): void {
    this.llmClient.setModel(model);
    // Update token counter for new model
    this.tokenCounter.dispose();
    this.tokenCounter = createTokenCounter(model);
    // Update LLM config for condensing to match new model
    this.llmConfig = this.deriveLLMConfigFromClient();
  }

  getLLMClient(): LLMClient {
    return this.llmClient;
  }

  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
    // Update LLM config for condensing to match new client
    this.llmConfig = this.deriveLLMConfigFromClient();
  }

  abortCurrentOperation(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}