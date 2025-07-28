import React, { useState, useEffect } from 'react';
import { Box, Text, Newline } from 'ink';
import { LLMClient } from '../../llm/client';
import { JurikoSwarm } from '../../juriko-swarm';

interface SwarmUIProps {
  llmClient: LLMClient;
  userInput: string;
}

export const SwarmUI: React.FC<SwarmUIProps> = ({ llmClient, userInput }) => {
  const [swarm] = useState(() => new JurikoSwarm(llmClient));
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [swarmStatus, setSwarmStatus] = useState<any>(null);

  useEffect(() => {
    if (userInput && !loading) {
      executeSwarmTask(userInput);
    }
  }, [userInput]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSwarmStatus(swarm.getSwarmStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [swarm]);

  const executeSwarmTask = async (input: string) => {
    setLoading(true);
    setResult(null);

    try {
      // Check if this is a swarm command
      if (input.toLowerCase().startsWith('swarm ')) {
        const taskDescription = input.substring(6);
        
        const newTaskId = await swarm.executeTask(taskDescription, {
          priority: 'high'
        });
        
        setTaskId(newTaskId);

        // Wait for completion
        const taskResult = await swarm.executeTaskAndWait(taskDescription, {
          timeout: 300000 // 5 minutes
        });

        setResult(taskResult);
      } else {
        // Regular JURIKO processing - you might want to integrate this differently
        setResult({
          success: false,
          error: 'Use "swarm <task>" to execute tasks with the agent orchestration system'
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (!userInput) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">🤖 JURIKO Agent Swarm Ready</Text>
        <Newline />
        <Text color="gray">Use "swarm &lt;task&gt;" to execute tasks with agent orchestration</Text>
        <Text color="gray">Example: swarm create a todo app with React and TypeScript</Text>
        {swarmStatus && (
          <>
            <Newline />
            <Text color="blue">Swarm Status:</Text>
            <Text>• Active Tasks: {swarmStatus.activeTasks}</Text>
            <Text>• Pending Tasks: {swarmStatus.pendingTasks}</Text>
            <Text>• Agents: {swarmStatus.agents.length}</Text>
          </>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {loading && (
        <>
          <Text color="yellow">🔄 Executing task with agent swarm...</Text>
          {taskId && <Text color="gray">Task ID: {taskId}</Text>}
          <Newline />
        </>
      )}

      {result && (
        <Box flexDirection="column">
          {result.success ? (
            <>
              <Text color="green">✅ Task completed successfully!</Text>
              <Newline />
              <Text>{result.result}</Text>
              {result.executionTime && (
                <Text color="gray">Execution time: {Math.round(result.executionTime / 1000)}s</Text>
              )}
            </>
          ) : (
            <>
              <Text color="red">❌ Task failed</Text>
              <Newline />
              <Text color="red">{result.error}</Text>
            </>
          )}
        </Box>
      )}

      {swarmStatus && !loading && (
        <>
          <Newline />
          <Box flexDirection="column">
            <Text color="blue">Agent Swarm Status:</Text>
            <Text>• Running: {swarmStatus.isRunning ? '✅' : '❌'}</Text>
            <Text>• Active Tasks: {swarmStatus.activeTasks}</Text>
            <Text>• Pending Tasks: {swarmStatus.pendingTasks}</Text>
            <Text>• Completed Tasks: {swarmStatus.completedTasks}</Text>
            <Newline />
            
            <Text color="blue">Agents:</Text>
            {swarmStatus.agents.map((agent: any) => (
              <Text key={agent.id}>
                • {agent.name}: {agent.status} 
                ({agent.currentTasks} active, {agent.completedTasks} completed, 
                {Math.round(agent.successRate * 100)}% success)
              </Text>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};