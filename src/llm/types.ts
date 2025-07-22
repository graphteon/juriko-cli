export type LLMProvider = 'anthropic' | 'openai' | 'grok';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface LLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: LLMToolCall[];
    };
  }>;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseURL?: string;
}

export interface ProviderModels {
  [key: string]: {
    name: string;
    description: string;
  }[];
}

export const PROVIDER_MODELS: ProviderModels = {
  anthropic: [
    { name: 'claude-3-5-sonnet-20241022', description: 'Claude 3.5 Sonnet (Latest)' },
    { name: 'claude-3-5-haiku-20241022', description: 'Claude 3.5 Haiku (Fast)' },
    { name: 'claude-3-opus-20240229', description: 'Claude 3 Opus (Most Capable)' },
    { name: 'claude-3-sonnet-20240229', description: 'Claude 3 Sonnet' },
    { name: 'claude-3-haiku-20240307', description: 'Claude 3 Haiku' },
  ],
  openai: [
    { name: 'gpt-4o', description: 'GPT-4o (Latest)' },
    { name: 'gpt-4o-mini', description: 'GPT-4o Mini (Fast)' },
    { name: 'gpt-4-turbo', description: 'GPT-4 Turbo' },
    { name: 'gpt-4', description: 'GPT-4' },
    { name: 'gpt-3.5-turbo', description: 'GPT-3.5 Turbo' },
  ],
  grok: [
    { name: 'grok-4-latest', description: 'Grok-4 (Latest)' },
    { name: 'grok-3-latest', description: 'Grok-3 (Latest)' },
    { name: 'grok-3-fast', description: 'Grok-3 Fast' },
    { name: 'grok-3-mini-fast', description: 'Grok-3 Mini Fast' },
  ],
};

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4o',
  grok: 'grok-4-latest',
};

export const PROVIDER_ENV_VARS: Record<LLMProvider, { apiKey: string; baseURL?: string }> = {
  anthropic: {
    apiKey: 'ANTHROPIC_API_KEY',
    baseURL: 'ANTHROPIC_BASE_URL',
  },
  openai: {
    apiKey: 'OPENAI_API_KEY',
    baseURL: 'OPENAI_BASE_URL',
  },
  grok: {
    apiKey: 'GROK_API_KEY',
    baseURL: 'GROK_BASE_URL',
  },
};