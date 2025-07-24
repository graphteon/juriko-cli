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
import { LocalLLMWizard } from './components/local-llm-wizard';
import { LLMProvider } from '../llm/types';
import { LLMClient } from '../llm/client';
import {
  loadUserSettings,
  updateProviderSettings,
  getApiKey,
  saveApiKey,
  getBaseURL,
  saveBaseURL
} from '../utils/user-settings';
import chalk from 'chalk';
import cfonts from 'cfonts';
import { logger } from '../utils/logger';

interface Props {
  agent?: MultiLLMAgent;
}

type AppState = 'loading' | 'provider-selection' | 'api-key-input' | 'local-llm-wizard' | 'ready';

export default function AppWithProvider({ agent: initialAgent }: Props) {
  const [appState, setAppState] = useState<AppState>('loading');
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | undefined>();
  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  const [agent, setAgent] = useState<MultiLLMAgent | undefined>(initialAgent);
  const [llmClient, setLlmClient] = useState<LLMClient | undefined>();
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  
  const { exit } = useApp();
  
  const confirmationService = ConfirmationService.getInstance();

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
          const baseURL = await getBaseURL(settings.provider);
          
          if (apiKey || settings.provider === 'local') {
            // We have everything needed, initialize directly
            await initializeLLMClient(settings.provider, settings.model, apiKey || '', baseURL);
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
        logger.error('Failed to load settings:', error);
        setAppState('provider-selection');
      }
    };

    loadSettings();
  }, []);

  // Show ASCII art banner and tips when app is ready (only once)
  useEffect(() => {
    if (appState === 'ready' && !hasShownWelcome) {
      logger.clear();
      cfonts.say("#JURIKO", {
        font: "block",
        align: "left",
        colors: ["magenta", "gray"],
        space: true,
        maxLength: "0",
        gradient: ["magenta", "cyan"],
        independentGradient: false,
        transitionGradient: true,
        env: "node",
      });

      logger.info("Tips for getting started:");
      logger.info("1. Ask questions, edit files, or run commands.");
      logger.info("2. Be specific for the best results.");
      logger.info("3. Create JURIKO.md files to customize your interactions with JURIKO.");
      logger.info("4. /help for more information.");
      logger.info("");
      
      setHasShownWelcome(true);
    }
  }, [appState, hasShownWelcome]);

  const initializeLLMClient = async (provider: LLMProvider, model: string, apiKey: string, baseURL?: string) => {
    try {
      const client = new LLMClient({
        provider,
        model,
        apiKey,
        baseURL,
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
      logger.error('Failed to initialize LLM client:', error);
      throw error;
    }
  };

  const handleProviderSelection = async (provider: LLMProvider, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    
    // For local provider, always show wizard for configuration
    if (provider === 'local') {
      setAppState('local-llm-wizard');
      return;
    }
    
    // Check if we have API key for this provider
    const apiKey = await getApiKey(provider);
    const baseURL = await getBaseURL(provider);
    
    if (apiKey) {
      try {
        await initializeLLMClient(provider, model, apiKey, baseURL);
        await updateProviderSettings(provider, model);
        setAppState('ready');
      } catch (error) {
        logger.error('Failed to initialize with saved API key:', error);
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
      logger.error('Provider or model not selected');
      return;
    }

    try {
      const baseURL = await getBaseURL(selectedProvider);
      await initializeLLMClient(selectedProvider, selectedModel, apiKey, baseURL);
      
      if (saveKey) {
        await saveApiKey(selectedProvider, apiKey);
      }
      
      await updateProviderSettings(selectedProvider, selectedModel);
      setAppState('ready');
    } catch (error) {
      logger.error('Failed to initialize with API key:', error);
      // Stay in API key input state to allow retry
    }
  };

  const handleLocalLLMWizard = async (config: { baseURL: string; modelName: string; apiKey: string; saveConfig: boolean }) => {
    if (!selectedProvider) {
      logger.error('Provider not selected');
      return;
    }

    try {
      // Use the model name from wizard instead of selectedModel
      await initializeLLMClient(selectedProvider, config.modelName, config.apiKey, config.baseURL);
      
      if (config.saveConfig) {
        if (config.apiKey) {
          await saveApiKey(selectedProvider, config.apiKey);
        }
        await saveBaseURL(selectedProvider, config.baseURL);
      }
      
      // Update settings with the model name from wizard
      await updateProviderSettings(selectedProvider, config.modelName);
      setSelectedModel(config.modelName);
      setAppState('ready');
    } catch (error) {
      logger.error('Failed to initialize local LLM:', error);
      // Stay in wizard state to allow retry
    }
  };

  const handleProviderCancel = () => {
    exit();
  };

  const handleApiKeyCancel = () => {
    setAppState('provider-selection');
  };

  const handleLocalLLMWizardCancel = () => {
    setAppState('provider-selection');
  };



  // Remove the early return for confirmation dialog
  // We'll handle it in the main render section

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

  if (appState === 'local-llm-wizard') {
    return (
      <LocalLLMWizard
        onSubmit={handleLocalLLMWizard}
        onCancel={handleLocalLLMWizardCancel}
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