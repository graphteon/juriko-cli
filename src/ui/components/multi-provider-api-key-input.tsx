import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { LLMProvider } from '../../llm/types';

interface MultiProviderApiKeyInputProps {
  provider: LLMProvider;
  onSubmit: (apiKey: string, saveKey: boolean) => Promise<void>;
  onCancel: () => void;
}

export const MultiProviderApiKeyInput: React.FC<MultiProviderApiKeyInputProps> = ({
  provider,
  onSubmit,
  onCancel,
}) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveKey, setSaveKey] = useState(true);
  const { exit } = useApp();

  const getProviderInfo = (provider: LLMProvider) => {
    switch (provider) {
      case 'anthropic':
        return {
          name: 'Anthropic Claude',
          envVar: 'ANTHROPIC_API_KEY',
          placeholder: 'sk-ant-...',
          description: 'Get your API key from https://console.anthropic.com/',
        };
      case 'openai':
        return {
          name: 'OpenAI',
          envVar: 'OPENAI_API_KEY',
          placeholder: 'sk-...',
          description: 'Get your API key from https://platform.openai.com/api-keys',
        };
      case 'grok':
        return {
          name: 'Grok (X.AI)',
          envVar: 'GROK_API_KEY',
          placeholder: 'xai-...',
          description: 'Get your API key from https://console.x.ai/',
        };
      default:
        return {
          name: (provider as string).toUpperCase(),
          envVar: `${(provider as string).toUpperCase()}_API_KEY`,
          placeholder: 'Enter API key...',
          description: 'Enter your API key for this provider',
        };
    }
  };

  const providerInfo = getProviderInfo(provider);

  useInput((inputChar, key) => {
    if (isSubmitting) return;

    if (key.ctrl && inputChar === 'c') {
      exit();
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.tab) {
      setSaveKey(!saveKey);
      return;
    }

    if (key.return) {
      handleSubmit();
      return;
    }

    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      setError('');
      return;
    }

    if (inputChar && !key.ctrl && !key.meta) {
      setInput(prev => prev + inputChar);
      setError('');
    }
  });

  const handleSubmit = async () => {
    if (!input.trim()) {
      setError('API key cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(input.trim(), saveKey);
    } catch (error: any) {
      setError(error.message || 'Invalid API key');
      setIsSubmitting(false);
    }
  };

  const displayText = input.length > 0 ? 
    (isSubmitting ? '*'.repeat(input.length) : '*'.repeat(input.length) + '█') : 
    (isSubmitting ? ' ' : '█');

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        🔑 {providerInfo.name} API Key Required
      </Text>
      
      <Box marginTop={1} marginBottom={1}>
        <Text color="gray">{providerInfo.description}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="yellow">Environment variable: {providerInfo.envVar}</Text>
      </Box>
      
      <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1}>
        <Text color="gray">❯ </Text>
        <Text>{displayText}</Text>
      </Box>

      {error ? (
        <Box marginBottom={1}>
          <Text color="red">❌ {error}</Text>
        </Box>
      ) : null}

      <Box marginBottom={1}>
        <Text color={saveKey ? 'green' : 'gray'}>
          {saveKey ? '✓' : '○'} Save API key to ~/.juriko/user-settings.json
        </Text>
        <Text color="gray"> (Press Tab to toggle)</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="gray" dimColor>• Press Enter to submit</Text>
        <Text color="gray" dimColor>• Press Tab to toggle save option</Text>
        <Text color="gray" dimColor>• Press Esc to go back</Text>
        <Text color="gray" dimColor>• Press Ctrl+C to exit</Text>
      </Box>

      {isSubmitting ? (
        <Box marginTop={1}>
          <Text color="yellow">🔄 Validating API key...</Text>
        </Box>
      ) : null}
    </Box>
  );
};

export default MultiProviderApiKeyInput;