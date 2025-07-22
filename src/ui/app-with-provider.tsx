import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MultiLLMAgent } from '../agent/multi-llm-agent';
import { ToolResult } from '../types';
import { ConfirmationService, ConfirmationOptions } from '../utils/confirmation-service';
import ConfirmationDialog from './components/confirmation-dialog';
import { ProviderSelection } from './components/provider-selection';
import { MultiProviderApiKeyInput } from './components/multi-provider-api-key-input';
import { LLMProvider } from '../llm/types';
import { LLMClient } from '../llm/client';
import { 
  loadUserSettings, 
  updateProviderSettings, 
  getApiKey, 
  saveApiKey 
} from '../utils/user-settings';
import chalk from 'chalk';

interface Props {
  agent?: MultiLLMAgent;
}

type AppState = 'loading' | 'provider-selection' | 'api-key-input' | 'ready';

export default function AppWithProvider({ agent: initialAgent }: Props) {
  const [appState, setAppState] = useState<AppState>('loading');
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | undefined>();
  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  const [agent, setAgent] = useState<MultiLLMAgent | undefined>(initialAgent);
  const [llmClient, setLlmClient] = useState<LLMClient | undefined>();
  const [needsApiKey, setNeedsApiKey] = useState(false);
  
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ command: string; result: ToolResult }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmationOptions, setConfirmationOptions] = useState<ConfirmationOptions | null>(null);
  const { exit } = useApp();
  
  const confirmationService = ConfirmationService.getInstance();

  useEffect(() => {
    const handleConfirmationRequest = (options: ConfirmationOptions) => {
      setConfirmationOptions(options);
    };

    confirmationService.on('confirmation-requested', handleConfirmationRequest);

    return () => {
      confirmationService.off('confirmation-requested', handleConfirmationRequest);
    };
  }, [confirmationService]);

  // Reset confirmation service session on app start
  useEffect(() => {
    confirmationService.resetSession();
  }, []);

  // Load user settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await loadUserSettings();
        
        if (settings.provider && settings.model) {
          // Check if we have API key for this provider
          const apiKey = await getApiKey(settings.provider);
          
          if (apiKey) {
            // We have everything needed, initialize directly
            await initializeLLMClient(settings.provider, settings.model, apiKey);
            setSelectedProvider(settings.provider);
            setSelectedModel(settings.model);
            setAppState('ready');
          } else {
            // We have provider/model but no API key
            setSelectedProvider(settings.provider);
            setSelectedModel(settings.model);
            setNeedsApiKey(true);
            setAppState('api-key-input');
          }
        } else {
          // No saved settings, show provider selection
          setAppState('provider-selection');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        setAppState('provider-selection');
      }
    };

    loadSettings();
  }, []);

  const initializeLLMClient = async (provider: LLMProvider, model: string, apiKey: string) => {
    try {
      const client = new LLMClient({
        provider,
        model,
        apiKey,
      });

      setLlmClient(client);
      
      // Create new agent with the LLM client if we don't have one
      if (!agent) {
        const newAgent = new MultiLLMAgent(client);
        setAgent(newAgent);
      } else {
        // Update existing agent's client
        agent.setLLMClient(client);
      }
    } catch (error) {
      console.error('Failed to initialize LLM client:', error);
      throw error;
    }
  };

  const handleProviderSelection = async (provider: LLMProvider, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    
    // Check if we have API key for this provider
    const apiKey = await getApiKey(provider);
    
    if (apiKey) {
      try {
        await initializeLLMClient(provider, model, apiKey);
        await updateProviderSettings(provider, model);
        setAppState('ready');
      } catch (error) {
        console.error('Failed to initialize with saved API key:', error);
        setNeedsApiKey(true);
        setAppState('api-key-input');
      }
    } else {
      setNeedsApiKey(true);
      setAppState('api-key-input');
    }
  };

  const handleApiKeyInput = async (apiKey: string, saveKey: boolean) => {
    if (!selectedProvider || !selectedModel) {
      console.error('Provider or model not selected');
      return;
    }

    try {
      await initializeLLMClient(selectedProvider, selectedModel, apiKey);
      
      if (saveKey) {
        await saveApiKey(selectedProvider, apiKey);
      }
      
      await updateProviderSettings(selectedProvider, selectedModel);
      setAppState('ready');
    } catch (error) {
      console.error('Failed to initialize with API key:', error);
      // Stay in API key input state to allow retry
    }
  };

  const handleProviderCancel = () => {
    exit();
  };

  const handleApiKeyCancel = () => {
    setAppState('provider-selection');
  };

  useInput(async (inputChar: string, key: any) => {
    // Only handle input when app is ready and no confirmation dialog
    if (appState !== 'ready' || confirmationOptions) {
      return;
    }

    if (key.ctrl && inputChar === 'c') {
      exit();
      return;
    }

    // Add shortcut to change provider/model
    if (key.ctrl && inputChar === 'p') {
      setAppState('provider-selection');
      return;
    }

    if (key.return) {
      if (input.trim() === 'exit' || input.trim() === 'quit') {
        exit();
        return;
      }

      if (input.trim() === 'provider' || input.trim() === 'switch') {
        setAppState('provider-selection');
        setInput('');
        return;
      }

      if (input.trim() && agent) {
        setIsProcessing(true);
        try {
          const entries = await agent.processUserMessage(input.trim());
          // Convert chat entries to the expected format for history
          const lastEntry = entries[entries.length - 1];
          const result: ToolResult = {
            success: lastEntry.type !== 'assistant' || !lastEntry.content.includes('error'),
            output: lastEntry.content,
            error: lastEntry.type === 'assistant' && lastEntry.content.includes('error') ? lastEntry.content : undefined
          };
          setHistory(prev => [...prev, { command: input.trim(), result }]);
        } catch (error: any) {
          const result: ToolResult = {
            success: false,
            error: error.message
          };
          setHistory(prev => [...prev, { command: input.trim(), result }]);
        }
        setInput('');
        setIsProcessing(false);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }

    if (inputChar && !key.ctrl && !key.meta) {
      setInput(prev => prev + inputChar);
    }
  });

  const renderResult = (result: ToolResult) => {
    if (result.success) {
      return (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="green">✓ Success</Text>
          {result.output && (
            <Box marginLeft={2}>
              <Text>{result.output}</Text>
            </Box>
          )}
        </Box>
      );
    } else {
      return (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="red">✗ Error</Text>
          {result.error && (
            <Box marginLeft={2}>
              <Text color="red">{result.error}</Text>
            </Box>
          )}
        </Box>
      );
    }
  };

  const handleConfirmation = (dontAskAgain?: boolean) => {
    confirmationService.confirmOperation(true, dontAskAgain);
    setConfirmationOptions(null);
  };

  const handleRejection = (feedback?: string) => {
    confirmationService.rejectOperation(feedback);
    setConfirmationOptions(null);
  };

  if (confirmationOptions) {
    return (
      <ConfirmationDialog
        operation={confirmationOptions.operation}
        filename={confirmationOptions.filename}
        showVSCodeOpen={confirmationOptions.showVSCodeOpen}
        onConfirm={handleConfirmation}
        onReject={handleRejection}
      />
    );
  }

  if (appState === 'loading') {
    return (
      <Box padding={1}>
        <Text color="cyan">🔧 Loading JURIKO...</Text>
      </Box>
    );
  }

  if (appState === 'provider-selection') {
    return (
      <ProviderSelection
        onSelect={handleProviderSelection}
        onCancel={handleProviderCancel}
        currentProvider={selectedProvider}
        currentModel={selectedModel}
      />
    );
  }

  if (appState === 'api-key-input' && selectedProvider) {
    return (
      <MultiProviderApiKeyInput
        provider={selectedProvider}
        onSubmit={handleApiKeyInput}
        onCancel={handleApiKeyCancel}
      />
    );
  }

  if (appState === 'ready') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🔧 JURIKO CLI - Text Editor Agent
          </Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color="green">
            Provider: {selectedProvider?.toUpperCase()} | Model: {selectedModel}
          </Text>
        </Box>
        
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>
            Available commands: view, str_replace, create, insert, undo_edit, bash, help
          </Text>
          <Text dimColor>
            Type 'provider' to switch provider/model, 'help' for usage, 'exit' or Ctrl+C to quit
          </Text>
          <Text dimColor>
            Press Ctrl+P to quickly switch provider/model
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          {history.slice(-10).map((entry, index) => (
            <Box key={index} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color="blue">$ </Text>
                <Text>{entry.command}</Text>
              </Box>
              {renderResult(entry.result)}
            </Box>
          ))}
        </Box>

        <Box>
          <Text color="blue">$ </Text>
          <Text>
            {input}
            {!isProcessing && <Text color="white">█</Text>}
          </Text>
          {isProcessing && <Text color="yellow"> (processing...)</Text>}
        </Box>
      </Box>
    );
  }

  return (
    <Box padding={1}>
      <Text color="red">Unknown app state: {appState}</Text>
    </Box>
  );
}