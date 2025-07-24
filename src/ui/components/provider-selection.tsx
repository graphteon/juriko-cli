import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { LLMProvider, PROVIDER_MODELS } from '../../llm/types';

interface ProviderSelectionProps {
  onSelect: (provider: LLMProvider, model: string) => void;
  onCancel: () => void;
  currentProvider?: LLMProvider;
  currentModel?: string;
}

export const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  onSelect,
  onCancel,
  currentProvider,
  currentModel,
}) => {
  const [selectedProviderIndex, setSelectedProviderIndex] = useState(0);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [isSelectingModel, setIsSelectingModel] = useState(false);

  const providers: LLMProvider[] = ['anthropic', 'openai', 'grok', 'local'];
  const currentProviderModels = PROVIDER_MODELS[providers[selectedProviderIndex]];

  useEffect(() => {
    if (currentProvider) {
      const providerIndex = providers.indexOf(currentProvider);
      if (providerIndex !== -1) {
        setSelectedProviderIndex(providerIndex);
      }
    }
  }, [currentProvider]);

  useEffect(() => {
    if (currentModel && currentProvider) {
      const models = PROVIDER_MODELS[currentProvider];
      const modelIndex = models.findIndex(model => model.name === currentModel);
      if (modelIndex !== -1) {
        setSelectedModelIndex(modelIndex);
      }
    }
  }, [currentModel, currentProvider]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (!isSelectingModel) {
      // Provider selection mode
      if (key.upArrow) {
        setSelectedProviderIndex(prev => 
          prev > 0 ? prev - 1 : providers.length - 1
        );
      } else if (key.downArrow) {
        setSelectedProviderIndex(prev => 
          prev < providers.length - 1 ? prev + 1 : 0
        );
      } else if (key.return) {
        setIsSelectingModel(true);
        setSelectedModelIndex(0);
      }
    } else {
      // Model selection mode
      if (key.upArrow) {
        setSelectedModelIndex(prev => 
          prev > 0 ? prev - 1 : currentProviderModels.length - 1
        );
      } else if (key.downArrow) {
        setSelectedModelIndex(prev => 
          prev < currentProviderModels.length - 1 ? prev + 1 : 0
        );
      } else if (key.return) {
        onSelect(providers[selectedProviderIndex], currentProviderModels[selectedModelIndex].name);
      } else if (key.leftArrow) {
        setIsSelectingModel(false);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        🤖 Select LLM Provider and Model
      </Text>
      <Text color="gray">
        Use ↑↓ to navigate, Enter to select, ← to go back, Esc to cancel
      </Text>
      <Box marginTop={1} />

      {!isSelectingModel ? (
        <Box flexDirection="column">
          <Text bold color="yellow">Select Provider:</Text>
          {providers.map((provider, index) => (
            <Box key={provider} marginLeft={2}>
              <Text color={index === selectedProviderIndex ? 'green' : 'white'}>
                {index === selectedProviderIndex ? '▶ ' : '  '}
                {provider.toUpperCase()}
                {provider === currentProvider && ' (current)'}
              </Text>
            </Box>
          ))}
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text bold color="yellow">
            Select Model for {providers[selectedProviderIndex].toUpperCase()}:
          </Text>
          {currentProviderModels.map((model, index) => (
            <Box key={model.name} flexDirection="column" marginLeft={2}>
              <Text color={index === selectedModelIndex ? 'green' : 'white'}>
                {index === selectedModelIndex ? '▶ ' : '  '}
                {model.name}
                {model.name === currentModel && providers[selectedProviderIndex] === currentProvider && ' (current)'}
              </Text>
              <Box marginLeft={4}>
                <Text color="gray">
                  {model.description}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">
          {!isSelectingModel 
            ? 'Press Enter to select provider and choose model'
            : 'Press Enter to confirm selection, ← to go back to provider selection'
          }
        </Text>
      </Box>
    </Box>
  );
};