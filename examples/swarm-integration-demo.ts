#!/usr/bin/env node

/**
 * JURIKO Agent Swarm Integration Demo
 * 
 * This example demonstrates the integrated swarm functionality in the main JURIKO CLI.
 * It shows how the swarm system works seamlessly with the regular JURIKO interface.
 */

import { LLMClient } from '../src/llm/client';
import { JurikoWithSwarm } from '../src/juriko-with-swarm';

async function main() {
  console.log('🤖 JURIKO Agent Swarm Integration Demo\n');

  // Initialize LLM client (configure with your API keys)
  const llmClient = new LLMClient({
    provider: 'anthropic', // or 'openai', 'grok', 'local'
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here',
    // Add your configuration here
  });

  // Initialize JURIKO with Swarm integration
  const juriko = new JurikoWithSwarm(llmClient);

  console.log('🔧 JURIKO with Agent Swarm initialized successfully!\n');

  try {
    // Example 1: Regular JURIKO task (no swarm needed)
    console.log('Example 1: Simple Task (Regular JURIKO)');
    console.log('==========================================');
    
    const simpleTask = "What is the current time?";
    console.log(`Task: ${simpleTask}`);
    
    const result1 = await juriko.processUserMessage(simpleTask);
    console.log('Result:', result1[0]?.content || 'No response');
    console.log('✅ Handled by regular JURIKO (no swarm activation)\n');

    // Example 2: Complex task that triggers swarm automatically
    console.log('Example 2: Complex Task (Automatic Swarm Activation)');
    console.log('===================================================');
    
    const complexTask = "Create a complete web application with user authentication, database integration, and comprehensive testing";
    console.log(`Task: ${complexTask}`);
    
    const result2 = await juriko.processUserMessage(complexTask);
    console.log('Result:', result2[0]?.content || 'No response');
    console.log('✅ Automatically handled by Agent Swarm\n');

    // Example 3: Explicit swarm command
    console.log('Example 3: Explicit Swarm Command');
    console.log('=================================');
    
    const swarmTask = "swarm research modern React patterns and implement a component library with TypeScript";
    console.log(`Task: ${swarmTask}`);
    
    const result3 = await juriko.processUserMessage(swarmTask);
    console.log('Result:', result3[0]?.content || 'No response');
    console.log('✅ Explicitly handled by Agent Swarm\n');

    // Show swarm status
    console.log('Current Swarm Status:');
    console.log('====================');
    const swarmStatus = await juriko.getSwarmStatus();
    console.log(`Running: ${swarmStatus.isRunning ? '✅' : '❌'}`);
    console.log(`Active Tasks: ${swarmStatus.activeTasks}`);
    console.log(`Completed Tasks: ${swarmStatus.completedTasks}`);
    console.log(`Registered Agents: ${swarmStatus.agents.length}`);
    
    console.log('\nAgent Details:');
    swarmStatus.agents.forEach(agent => {
      console.log(`• ${agent.name}: ${agent.status} (${agent.currentTasks} active, ${agent.completedTasks} completed, ${Math.round(agent.successRate * 100)}% success)`);
    });

    // Show completed tasks
    console.log('\nCompleted Tasks:');
    console.log('================');
    const completedTasks = await juriko.getCompletedTasks();
    completedTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.description.substring(0, 60)}...`);
      console.log(`   Status: ${task.success ? '✅ Success' : '❌ Failed'}`);
      if (task.executionTime) {
        console.log(`   Execution time: ${Math.round(task.executionTime / 1000)}s`);
      }
      console.log(`   Agent: ${task.assignedAgent || 'Unknown'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error in demo:', error);
  } finally {
    // Gracefully shutdown
    console.log('🛑 Shutting down JURIKO with Swarm...');
    await juriko.shutdown();
    console.log('✅ Shutdown complete');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}