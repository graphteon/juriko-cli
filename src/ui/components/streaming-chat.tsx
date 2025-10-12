import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MultiLLMAgent, ChatEntry, StreamingChunk } from '../../agent/multi-llm-agent';
import { LLMToolCall } from '../../llm/types';
import { ToolResult } from '../../types';
import ToolCallBox from './tool-call-box';
import { ConfirmationService, ConfirmationOptions } from '../../utils/confirmation-service';
import ConfirmationDialog from './confirmation-dialog';
import { SettingsMenu } from './settings-menu';
import { ScrollContainer } from './scroll-container';
import { logger } from '../../utils/logger';
import { MarkdownRenderer } from '../utils/markdown-renderer';

interface StreamingChatProps {
  agent: MultiLLMAgent;
  onProviderSwitch: () => void;
  onTokenCountChange?: (count: number) => void;
}

interface ChatMessage {
  type: 'user' | 'assistant' | 'tool_calls' | 'tool_results';
  content?: string;
  toolCalls?: LLMToolCall[];
  toolResults?: Array<{ toolCall: LLMToolCall; result: ToolResult }>;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function StreamingChat({ agent, onProviderSwitch, onTokenCountChange }: StreamingChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [confirmationOptions, setConfirmationOptions] = useState<ConfirmationOptions | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { exit } = useApp();
  const isMountedRef = useRef(true);
  const contentBufferRef = useRef('');
  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRenderTimeRef = useRef(0);
  const scrollPositionRef = useRef(0);
  
  // Constants for performance optimization
  const MAX_VISIBLE_MESSAGES = 50; // Limit visible messages to prevent performance issues
  const CONTENT_UPDATE_DELAY = 100; // Increased delay to reduce blinking
  const MIN_RENDER_INTERVAL = 16; // ~60fps limit for renders
  
  const confirmationService = ConfirmationService.getInstance();

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear any pending timeouts
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
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

  // Handle token count changes
  useEffect(() => {
    if (onTokenCountChange) {
      onTokenCountChange(tokenCount);
    }
  }, [tokenCount, onTokenCountChange]);

  // Load existing chat history from agent when component mounts
  useEffect(() => {
    const loadChatHistory = () => {
      const agentHistory = agent.getChatHistory();
      if (agentHistory.length > 0) {
        // Convert agent's ChatEntry[] to our ChatMessage[] format
        const convertedMessages: ChatMessage[] = agentHistory.map(entry => ({
          type: entry.type === 'tool_call' || entry.type === 'tool_result' ? 'tool_calls' : entry.type,
          content: entry.content,
          toolCalls: entry.toolCalls,
          timestamp: entry.timestamp,
          isStreaming: entry.isStreaming
        }));
        setMessages(convertedMessages);
      }
    };

    loadChatHistory();
  }, [agent]);

  const handleConfirmation = (dontAskAgain?: boolean) => {
    confirmationService.confirmOperation(true, dontAskAgain);
    setConfirmationOptions(null);
  };

  const handleRejection = (feedback?: string) => {
    confirmationService.rejectOperation(feedback);
    setConfirmationOptions(null);
  };

  useInput(async (inputChar: string, key: any) => {
    if (!isMountedRef.current || confirmationOptions || showSettings) return;

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

    // Handle 's' key to stop conversation
    if (inputChar === 's' && !key.ctrl && !key.meta && !key.alt) {
      if (isProcessing) {
        agent.abortCurrentOperation();
        setIsProcessing(false);
        setTokenCount(0);
        
        // Add a message to indicate the operation was stopped
        const stopMessage: ChatMessage = {
          type: 'assistant',
          content: '⏹️ Operation stopped by user (pressed \'s\')',
          timestamp: new Date()
        };
        if (isMountedRef.current) {
          setMessages(prev => [...prev, stopMessage]);
        }
        return;
      }
    }

    // Don't handle other input if processing
    if (isProcessing) return;

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

      // Handle /clear command to clear chat history
      if (input.trim() === '/clear' || input.trim() === 'clear') {
        setMessages([]);
        // Also clear agent's internal chat history
        const agentHistory = agent.getChatHistory();
        agentHistory.length = 0;
        if (isMountedRef.current) {
          setInput('');
          // Add confirmation message
          const clearMessage: ChatMessage = {
            type: 'assistant',
            content: '🗑️ Chat history cleared',
            timestamp: new Date()
          };
          setMessages([clearMessage]);
        }
        return;
      }

      // Handle /settings command to open settings menu
      if (input.trim() === '/settings' || input.trim() === 'settings') {
        setShowSettings(true);
        if (isMountedRef.current) {
          setInput('');
        }
        return;
      }

      // Handle /history command to show chat history info
      if (input.trim() === '/history' || input.trim() === 'history') {
        const agentHistory = agent.getChatHistory();
        const historyInfo: ChatMessage = {
          type: 'assistant',
          content: `📜 Chat History Info:
          
Total messages: ${agentHistory.length}
Current session messages: ${messages.length}

Commands:
- /clear or clear - Clear chat history
- /history or history - Show this info
- /settings or settings - Open settings menu
- Type normally to continue chatting

The chat history is automatically saved and will persist between sessions.`,
          timestamp: new Date()
        };
        if (isMountedRef.current) {
          setMessages(prev => [...prev, historyInfo]);
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
      let streamingMessage: ChatMessage | null = null;

      for await (const chunk of agent.processUserMessageStream(message)) {
        if (!isMountedRef.current) return;

        switch (chunk.type) {
          case "content":
            if (chunk.content) {
              if (!streamingMessage) {
                // Create new streaming message
                const newStreamingMessage: ChatMessage = {
                  type: 'assistant',
                  content: chunk.content,
                  timestamp: new Date(),
                  isStreaming: true
                };
                setMessages(prev => [...prev, newStreamingMessage]);
                streamingMessage = newStreamingMessage;
                contentBufferRef.current = chunk.content;
              } else {
                // Buffer content updates to reduce blinking
                contentBufferRef.current += chunk.content;
                
                // Clear existing timeout
                if (contentUpdateTimeoutRef.current) {
                  clearTimeout(contentUpdateTimeoutRef.current);
                }
                
                // Throttle content updates with frame rate limiting
                const now = Date.now();
                if (now - lastRenderTimeRef.current >= MIN_RENDER_INTERVAL) {
                  // Update immediately if enough time has passed
                  lastRenderTimeRef.current = now;
                  if (isMountedRef.current) {
                    setMessages(prev =>
                      prev.map((msg, idx) =>
                        idx === prev.length - 1 && msg.isStreaming
                          ? { ...msg, content: contentBufferRef.current }
                          : msg
                      )
                    );
                  }
                } else {
                  // Debounce content updates with increased delay
                  contentUpdateTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                      lastRenderTimeRef.current = Date.now();
                      setMessages(prev =>
                        prev.map((msg, idx) =>
                          idx === prev.length - 1 && msg.isStreaming
                            ? { ...msg, content: contentBufferRef.current }
                            : msg
                        )
                      );
                    }
                  }, CONTENT_UPDATE_DELAY);
                }
              }
            }
            break;

          case "token_count":
            if (chunk.tokenCount !== undefined) {
              // Update token count accurately without throttling
              setTokenCount(chunk.tokenCount);
            }
            break;

          case "tool_calls":
            if (chunk.toolCalls) {
              // Stop streaming for the current assistant message
              if (streamingMessage) {
                setMessages(prev =>
                  prev.map((msg) =>
                    msg.isStreaming
                      ? {
                          ...msg,
                          isStreaming: false,
                          toolCalls: chunk.toolCalls,
                        }
                      : msg
                  )
                );
                streamingMessage = null;
              }

              // Add tool calls message
              const toolCallsMessage: ChatMessage = {
                type: 'tool_calls',
                toolCalls: chunk.toolCalls,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, toolCallsMessage]);
            }
            break;

          case "tool_result":
            if (chunk.toolCall && chunk.toolResult) {
              // Update the corresponding tool call with result
              setMessages(prev => prev.map(msg => {
                if (msg.type === 'tool_calls' && msg.toolCalls) {
                  const updatedToolCalls = msg.toolCalls.map(tc =>
                    tc.id === chunk.toolCall?.id ? { ...tc, result: chunk.toolResult } : tc
                  );
                  return { ...msg, toolCalls: updatedToolCalls };
                }
                return msg;
              }));
            }
            break;

          case "done":
            // Clear any pending content updates
            if (contentUpdateTimeoutRef.current) {
              clearTimeout(contentUpdateTimeoutRef.current);
              contentUpdateTimeoutRef.current = null;
            }
            
            if (streamingMessage) {
              // Final content update with buffered content
              setMessages(prev =>
                prev.map((msg) =>
                  msg.isStreaming ? {
                    ...msg,
                    content: contentBufferRef.current,
                    isStreaming: false
                  } : msg
                )
              );
              streamingMessage = null;
              contentBufferRef.current = '';
            }
            break;
        }
      }
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

  const renderMessage = useCallback((message: ChatMessage, index: number) => {
    switch (message.type) {
      case 'user':
        return (
          <Box key={`user-${index}-${message.timestamp.getTime()}`} marginBottom={1}>
            <Text color="blue">❯ </Text>
            <Text>{message.content}</Text>
          </Box>
        );

      case 'assistant':
        return (
          <Box key={`assistant-${index}-${message.timestamp.getTime()}`} flexDirection="column" marginBottom={1}>
            {message.content && (
              <Box marginLeft={2}>
                <MarkdownRenderer content={message.content} />
                {message.isStreaming && <Text color="white">█</Text>}
              </Box>
            )}
          </Box>
        );

      case 'tool_calls':
        return (
          <Box key={`tools-${index}-${message.timestamp.getTime()}`} flexDirection="column" marginBottom={1} width="100%">
            {message.toolCalls?.map((toolCall, tcIndex) => {
              // Find corresponding result from chat history
              const result = (toolCall as any).result;
              
              return (
                <ToolCallBox
                  key={`${index}-${tcIndex}-${toolCall.id}`}
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
  }, []);

  // Memoize visible messages to prevent unnecessary re-renders
  const visibleMessages = useMemo(() => {
    const totalMessages = messages.length;
    if (totalMessages <= MAX_VISIBLE_MESSAGES) {
      return messages;
    }
    
    // Keep the most recent messages and show a truncation indicator
    const truncatedMessages = messages.slice(-MAX_VISIBLE_MESSAGES);
    const truncationMessage: ChatMessage = {
      type: 'assistant',
      content: `... (${totalMessages - MAX_VISIBLE_MESSAGES} earlier messages hidden for performance)`,
      timestamp: new Date(0), // Use epoch time for consistent sorting
    };
    
    return [truncationMessage, ...truncatedMessages];
  }, [messages]);

  // Stable message rendering with React.memo optimization
  const MemoizedMessage = React.memo(({ message, index }: { message: ChatMessage; index: number }) => {
    return renderMessage(message, index);
  }, (prevProps, nextProps) => {
    // Only re-render if the message content actually changed
    const prevMsg = prevProps.message;
    const nextMsg = nextProps.message;
    
    return (
      prevMsg.content === nextMsg.content &&
      prevMsg.isStreaming === nextMsg.isStreaming &&
      prevMsg.type === nextMsg.type &&
      prevMsg.timestamp.getTime() === nextMsg.timestamp.getTime() &&
      JSON.stringify(prevMsg.toolCalls) === JSON.stringify(nextMsg.toolCalls)
    );
  });

  // If settings menu is active, show it instead of the chat
  if (showSettings) {
    return (
      <SettingsMenu onClose={() => setShowSettings(false)} />
    );
  }

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
        
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>Available commands: view, str_replace, create, insert, undo_edit, bash, help</Text>
          <Text dimColor>Type 'provider' to switch provider/model, '/settings' for settings, '/history' for chat history, '/clear' to clear history</Text>
          <Text dimColor>Press 's' to stop operation, ESC to cancel, Ctrl+P to switch provider/model, 'exit' or Ctrl+C to quit</Text>
        </Box>

        {/* Messages with scroll container */}
        <Box flexDirection="column" marginBottom={1} width="100%" flexGrow={1}>
          <ScrollContainer autoScroll={true} maxHeight={25}>
            {visibleMessages.map((message, index) => (
              <MemoizedMessage key={`msg-${index}-${message.timestamp.getTime()}`} message={message} index={index} />
            ))}
          </ScrollContainer>
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