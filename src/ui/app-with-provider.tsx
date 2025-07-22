import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MultiLLMAgent } from '../agent/multi-llm-agent';
import { ToolResult } from '../types';
import { ConfirmationService, ConfirmationOptions } from '../utils/confirmation-service';
import ConfirmationDialog from './components/confirmation-dialog';
import StatusBar from './components/status-bar';
import StreamingChat from './components/streaming-chat';
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
import cfonts from 'cfonts';

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
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  
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

  // Show ASCII art banner and tips when app is ready (only once)
  useEffect(() => {
    if (appState === 'ready' && !hasShownWelcome) {
      // Only clear console on first load, not after confirmation dialogs
      if (!confirmationOptions) {
        console.clear();
        cfonts.say("JURIKO", {
          font: "3d",
          align: "left",
          colors: ["magenta", "gray"],
          space: true,
          maxLength: "0",
          gradient: ["magenta", "cyan"],
          independentGradient: false,
          transitionGradient: true,
          env: "node",
        });

        console.log("Tips for getting started:");
        console.log("1. Ask questions, edit files, or run commands.");
        console.log("2. Be specific for the best results.");
        console.log("3. Create JURIKO.md files to customize your interactions with JURIKO.");
        console.log("4. /help for more information.");
        console.log("");
      }
      
      setHasShownWelcome(true);
    }
  }, [appState, hasShownWelcome, confirmationOptions]);

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

  if (appState === 'ready' && agent) {
    return (
      <Box flexDirection="column" height="100%">
        <Box flexGrow={1}>
          <StreamingChat
            key="streaming-chat" // Add key to prevent re-mounting
            agent={agent}
            onProviderSwitch={() => setAppState('provider-selection')}
          />
        </Box>
        
        {selectedProvider && selectedModel && (
          <StatusBar provider={selectedProvider} model={selectedModel} />
        )}
      </Box>
    );
  }

  return (
    <Box padding={1}>
      <Text color="red">Unknown app state: {appState}</Text>
    </Box>
  );
}