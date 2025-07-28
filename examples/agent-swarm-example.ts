#!/usr/bin/env node

/**
 * JURIKO Agent Swarm Example
 * 
 * This example demonstrates how to use the JURIKO Agent Orchestration System
 * to execute complex tasks using multiple specialized agents.
 */

import { LLMClient } from '../src/llm/client';
import { JurikoSwarm } from '../src/juriko-swarm';

async function main() {
  console.log('🤖 JURIKO Agent Swarm Example\n');

  // Initialize LLM client (you'll need to configure this with your API keys)
  const llmClient = new LLMClient({
    provider: 'anthropic', // or 'openai', 'grok', 'local'
    // Add your configuration here
  });

  // Initialize the swarm
  const swarm = new JurikoSwarm(llmClient);

  // Set up event listeners to monitor swarm activity
  swarm['swarm'].on('swarm_event', (event) => {
    switch (event.type) {
      case 'task_created':
        console.log(`📝 Task created: ${event.taskId}`);
        break;
      case 'task_assigned':
        console.log(`👤 Task ${event.taskId} assigned to ${event.agentId}`);
        break;
      case 'task_completed':
        console.log(`✅ Task ${event.taskId} completed successfully`);
        break;
      case 'task_failed':
        console.log(`❌ Task ${event.taskId} failed: ${event.data?.result?.error}`);
        break;
      case 'swarm_overloaded':
        console.log(`⚠️  Swarm is overloaded - tasks are being queued`);
        break;
    }
  });

  try {
    // Example 1: Simple coding task
    console.log('Example 1: Simple Coding Task');
    console.log('============================');
    
    const result1 = await swarm.executeTaskAndWait(
      "Create a TypeScript utility function that validates email addresses with proper error handling and unit tests",
      {
        priority: 'high',
        capabilities: ['code_generation'],
        timeout: 120000 // 2 minutes
      }
    );

    console.log(`Result: ${result1.success ? '✅ Success' : '❌ Failed'}`);
    if (result1.success) {
      console.log(`Output: ${result1.result}`);
    } else {
      console.log(`Error: ${result1.error}`);
    }
    console.log(`Execution time: ${Math.round((result1.executionTime || 0) / 1000)}s\n`);

    // Example 2: Research task
    console.log('Example 2: Research Task');
    console.log('=======================');
    
    const result2 = await swarm.executeTaskAndWait(
      "Research the latest trends in React performance optimization for 2024 and create a comprehensive report",
      {
        priority: 'medium',
        capabilities: ['web_research', 'report_generation'],
        timeout: 180000 // 3 minutes
      }
    );

    console.log(`Result: ${result2.success ? '✅ Success' : '❌ Failed'}`);
    if (result2.success) {
      console.log(`Output: ${result2.result}`);
    } else {
      console.log(`Error: ${result2.error}`);
    }
    console.log(`Execution time: ${Math.round((result2.executionTime || 0) / 1000)}s\n`);

    // Example 3: Complex multi-agent task
    console.log('Example 3: Complex Multi-Agent Task');
    console.log('==================================');
    
    const result3 = await swarm.executeTaskAndWait(
      "Build a complete REST API for a blog system with user authentication, CRUD operations for posts, comprehensive error handling, and full documentation including API docs and README",
      {
        priority: 'critical',
        context: {
          technologies: ['Node.js', 'Express', 'TypeScript', 'JWT'],
          features: ['Authentication', 'CRUD operations', 'Error handling', 'Documentation'],
          database: 'In-memory for demo'
        },
        timeout: 600000 // 10 minutes
      }
    );

    console.log(`Result: ${result3.success ? '✅ Success' : '❌ Failed'}`);
    if (result3.success) {
      console.log(`Output: ${result3.result}`);
    } else {
      console.log(`Error: ${result3.error}`);
    }
    console.log(`Execution time: ${Math.round((result3.executionTime || 0) / 1000)}s\n`);

    // Show final swarm status
    console.log('Final Swarm Status');
    console.log('==================');
    const finalStatus = swarm.getSwarmStatus();
    console.log(`Active Tasks: ${finalStatus.activeTasks}`);
    console.log(`Completed Tasks: ${finalStatus.completedTasks}`);
    console.log(`Agents: ${finalStatus.agents.length}`);
    
    console.log('\nAgent Performance:');
    finalStatus.agents.forEach(agent => {
      console.log(`• ${agent.name}: ${agent.completedTasks} tasks, ${Math.round(agent.successRate * 100)}% success rate`);
    });

    // Show completed tasks summary
    console.log('\nCompleted Tasks Summary:');
    const completedTasks = swarm.getCompletedTasks();
    completedTasks.forEach(task => {
      console.log(`• ${task.id}: ${task.success ? '✅' : '❌'} ${task.description.substring(0, 50)}...`);
      if (task.executionTime) {
        console.log(`  Execution time: ${Math.round(task.executionTime / 1000)}s`);
      }
    });

  } catch (error) {
    console.error('Error running swarm example:', error);
  } finally {
    // Gracefully shutdown the swarm
    console.log('\n🛑 Shutting down swarm...');
    await swarm.shutdown();
    console.log('✅ Swarm shutdown complete');
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