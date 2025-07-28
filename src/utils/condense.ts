import { JurikoMessage } from "../juriko/client";
import { LLMClient } from "../llm/client";
import { LLMConfig, LLMMessage } from "../llm/types";
import { TokenCounter } from "./token-counter";

export interface CondenseResponse {
  messages: JurikoMessage[];
  summary: string;
  newContextTokens: number;
  error?: string;
}

export interface CondenseOptions {
  maxMessagesToKeep?: number;
  customCondensePrompt?: string;
  systemPrompt?: string;
  taskId?: string;
  isAutomaticTrigger?: boolean;
}

/**
 * Condenses conversation messages using an LLM call
 * Summarizes the conversation so far, as described in the prompt instructions.
 */
export async function condenseConversation(
  messages: JurikoMessage[],
  llmConfig: LLMConfig,
  tokenCounter: TokenCounter,
  prevContextTokens: number,
  options: CondenseOptions = {}
): Promise<CondenseResponse> {
  const {
    maxMessagesToKeep = 3,
    customCondensePrompt,
    systemPrompt = "You are JURIKO CLI, an AI assistant that helps with file editing, coding tasks, and system operations.",
    taskId,
    isAutomaticTrigger = false
  } = options;

  try {
    // Check if there's a recent summary in the messages we're keeping
    const keepMessages = messages.slice(-maxMessagesToKeep);
    const recentSummaryExists = keepMessages.some((message) =>
      message.role === 'assistant' &&
      typeof message.content === 'string' &&
      message.content.includes('Summary')
    );

    if (recentSummaryExists) {
      const error = isAutomaticTrigger 
        ? "common:errors.condensed_recently"
        : "common:errors.condense_not_enough_messages";
      
      return {
        messages,
        summary: "",
        newContextTokens: prevContextTokens,
        error: error === "common:errors.condensed_recently" 
          ? "Conversation was condensed recently. No need to condense again."
          : "Not enough messages to condense effectively."
      };
    }

    // Create the condense prompt
    const finalRequestMessage: JurikoMessage = {
      role: "user",
      content: customCondensePrompt?.trim() || 
        "Summarize the conversation so far, as described in the prompt instructions." +
        "\n\nThis summary should be thorough in capturing technical details, code patterns, and architectural decisions made." +
        "\n\nYour summary should be structured as follows:" +
        "\n1. Previous Conversation: The context to continue the conversation with. If applicable based on the current task, this should include:" +
        "\n   - Current Work: Describe in detail what was being worked on prior to this request to summarize the conversation" +
        "\n   - Key Technical Concepts: List all important technical concepts, technologies, coding conventions, and frameworks" +
        "\n   - Relevant Files and Code: If applicable, enumerate specific files and code sections examined, modified, or created" +
        "\n   - Problem Solving: Document problems solved thus far and any ongoing troubleshooting efforts" +
        "\n   - Pending Tasks and Next Steps: Outline all pending tasks that you have explicitly been asked to work on" +
        "\n\nExample summary structure:" +
        "\n1. Previous Conversation:" +
        "\n   [Detailed description]" +
        "\n2. Current Work:" +
        "\n   [Detailed description]" +
        "\n3. Key Technical Concepts:" +
        "\n   - [Concept 1]" +
        "\n   - [Concept 2]" +
        "\n   - [...]" +
        "\n4. Relevant Files and Code:" +
        "\n   - [File Name 1]" +
        "\n     ~ [Summary of why this file is important]" +
        "\n     ~ [Summary of the changes made to this file, if any]" +
        "\n     ~ [Important Code Snippet]" +
        "\n5. Problem Solving:" +
        "\n   - [Task 1 details & next steps]" +
        "\n   - [Task 2 details & next steps]" +
        "\n   - [...]" +
        "\n6. Pending Tasks and Next Steps:" +
        "\n   - [Task 1 details & next steps]" +
        "\n   - [Task 2 details & next steps]" +
        "\n   - [...]" +
        "\n\nOutput only the summary of the conversation so far, without any additional commentary or explanation."
    };

    // Create LLM client for condensing
    const llmClient = new LLMClient(llmConfig);

    // Prepare messages for condensing (exclude system message from the conversation to be summarized)
    const conversationMessages = messages.filter(m => m.role !== 'system');
    const messagesToCondense: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages.map(msg => {
        const llmMsg: LLMMessage = {
          role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
          content: typeof msg.content === 'string' ? msg.content : (msg.content ? JSON.stringify(msg.content) : ''),
        };
        
        // Add tool_calls if present and role is assistant
        if (msg.role === 'assistant' && 'tool_calls' in msg && msg.tool_calls) {
          llmMsg.tool_calls = msg.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }));
        }
        
        // Add tool_call_id if present and role is tool
        if (msg.role === 'tool' && 'tool_call_id' in msg && msg.tool_call_id) {
          llmMsg.tool_call_id = msg.tool_call_id;
        }
        
        return llmMsg;
      }),
      { role: 'user', content: typeof finalRequestMessage.content === 'string' ? finalRequestMessage.content : (finalRequestMessage.content ? JSON.stringify(finalRequestMessage.content) : '') }
    ];

    // Get the summary
    const response = await llmClient.chat(messagesToCondense);
    const assistantMessage = response.choices[0]?.message;

    if (!assistantMessage?.content) {
      throw new Error("No response from AI during condensing");
    }

    const summary = assistantMessage.content;

    // Create new condensed message set
    const systemMessage = messages.find(m => m.role === 'system');
    const condensedMessages: JurikoMessage[] = [];

    // Add system message if it exists
    if (systemMessage) {
      condensedMessages.push(systemMessage);
    }

    // Add the summary as a user message
    condensedMessages.push({
      role: 'user',
      content: `Previous conversation summary:\n\n${summary}`
    });

    // Add the most recent messages to maintain context
    const recentMessages = messages.slice(-maxMessagesToKeep);
    condensedMessages.push(...recentMessages);

    // Calculate new token count
    const newContextTokens = tokenCounter.countMessageTokens(condensedMessages as any);

    return {
      messages: condensedMessages,
      summary,
      newContextTokens,
    };

  } catch (error: any) {
    return {
      messages,
      summary: "",
      newContextTokens: prevContextTokens,
      error: `Condense operation failed: ${error.message}`
    };
  }
}

/**
 * Check if conversation needs condensing based on token count
 */
export function shouldCondenseConversation(
  currentTokens: number,
  maxTokens: number,
  threshold: number = 0.75
): boolean {
  return currentTokens >= (maxTokens * threshold);
}

/**
 * Get model-specific token limits
 */
export function getModelTokenLimit(model: string): number {
  // Common model token limits
  const tokenLimits: Record<string, number> = {
    // Anthropic models
    'claude-3-7-sonnet-latest': 200000,
    'claude-sonnet-4-20250514': 200000,
    'claude-opus-4-20250514': 200000,
    'claude-3-5-sonnet-20241022': 200000,
    'claude-3-5-haiku-20241022': 200000,
    'claude-3-opus-20240229': 200000,
    'claude-3-sonnet-20240229': 200000,
    'claude-3-haiku-20240307': 200000,
    
    // OpenAI models
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 16385,
    
    // Grok models
    'grok-4-latest': 131072,
    'grok-3-latest': 131072,
    'grok-3-fast': 131072,
    'grok-3-mini-fast': 131072,
    
    // Default fallback
    'default': 128000
  };

  return tokenLimits[model] || tokenLimits['default'];
}