import React from 'react';
import { Box, Text } from 'ink';
import { getProjectInfo, getModelDisplayName } from '../../utils/project-info';

interface StatusBarProps {
  provider: string;
  model: string;
}

export default function StatusBar({ provider, model }: StatusBarProps) {
  const projectInfo = getProjectInfo();
  const modelDisplay = getModelDisplayName(provider, model);
  
  return (
    <Box
      width="100%"
      justifyContent="space-between"
      paddingX={0.5}
      borderStyle="single"
      borderColor="gray"
    >
      <Box>
        <Text color="cyan">{projectInfo.projectPath}</Text>
      </Box>
      
      <Box>
        <Text color="red">{projectInfo.sandboxStatus}</Text>
        <Text color="gray"> (see /docs)</Text>
      </Box>
      
      <Box>
        <Text color="cyan">{modelDisplay}</Text>
      </Box>
    </Box>
  );
}