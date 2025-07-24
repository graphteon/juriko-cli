import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SimpleLoadingSpinner from './simple-loading-spinner';
import { mcpManager } from '../../mcp';
import { logger } from '../../utils/logger';

interface MCPLoadingProps {
  onComplete: () => void;
  onError: (error: string) => void;
}

interface LoadingState {
  phase: 'initializing' | 'loading-settings' | 'connecting' | 'loading-tools' | 'complete' | 'error';
  message: string;
  progress: {
    current: number;
    total: number;
    serverName?: string;
  };
  error?: string;
}

export default function MCPLoading({ onComplete, onError }: MCPLoadingProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    phase: 'initializing',
    message: 'Initializing MCP system...',
    progress: { current: 0, total: 1 }
  });

  useEffect(() => {
    let isMounted = true;
    const initializeMCP = async () => {
      try {
        // Phase 1: Loading settings
        if (isMounted) {
          setLoadingState({
            phase: 'loading-settings',
            message: 'Loading MCP settings...',
            progress: { current: 1, total: 4 }
          });
        }

        // Get enabled servers count for progress tracking
        const { mcpSettingsManager } = await import('../../mcp/settings-manager');
        const enabledServers = mcpSettingsManager.getEnabledServers();
        const totalSteps = enabledServers.length > 0 ? 4 : 2; // Adjust total based on whether we have servers

        if (enabledServers.length === 0) {
          if (isMounted) {
            setLoadingState({
              phase: 'complete',
              message: 'No MCP servers configured - ready to start',
              progress: { current: 2, total: 2 }
            });
          }
          
          setTimeout(() => {
            if (isMounted) onComplete();
          }, 1000);
          return;
        }

        // Phase 2: Connecting to servers
        if (isMounted) {
          setLoadingState({
            phase: 'connecting',
            message: `Connecting to ${enabledServers.length} MCP server${enabledServers.length > 1 ? 's' : ''}...`,
            progress: { current: 2, total: totalSteps }
          });
        }

        // Initialize MCP system
        await mcpManager.initialize();

        // Get connection status to show how many servers connected
        const connectionStatuses = mcpManager.getConnectionStatuses();
        const connectedCount = connectionStatuses.filter(status => status.connected).length;

        // Phase 3: Loading tools
        if (isMounted) {
          setLoadingState({
            phase: 'loading-tools',
            message: 'Loading MCP tools...',
            progress: { current: 3, total: totalSteps }
          });
        }

        // Phase 4: Complete
        if (isMounted) {
          setLoadingState({
            phase: 'complete',
            message: `MCP system ready - ${connectedCount} server${connectedCount !== 1 ? 's' : ''} connected`,
            progress: { current: totalSteps, total: totalSteps }
          });
        }

        // Wait a moment to show completion, then proceed
        setTimeout(() => {
          if (isMounted) onComplete();
        }, 1500);

      } catch (error: any) {
        logger.error('Failed to initialize MCP system:', error);
        
        if (isMounted) {
          setLoadingState({
            phase: 'error',
            message: 'Failed to initialize MCP system',
            progress: { current: 0, total: 4 },
            error: error.message
          });
        }

        // Still proceed after error, but with a delay to show the error
        setTimeout(() => {
          if (isMounted) onError(error.message);
        }, 2000);
      }
    };

    initializeMCP();

    return () => {
      isMounted = false;
    };
  }, [onComplete, onError]);

  const getProgressPercentage = () => {
    return Math.round((loadingState.progress.current / loadingState.progress.total) * 100);
  };

  const renderProgressBar = () => {
    const percentage = getProgressPercentage();
    const barWidth = 30;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    
    return (
      <Box>
        <Text color="cyan">[</Text>
        <Text color="green">{'█'.repeat(filledWidth)}</Text>
        <Text color="gray">{'░'.repeat(emptyWidth)}</Text>
        <Text color="cyan">] {percentage}%</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🔧 JURIKO - Initializing MCP System
        </Text>
      </Box>
      
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <SimpleLoadingSpinner />
          <Text> {loadingState.message}</Text>
        </Box>
        
        {loadingState.progress.serverName && (
          <Box marginLeft={2} marginBottom={1}>
            <Text color="yellow">→ {loadingState.progress.serverName}</Text>
          </Box>
        )}
        
        <Box marginBottom={1}>
          {renderProgressBar()}
        </Box>
        
        <Box>
          <Text color="gray">
            Step {loadingState.progress.current} of {loadingState.progress.total}
          </Text>
        </Box>
      </Box>

      {loadingState.phase === 'error' && loadingState.error && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">❌ Error: {loadingState.error}</Text>
          <Text color="yellow">Continuing without MCP...</Text>
        </Box>
      )}

      {loadingState.phase === 'complete' && (
        <Box marginTop={1}>
          <Text color="green">✅ MCP system initialized successfully!</Text>
        </Box>
      )}
    </Box>
  );
}