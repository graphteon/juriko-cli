import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface EnhancedLoadingSpinnerProps {
  isActive: boolean;
  processingTime: number;
  tokenCount: number;
  message?: string;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const PROCESSING_MESSAGES = [
  'Thinking...',
  'Processing your request...',
  'Working on it...',
  'Analyzing...',
  'Computing...',
  'Almost there...',
];

export function EnhancedLoadingSpinner({ 
  isActive, 
  processingTime, 
  tokenCount, 
  message 
}: EnhancedLoadingSpinnerProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const spinnerInterval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 100);

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PROCESSING_MESSAGES.length);
    }, 2000);

    return () => {
      clearInterval(spinnerInterval);
      clearInterval(messageInterval);
    };
  }, [isActive]);

  if (!isActive) return null;

  const currentMessage = message || PROCESSING_MESSAGES[messageIndex];
  const timeDisplay = processingTime > 0 ? `${processingTime}s` : '';
  const tokenDisplay = tokenCount > 0 ? `${tokenCount} tokens` : '';

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text color="cyan">{SPINNER_FRAMES[frameIndex]} </Text>
        <Text color="yellow">{currentMessage}</Text>
        {timeDisplay && (
          <Text color="gray"> ({timeDisplay})</Text>
        )}
        {tokenDisplay && (
          <Text color="blue"> • {tokenDisplay}</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press 's' to stop • ESC to cancel • Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  );
}