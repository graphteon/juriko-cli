import React from 'react';
import { Box, Text } from 'ink';
import { LLMToolCall } from '../../llm/types';
import { ToolResult } from '../../types';

interface ToolCallBoxProps {
  toolCall: LLMToolCall;
  result?: ToolResult;
}

const truncateText = (text: string, maxLines: number = 3): string => {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }
  return lines.slice(0, maxLines).join('\n') + '\n...';
};

const getToolDisplayName = (toolName: string): string => {
  const toolNames: Record<string, string> = {
    'view_file': 'ReadFile',
    'create_file': 'CreateFile',
    'str_replace_editor': 'EditFile',
    'bash': 'RunCommand',
    'create_todo_list': 'CreateTodo',
    'update_todo_list': 'UpdateTodo'
  };
  
  return toolNames[toolName] || toolName;
};

const getToolArguments = (toolCall: LLMToolCall): string => {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    
    // Format arguments based on tool type
    switch (toolCall.function.name) {
      case 'view_file':
        return args.path;
      case 'create_file':
        return args.path;
      case 'str_replace_editor':
        return args.path;
      case 'bash':
        return args.command;
      default:
        return Object.values(args).join(' ');
    }
  } catch {
    return toolCall.function.arguments;
  }
};

export default function ToolCallBox({ toolCall, result }: ToolCallBoxProps) {
  const displayName = getToolDisplayName(toolCall.function.name);
  const arguments_ = getToolArguments(toolCall);
  const isSuccess = result?.success !== false;
  
  return (
    <Box flexDirection="column" marginY={1} width="100%">
      {/* Tool call header */}
      <Box
        borderStyle="round"
        borderColor={isSuccess ? "green" : "red"}
        paddingX={1}
        marginBottom={result?.output || result?.error ? 1 : 0}
        width="100%"
      >
        <Text color={isSuccess ? "green" : "red"}>
          {isSuccess ? "✓" : "✗"} {displayName}
        </Text>
        <Text color="gray"> {arguments_}</Text>
      </Box>
      
      {/* Tool output */}
      {(result?.output || result?.error) && (
        <Box
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
          flexDirection="column"
          width="100%"
        >
          <Text color={result?.success ? "white" : "red"}>
            {truncateText(result?.output || result?.error || '', 5)}
          </Text>
        </Box>
      )}
    </Box>
  );
}