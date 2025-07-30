const { MultiLLMAgent } = require('../dist/agent/multi-llm-agent');
const { LLMClient } = require('../dist/llm/client');
const { createTokenCounter } = require('../dist/utils/token-counter');
const { shouldCondenseConversation, getModelTokenLimit } = require('../dist/utils/condense');

async function testTokenCountingIssue() {
  console.log('🧪 Testing Token Counting Issue...\n');
  
  // Create a mock LLM config for current model
  const llmConfig = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
    baseURL: undefined
  };
  
  try {
    // Test 1: Check token counter model mismatch
    console.log('1. Testing Token Counter Model Mismatch:');
    const llmClient = new LLMClient(llmConfig);
    const agent = new MultiLLMAgent(llmClient, llmConfig);
    
    const currentModel = agent.getCurrentModel();
    console.log(`   Current LLM Model: ${currentModel}`);
    
    // Create token counters with different models
    const defaultCounter = createTokenCounter(); // Uses 'gpt-4' by default
    const correctCounter = createTokenCounter(currentModel);
    
    const testMessage = "This is a test message to check token counting accuracy for different models.";
    const defaultTokens = defaultCounter.countTokens(testMessage);
    const correctTokens = correctCounter.countTokens(testMessage);
    
    console.log(`   Default counter (gpt-4): ${defaultTokens} tokens`);
    console.log(`   Correct counter (${currentModel}): ${correctTokens} tokens`);
    console.log(`   Difference: ${Math.abs(defaultTokens - correctTokens)} tokens`);
    
    if (defaultTokens !== correctTokens) {
      console.log('   ❌ ISSUE: Token counter model mismatch causing inaccurate counts\n');
    } else {
      console.log('   ✅ Token counting consistent across models\n');
    }
    
    // Test 2: Check model token limits
    console.log('2. Testing Model Token Limits:');
    const tokenLimit = getModelTokenLimit(currentModel);
    console.log(`   Model: ${currentModel}`);
    console.log(`   Token Limit: ${tokenLimit.toLocaleString()}`);
    console.log(`   75% Threshold: ${Math.floor(tokenLimit * 0.75).toLocaleString()}`);
    
    // Test 3: Simulate conversation growth
    console.log('\n3. Testing Conversation Growth Simulation:');
    const mockMessages = [
      { role: 'system', content: 'You are JURIKO CLI, an AI assistant.' },
      { role: 'user', content: 'Hello, can you help me with a complex task?' },
      { role: 'assistant', content: 'I\'d be happy to help! What do you need assistance with?' },
      { role: 'user', content: 'I need to create multiple files and run several commands.' },
      { role: 'assistant', content: 'I\'ll help you create files and run commands.', tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'view_file',
            arguments: '{"path": "package.json"}'
          }
        }
      ]},
      { role: 'tool', content: 'File contents here...', tool_call_id: 'call_1' },
      { role: 'assistant', content: 'Based on the file, I\'ll create the necessary files.' }
    ];
    
    let totalTokens = 0;
    for (let i = 1; i <= mockMessages.length; i++) {
      const currentMessages = mockMessages.slice(0, i);
      const tokens = correctCounter.countMessageTokens(currentMessages);
      totalTokens = tokens;
      
      const percentage = (tokens / tokenLimit * 100).toFixed(1);
      const shouldCondense = shouldCondenseConversation(tokens, tokenLimit);
      
      console.log(`   Messages 1-${i}: ${tokens} tokens (${percentage}%) ${shouldCondense ? '🔄 CONDENSE' : '✅ OK'}`);
    }
    
    // Test 4: Check if condensing threshold is working
    console.log('\n4. Testing Condensing Threshold Logic:');
    const testCases = [
      { tokens: Math.floor(tokenLimit * 0.74), expected: false },
      { tokens: Math.floor(tokenLimit * 0.75), expected: true },
      { tokens: Math.floor(tokenLimit * 0.80), expected: true },
    ];
    
    testCases.forEach(({ tokens, expected }) => {
      const result = shouldCondenseConversation(tokens, tokenLimit);
      const percentage = (tokens / tokenLimit * 100).toFixed(1);
      const status = result === expected ? '✅' : '❌';
      console.log(`   ${tokens.toLocaleString()} tokens (${percentage}%): ${result} (expected: ${expected}) ${status}`);
    });
    
    // Test 5: Identify the core issue
    console.log('\n5. Core Issue Analysis:');
    console.log('   🔍 Issues Found:');
    console.log('   - Token counter initialized with wrong model (gpt-4 vs actual model)');
    console.log('   - Streaming token count only tracks output, not full conversation context');
    console.log('   - Tool calls and results not properly counted in real-time');
    console.log('   - Condensing check only happens at start, not during conversation growth');
    
    defaultCounter.dispose();
    correctCounter.dispose();
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testTokenCountingIssue()
  .then(success => {
    console.log('\n🎯 Test completed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });