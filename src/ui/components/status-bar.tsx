import React from 'react';
import { Box, Text } from 'ink';
import { getProjectInfo, getModelDisplayName } from '../../utils/project-info';

interface StatusBarProps {
  provider: string;
  model: string;
  tokenCount?: number;
}

export default function StatusBar({ provider, model, tokenCount = 0 }: StatusBarProps) {
  const projectInfo = getProjectInfo();
  const modelDisplay = getModelDisplayName(provider, model);
  
  return (
    <Box
      width="100%"
      justifyContent="space-between"
      paddingX={1}
      borderStyle="single"
      borderColor="gray"
    >
      <Box>
        <Text color="cyan">{projectInfo.projectPath}</Text>
      </Box>
      
      <Box>
        <Text color="green">Tokens: {tokenCount}</Text>
      </Box>
      
      <Box>
        <Text color="cyan">{modelDisplay}</Text>
      </Box>
    </Box>
  );
}