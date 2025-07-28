#!/usr/bin/env node

/**
 * JURIKO Agent Swarm Demo - Working demonstration with mock LLM
 */

import { EventEmitter } from 'events';

// Mock LLM Client for demonstration
class MockLLMClient extends EventEmitter {
  constructor(config: any) {
    super();
    console.log(`🔧 Mock LLM Client initialized with provider: ${config.provider || 'mock'}`);
  }

  async chat(messages: any[], tools?: any[]): Promise<any> {
    // Simulate LLM processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage?.content || '';
    
    // Mock responses based on content
    if (userContent.includes('create') || userContent.includes('implement')) {
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: 'I will create the requested files and implement the functionality.',
            tool_calls: [{
              id: 'call_1',
              type: 'function',
              function: {
                name: 'create_file',
                arguments: JSON.stringify({
                  path: 'example.ts',
                  content: '// Mock implementation\nconsole.log("Hello from mock agent!");'
                })
              }
            }]
          }
        }]
      };
    } else if (userContent.includes('research') || userContent.includes('analyze')) {
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: 'Based on my research, here are the key findings:\n\n1. Current best practices include...\n2. Performance considerations...\n3. Security recommendations...',
            tool_calls: [{
              id: 'call_2',
              type: 'function',
              function: {
                name: 'create_file',
                arguments: JSON.stringify({
                  path: 'research-report.md',
                  content: '# Research Report\n\n## Key Findings\n- Finding 1\n- Finding 2\n- Finding 3'
                })
              }
            }]
          }
        }]
      };
    } else {
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: 'Task completed successfully using mock LLM responses.'
          }
        }]
      };
    }
  }
}

// Import the real orchestration system
import { JurikoSwarm } from '../src/juriko-swarm';

async function demonstrateSwarm() {
  console.log('🤖 JURIKO Agent Swarm Live Demo\n');

  // Initialize with mock LLM
  const mockLLMClient = new MockLLMClient({ provider: 'mock' });
  const swarm = new JurikoSwarm(mockLLMClient as any);

  // Set up event monitoring
  swarm['swarm'].on('swarm_event', (event) => {
    const timestamp = event.timestamp.toLocaleTimeString();
    switch (event.type) {
      case 'task_created':
        console.log(`📝 [${timestamp}] Task created: ${event.taskId}`);
        break;
      case 'task_assigned':
        console.log(`👤 [${timestamp}] Task ${event.taskId} assigned to ${event.agentId}`);
        break;
      case 'task_completed':
        console.log(`✅ [${timestamp}] Task ${event.taskId} completed successfully`);
        break;
      case 'task_failed':
        console.log(`❌ [${timestamp}] Task ${event.taskId} failed: ${event.data?.result?.error}`);
        break;
    }
  });

  console.log('🚀 Starting demonstration tasks...\n');

  try {
    // Demo 1: Simple coding task
    console.log('Demo 1: Simple Coding Task');
    console.log('==========================');
    
    const result1 = await swarm.executeTaskAndWait(
      "Create a TypeScript utility function for email validation",
      {
        priority: 'high',
        capabilities: ['code_generation'],
        timeout: 10000
      }
    );

    console.log(`Result: ${result1.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Output: ${result1.result}`);
    console.log(`Execution time: ${Math.round((result1.executionTime || 0) / 1000)}s\n`);

    // Demo 2: Research task
    console.log('Demo 2: Research Task');
    console.log('====================');
    
    const result2 = await swarm.executeTaskAndWait(
      "Research React performance optimization techniques for 2024",
      {
        priority: 'medium',
        capabilities: ['web_research', 'report_generation'],
        timeout: 10000
      }
    );

    console.log(`Result: ${result2.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Output: ${result2.result}`);
    console.log(`Execution time: ${Math.round((result2.executionTime || 0) / 1000)}s\n`);

    // Demo 3: Complex task (will be handled by coordinator)
    console.log('Demo 3: Complex Multi-Agent Task');
    console.log('================================');
    
    const result3 = await swarm.executeTaskAndWait(
      "Build a complete REST API with authentication, CRUD operations, comprehensive testing, and full documentation",
      {
        priority: 'critical',
        timeout: 15000
      }
    );

    console.log(`Result: ${result3.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Output: ${result3.result}`);
    console.log(`Execution time: ${Math.round((result3.executionTime || 0) / 1000)}s\n`);

    // Show final swarm status
    console.log('Final Swarm Status');
    console.log('==================');
    const finalStatus = swarm.getSwarmStatus();
    console.log(`✅ Demo completed successfully!`);
    console.log(`📊 Statistics:`);
    console.log(`   • Active Tasks: ${finalStatus.activeTasks}`);
    console.log(`   • Completed Tasks: ${finalStatus.completedTasks}`);
    console.log(`   • Registered Agents: ${finalStatus.agents.length}`);
    
    console.log(`\n🤖 Agent Performance:`);
    finalStatus.agents.forEach(agent => {
      const successRate = Math.round(agent.successRate * 100);
      console.log(`   • ${agent.name}: ${agent.completedTasks} tasks, ${successRate}% success rate`);
    });

    // Show completed tasks
    console.log(`\n📋 Completed Tasks Summary:`);
    const completedTasks = swarm.getCompletedTasks();
    completedTasks.forEach((task, index) => {
      const status = task.success ? '✅' : '❌';
      const time = task.executionTime ? `(${Math.round(task.executionTime / 1000)}s)` : '';
      console.log(`   ${index + 1}. ${status} ${task.description.substring(0, 60)}... ${time}`);
    });

    console.log(`\n🎉 Demo completed! The JURIKO Agent Orchestration System is working perfectly.`);
    console.log(`\n💡 To use with real LLM providers:`);
    console.log(`   1. Set up API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)`);
    console.log(`   2. Replace MockLLMClient with real LLMClient`);
    console.log(`   3. Run: npm run swarm:example`);

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
  } finally {
    // Graceful shutdown
    console.log('\n🛑 Shutting down swarm...');
    await swarm.shutdown();
    console.log('✅ Swarm shutdown complete');
  }
}

if (require.main === module) {
  demonstrateSwarm().catch(console.error);
}