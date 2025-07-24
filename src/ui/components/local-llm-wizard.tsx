import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface LocalLLMWizardProps {
  onSubmit: (config: { baseURL: string; modelName: string; apiKey: string; saveConfig: boolean }) => Promise<void>;
  onCancel: () => void;
}

export const LocalLLMWizard: React.FC<LocalLLMWizardProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [step, setStep] = useState<'url' | 'model' | 'apikey' | 'save'>('url');
  const [baseURL, setBaseURL] = useState('http://localhost:1234/v1');
  const [modelName, setModelName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saveConfig, setSaveConfig] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { exit } = useApp();

  const [urlInput, setUrlInput] = useState('http://localhost:1234/v1');
  const [modelInput, setModelInput] = useState('');
  const [keyInput, setKeyInput] = useState('');

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

    if (step === 'url') {
      if (key.return) {
        if (!urlInput.trim()) {
          setError('Base URL cannot be empty');
          return;
        }
        setBaseURL(urlInput.trim());
        setStep('model');
        setError('');
        return;
      }

      if (key.backspace || key.delete) {
        setUrlInput(prev => prev.slice(0, -1));
        setError('');
        return;
      }

      if (inputChar && !key.ctrl && !key.meta) {
        setUrlInput(prev => prev + inputChar);
        setError('');
      }
    } else if (step === 'model') {
      if (key.return) {
        if (!modelInput.trim()) {
          setError('Model name cannot be empty');
          return;
        }
        setModelName(modelInput.trim());
        setStep('apikey');
        setError('');
        return;
      }

      if (key.leftArrow) {
        setStep('url');
        return;
      }

      if (key.backspace || key.delete) {
        setModelInput(prev => prev.slice(0, -1));
        setError('');
        return;
      }

      if (inputChar && !key.ctrl && !key.meta) {
        setModelInput(prev => prev + inputChar);
        setError('');
      }
    } else if (step === 'apikey') {
      if (key.return) {
        setApiKey(keyInput.trim());
        setStep('save');
        setError('');
        return;
      }

      if (key.leftArrow) {
        setStep('url');
        return;
      }

      if (key.backspace || key.delete) {
        setKeyInput(prev => prev.slice(0, -1));
        setError('');
        return;
      }

      if (inputChar && !key.ctrl && !key.meta) {
        setKeyInput(prev => prev + inputChar);
        setError('');
      }
    } else if (step === 'save') {
      if (key.tab) {
        setSaveConfig(!saveConfig);
        return;
      }

      if (key.return) {
        handleSubmit();
        return;
      }

      if (key.leftArrow) {
        setStep('model');
        return;
      }
    }
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        baseURL,
        modelName,
        apiKey,
        saveConfig,
      });
    } catch (error: any) {
      setError(error.message || 'Configuration failed');
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'url':
        return (
          <Box flexDirection="column">
            <Text bold color="yellow">Step 1: Base URL</Text>
            <Box marginTop={1} marginBottom={1}>
              <Text color="gray">
                Enter the base URL for your local LLM server:
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text color="gray">
                Common examples:
              </Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="cyan">• http://localhost:1234/v1 (LM Studio)</Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="cyan">• http://localhost:11434/v1 (Ollama)</Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="cyan">• http://localhost:8080/v1 (llama.cpp)</Text>
            </Box>
            
            <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1}>
              <Text color="gray">❯ </Text>
              <Text>{urlInput}█</Text>
            </Box>

            {error ? (
              <Box marginBottom={1}>
                <Text color="red">❌ {error}</Text>
              </Box>
            ) : null}

            <Box flexDirection="column" marginTop={1}>
              <Text color="gray" dimColor>• Press Enter to continue</Text>
              <Text color="gray" dimColor>• Press Esc to cancel</Text>
            </Box>
          </Box>
        );

      case 'model':
        return (
          <Box flexDirection="column">
            <Text bold color="yellow">Step 2: Model Name</Text>
            <Box marginTop={1} marginBottom={1}>
              <Text color="gray">
                Enter the model name for your local LLM:
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text color="gray">
                Common examples:
              </Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="cyan">• llama-3.2-3b-instruct</Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="cyan">• qwen2.5-coder-7b-instruct</Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="cyan">• deepseek-coder-6.7b-instruct</Text>
            </Box>
            
            <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1}>
              <Text color="gray">❯ </Text>
              <Text>{modelInput}█</Text>
            </Box>

            {error ? (
              <Box marginBottom={1}>
                <Text color="red">❌ {error}</Text>
              </Box>
            ) : null}

            <Box flexDirection="column" marginTop={1}>
              <Text color="gray" dimColor>• Press Enter to continue</Text>
              <Text color="gray" dimColor>• Press ← to go back</Text>
              <Text color="gray" dimColor>• Press Esc to cancel</Text>
            </Box>
          </Box>
        );

      case 'apikey':
        return (
          <Box flexDirection="column">
            <Text bold color="yellow">Step 3: API Key (Optional)</Text>
            <Box marginTop={1} marginBottom={1}>
              <Text color="gray">
                Enter API key if your local LLM requires authentication:
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text color="gray">
                Leave empty if no authentication is required (most local setups)
              </Text>
            </Box>
            
            <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1}>
              <Text color="gray">❯ </Text>
              <Text>
                {keyInput.length > 0 ? '*'.repeat(keyInput.length) + '█' : '█'}
              </Text>
            </Box>

            {error ? (
              <Box marginBottom={1}>
                <Text color="red">❌ {error}</Text>
              </Box>
            ) : null}

            <Box flexDirection="column" marginTop={1}>
              <Text color="gray" dimColor>• Press Enter to continue</Text>
              <Text color="gray" dimColor>• Press ← to go back</Text>
              <Text color="gray" dimColor>• Press Esc to cancel</Text>
            </Box>
          </Box>
        );

      case 'save':
        return (
          <Box flexDirection="column">
            <Text bold color="yellow">Step 4: Save Configuration</Text>
            <Box marginTop={1} marginBottom={1}>
              <Text color="gray">Configuration Summary:</Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="cyan">Base URL: {baseURL}</Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="cyan">Model Name: {modelName}</Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="cyan">
                API Key: {apiKey ? '*'.repeat(apiKey.length) : '(none)'}
              </Text>
            </Box>

            <Box marginTop={1} marginBottom={1}>
              <Text color={saveConfig ? 'green' : 'gray'}>
                {saveConfig ? '✓' : '○'} Save configuration to ~/.juriko/user-settings.json
              </Text>
              <Text color="gray"> (Press Tab to toggle)</Text>
            </Box>

            {error ? (
              <Box marginBottom={1}>
                <Text color="red">❌ {error}</Text>
              </Box>
            ) : null}

            <Box flexDirection="column" marginTop={1}>
              <Text color="gray" dimColor>• Press Enter to save and continue</Text>
              <Text color="gray" dimColor>• Press Tab to toggle save option</Text>
              <Text color="gray" dimColor>• Press ← to go back</Text>
              <Text color="gray" dimColor>• Press Esc to cancel</Text>
            </Box>
          </Box>
        );
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        🏠 Local LLM Configuration Wizard
      </Text>
      <Text color="gray">
        Configure your local LLM server connection
      </Text>
      <Box marginTop={1} />

      {renderStep()}

      {isSubmitting ? (
        <Box marginTop={1}>
          <Text color="yellow">🔄 Saving configuration...</Text>
        </Box>
      ) : null}
    </Box>
  );
};

export default LocalLLMWizard;