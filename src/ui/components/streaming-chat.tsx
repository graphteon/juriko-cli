import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MultiLLMAgent, ChatEntry } from '../../agent/multi-llm-agent';
import { LLMToolCall } from '../../llm/types';
import { ToolResult } from '../../types';
import ToolCallBox from './tool-call-box';
import { ConfirmationService, ConfirmationOptions } from '../../utils/confirmation-service';
import ConfirmationDialog from './confirmation-dialog';

interface StreamingChatProps {
  agent: MultiLLMAgent;
  onProviderSwitch: () => void;
}

interface ChatMessage {
  type: 'user' | 'assistant' | 'tool_calls' | 'tool_results';
  content?: string;
  toolCalls?: LLMToolCall[];
  toolResults?: Array<{ toolCall: LLMToolCall; result: ToolResult }>;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function StreamingChat({ agent, onProviderSwitch }: StreamingChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [confirmationOptions, setConfirmationOptions] = useState<ConfirmationOptions | null>(null);
  const { exit } = useApp();
  const isMountedRef = useRef(true);
  
  const confirmationService = ConfirmationService.getInstance();

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle confirmation requests
  useEffect(() => {
    const handleConfirmationRequest = (options: ConfirmationOptions) => {
      setConfirmationOptions(options);
    };

    confirmationService.on('confirmation-requested', handleConfirmationRequest);

    return () => {
      confirmationService.off('confirmation-requested', handleConfirmationRequest);
    };
  }, [confirmationService]);

  const handleConfirmation = (dontAskAgain?: boolean) => {
    confirmationService.confirmOperation(true, dontAskAgain);
    setConfirmationOptions(null);
  };

  const handleRejection = (feedback?: string) => {
    confirmationService.rejectOperation(feedback);
    setConfirmationOptions(null);
  };

  useInput(async (inputChar: string, key: any) => {
    if (!isMountedRef.current || isProcessing || confirmationOptions) return;

    if (key.ctrl && inputChar === 'c') {
      if (isProcessing) {
        agent.abortCurrentOperation();
      } else {
        exit();
      }
      return;
    }

    if (key.ctrl && inputChar === 'p') {
      onProviderSwitch();
      return;
    }

    if (key.return) {
      if (input.trim() === 'exit' || input.trim() === 'quit') {
        exit();
        return;
      }

      if (input.trim() === 'provider' || input.trim() === 'switch') {
        onProviderSwitch();
        if (isMountedRef.current) {
          setInput('');
        }
        return;
      }

      if (input.trim()) {
        await processMessage(input.trim());
        if (isMountedRef.current) {
          setInput('');
        }
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (isMountedRef.current) {
        setInput(prev => prev.slice(0, -1));
      }
      return;
    }

    if (inputChar && !key.ctrl && !key.meta) {
      if (isMountedRef.current) {
        setInput(prev => prev + inputChar);
      }
    }
  });

  const processMessage = async (message: string) => {
    if (!isMountedRef.current) return;
    
    setIsProcessing(true);
    
    // Add user message
    const userMessage: ChatMessage = {
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    if (isMountedRef.current) {
      setMessages(prev => [...prev, userMessage]);
    }

    try {
      const chatEntries = await agent.processUserMessage(message);
      
      if (!isMountedRef.current) return;
      
      // Process each chat entry
      console.log('Processing chat entries:', chatEntries.length);
      chatEntries.forEach((entry: ChatEntry, index: number) => {
        if (!isMountedRef.current) return;
        
        console.log(`Entry ${index}:`, entry.type, entry.toolCalls?.length || 0, 'tool calls');
        
        switch (entry.type) {
          case 'assistant':
            if (entry.toolCalls && entry.toolCalls.length > 0) {
              // Add tool calls message
              const toolCallsMessage: ChatMessage = {
                type: 'tool_calls',
                toolCalls: entry.toolCalls,
                timestamp: entry.timestamp
              };
              console.log('Adding tool calls message:', toolCallsMessage.toolCalls.length);
              if (isMountedRef.current) {
                setMessages(prev => [...prev, toolCallsMessage]);
              }
            }
            
            if (entry.content && entry.content !== "Using tools to help you...") {
              // Add assistant response
              const assistantMessage: ChatMessage = {
                type: 'assistant',
                content: entry.content,
                timestamp: entry.timestamp
              };
              if (isMountedRef.current) {
                setMessages(prev => [...prev, assistantMessage]);
              }
            }
            break;

          case 'tool_result':
            if (entry.toolCall && entry.toolResult) {
              console.log('Processing tool result for:', entry.toolCall.function.name);
              // Update the corresponding tool call with result
              if (isMountedRef.current) {
                setMessages(prev => prev.map(msg => {
                  if (msg.type === 'tool_calls' && msg.toolCalls) {
                    const updatedToolCalls = msg.toolCalls.map(tc =>
                      tc.id === entry.toolCall?.id ? { ...tc, result: entry.toolResult } : tc
                    );
                    return { ...msg, toolCalls: updatedToolCalls };
                  }
                  return msg;
                }));
              }
            }
            break;
        }
      });
    } catch (error: any) {
      if (isMountedRef.current) {
        const errorMessage: ChatMessage = {
          type: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    }

    if (isMountedRef.current) {
      setIsProcessing(false);
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    switch (message.type) {
      case 'user':
        return (
          <Box key={index} marginBottom={1}>
            <Text color="blue">❯ </Text>
            <Text>{message.content}</Text>
          </Box>
        );

      case 'assistant':
        return (
          <Box key={index} flexDirection="column" marginBottom={1}>
            {message.content && (
              <Box marginLeft={2}>
                <Text>{message.content}</Text>
                {message.isStreaming && <Text color="white">█</Text>}
              </Box>
            )}
          </Box>
        );

      case 'tool_calls':
        return (
          <Box key={index} flexDirection="column" marginBottom={1} width="100%">
            {message.toolCalls?.map((toolCall, tcIndex) => {
              // Find corresponding result from chat history
              const result = (toolCall as any).result;
              
              return (
                <ToolCallBox
                  key={`${index}-${tcIndex}`}
                  toolCall={toolCall}
                  result={result}
                />
              );
            })}
          </Box>
        );

      default:
        return null;
    }
  };

  // If confirmation dialog is active, show it instead of the chat
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

  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Box flexDirection="column" padding={1} flexGrow={1} width="100%">
        {/* Header */}
        {/*<Box marginBottom={1}>
          <Text bold color="cyan">🔧 JURIKO CLI - Text Editor Agent</Text>
        </Box>*/}
        
        <Box marginBottom={1}>
          <Text color="green">
            Provider: {agent.getCurrentModel().toUpperCase()} | Tokens: {tokenCount}
          </Text>
        </Box>
        
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>Available commands: view, str_replace, create, insert, undo_edit, bash, help</Text>
          <Text dimColor>Type 'provider' to switch provider/model, 'help' for usage, 'exit' or Ctrl+C to quit</Text>
          <Text dimColor>Press Ctrl+P to quickly switch provider/model</Text>
        </Box>

        {/* Messages */}
        <Box flexDirection="column" marginBottom={1} width="100%">
          {messages.slice(-20).map(renderMessage)}
        </Box>

        {/* Input */}
        <Box borderStyle="round" borderColor="gray" paddingX={1} marginTop={1}>
          <Text color="cyan">❯ </Text>
          <Text>
            {input}
            {!isProcessing && <Text color="white">█</Text>}
          </Text>
          {isProcessing && <Text color="yellow"> (processing...)</Text>}
        </Box>
      </Box>
    </Box>
  );
}