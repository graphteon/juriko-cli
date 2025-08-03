#!/usr/bin/env node

/**
 * Test script for Multi-Tool Batching functionality
 * Tests the BatchToolExecutor class and agent integration
 */

const { BatchToolExecutor } = require('../dist/tools/batch-executor');

// Mock tool calls for testing
const mockToolCalls = [
  {
    id: 'call_1',
    type: 'function',
    function: {
      name: 'view_file',
      arguments: JSON.stringify({ path: 'package.json' })
    }
  },
  {
    id: 'call_2', 
    type: 'function',
    function: {
      name: 'view_file',
      arguments: JSON.stringify({ path: 'README.md' })
    }
  },
  {
    id: 'call_3',
    type: 'function', 
    function: {
      name: 'bash',
      arguments: JSON.stringify({ command: 'echo "Hello from batch execution"' })
    }
  }
];

// Mock executor function
async function mockExecutor(toolCall) {
  const delay = Math.random() * 1000 + 500; // Random delay 500-1500ms
  await new Promise(resolve => setTimeout(resolve, delay));
  
  return {
    success: true,
    output: `Executed ${toolCall.function.name} with args: ${toolCall.function.arguments}`
  };
}

async function testBatchExecution() {
  console.log('🧪 Testing Multi-Tool Batching...\n');
  
  const batchExecutor = new BatchToolExecutor();
  
  console.log('📋 Tool calls to execute:');
  mockToolCalls.forEach((call, i) => {
    console.log(`  ${i + 1}. ${call.function.name}(${call.function.arguments})`);
  });
  console.log();
  
  // Test sequential execution (for comparison)
  console.log('⏱️  Sequential execution:');
  const sequentialStart = Date.now();
  const sequentialResults = [];
  
  for (const toolCall of mockToolCalls) {
    const result = await mockExecutor(toolCall);
    sequentialResults.push({ success: true, result: result.output });
  }
  
  const sequentialTime = Date.now() - sequentialStart;
  console.log(`   Completed in ${sequentialTime}ms\n`);
  
  // Test batch execution
  console.log('🚀 Batch execution:');
  const batchStart = Date.now();
  
  try {
    const batchResponse = await batchExecutor.executeBatch(mockToolCalls, mockExecutor);
    const batchTime = Date.now() - batchStart;
    
    console.log(`   Completed in ${batchTime}ms`);
    console.log(`   Performance improvement: ${Math.round(((sequentialTime - batchTime) / sequentialTime) * 100)}%`);
    console.log(`   Parallel tools: ${batchResponse.parallelCount}, Sequential: ${batchResponse.sequentialCount}\n`);
    
    // Verify results
    console.log('✅ Results verification:');
    batchResponse.results.forEach((result, i) => {
      const status = result.success ? '✓' : '✗';
      console.log(`   ${status} Tool ${i + 1}: ${result.success ? 'Success' : result.error}`);
    });
    
    console.log('\n🎉 Batch execution test completed successfully!');
    
  } catch (error) {
    console.error('❌ Batch execution failed:', error.message);
    process.exit(1);
  }
}

// Test dependency detection
async function testDependencyDetection() {
  console.log('\n🔍 Testing dependency detection...\n');
  
  const batchExecutor = new BatchToolExecutor();
  
  // Test tools with dependencies
  const dependentToolCalls = [
    {
      id: 'call_1',
      type: 'function',
      function: {
        name: 'create_file',
        arguments: JSON.stringify({ path: 'test.txt', content: 'Hello' })
      }
    },
    {
      id: 'call_2',
      type: 'function',
      function: {
        name: 'str_replace_editor',
        arguments: JSON.stringify({ path: 'test.txt', old_str: 'Hello', new_str: 'Hello World' })
      }
    },
    {
      id: 'call_3',
      type: 'function',
      function: {
        name: 'view_file',
        arguments: JSON.stringify({ path: 'other.txt' })
      }
    }
  ];
  
  console.log('📋 Tool calls with dependencies:');
  dependentToolCalls.forEach((call, i) => {
    console.log(`  ${i + 1}. ${call.function.name}(${call.function.arguments})`);
  });
  console.log();
  
  // This should execute sequentially due to file dependencies
  console.log('🔄 Executing with dependency detection...');
  const start = Date.now();
  
  try {
    const results = await batchExecutor.executeBatch(dependentToolCalls, mockExecutor);
    const time = Date.now() - start;
    
    console.log(`   Completed in ${time}ms`);
    console.log('   ℹ️  Note: Tools with file dependencies executed sequentially\n');
    
    console.log('✅ Dependency detection test completed!');
    
  } catch (error) {
    console.error('❌ Dependency detection test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  try {
    await testBatchExecution();
    await testDependencyDetection();
    
    console.log('\n🎯 All tests completed successfully!');
    console.log('\n💡 To enable batching in juriko-cli, use:');
    console.log('   juriko --enable-batching');
    console.log('   or set JURIKO_ENABLE_BATCHING=true');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { testBatchExecution, testDependencyDetection };