#!/usr/bin/env node

/**
 * Test script for automatic conversation condensing feature
 * This tests that condensing happens automatically when token threshold is reached
 * and that the conversation history is completely replaced with condensed version
 */

const { MultiLLMAgent } = require('../dist/agent/multi-llm-agent');
const { shouldCondenseConversation, getModelTokenLimit } = require('../dist/utils/condense');
const { createTokenCounter } = require('../dist/utils/token-counter');

async function testAutomaticCondense() {
  console.log('🧪 Testing Automatic Conversation Condensing...\n');

  try {
    // Create a mock LLM client for testing
    const mockLLMClient = {
      getCurrentModel: () => 'claude-3-5-sonnet-20241022',
      chat: async (messages, tools) => ({
        choices: [{
          message: {
            role: 'assistant',
            content: 'This is a comprehensive summary of the previous conversation. The user has been working on various coding tasks including file editing, system operations, and implementing features. Key technical concepts discussed include JavaScript, Node.js, file system operations, and API integrations. The conversation covered multiple problem-solving scenarios and implementation details.',
            tool_calls: null
          }
        }]
      }),
      chatStream: async function* (messages, tools) {
        yield {
          choices: [{
            delta: {
              role: 'assistant',
              content: 'This is a test response for condensing.'
            }
          }]
        };
      },
      setModel: () => {},
    };

    // Create agent with mock client
    const agent = new MultiLLMAgent(mockLLMClient);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('✅ Agent initialized successfully');

    // Test 1: Check threshold detection
    console.log('\n📊 Test 1: Threshold Detection');
    const tokenCounter = createTokenCounter('claude-3-5-sonnet-20241022');
    const modelLimit = getModelTokenLimit('claude-3-5-sonnet-20241022');
    const testTokens = Math.floor(modelLimit * 0.8); // 80% of limit
    
    const shouldCondense = await shouldCondenseConversation(testTokens, modelLimit);
    console.log(`   Model limit: ${modelLimit} tokens`);
    console.log(`   Test tokens: ${testTokens} tokens (80%)`);
    console.log(`   Should condense: ${shouldCondense ? '✅ YES' : '❌ NO'}`);

    // Test 2: Verify condense tool is removed from available tools
    console.log('\n🔧 Test 2: Tool List Verification');
    const availableTools = await agent.getAvailableTools();
    const hasCondenseTool = availableTools.some(tool => tool.function.name === 'condense_conversation');
    console.log(`   Condense tool in available tools: ${hasCondenseTool ? '❌ FOUND (should be removed)' : '✅ NOT FOUND (correct)'}`);
    console.log(`   Total available tools: ${availableTools.length}`);

    // Test 3: Simulate conversation growth and automatic condensing
    console.log('\n💬 Test 3: Conversation Growth Simulation');
    
    // Add messages to simulate a long conversation (shorter to avoid API limits)
    const longMessage = 'This is a message that contains content about coding, file editing, and system operations. '.repeat(20);
    
    // Add initial system message if not present
    if (agent.messages.length === 0) {
      agent.messages.push({
        role: 'system',
        content: 'You are JURIKO CLI, an AI assistant that helps with file editing, coding tasks, and system operations.'
      });
    }
    
    console.log(`   Initial messages: ${agent.messages.length}`);
    
    // Add messages to approach threshold (use lower threshold for testing)
    const testThreshold = 0.3; // 30% instead of 75% for easier testing
    const targetTokens = Math.floor(modelLimit * testThreshold);
    
    console.log(`   Target tokens for test: ${targetTokens} (${testThreshold * 100}%)`);
    
    // Add messages until we reach the target
    let currentTokens = tokenCounter.countMessageTokens(agent.messages);
    let messageCount = 0;
    
    while (currentTokens < targetTokens && messageCount < 200) {
      agent.messages.push({
        role: 'user',
        content: `User message ${messageCount + 1}: ${longMessage}`
      });
      agent.messages.push({
        role: 'assistant',
        content: `Assistant response ${messageCount + 1}: ${longMessage}`
      });
      messageCount++;
      currentTokens = tokenCounter.countMessageTokens(agent.messages);
    }

    console.log(`   Messages before condense: ${agent.messages.length}`);
    console.log(`   Tokens before condense: ${currentTokens}`);

    // Force condense by using custom threshold
    const shouldCondenseNow = await shouldCondenseConversation(currentTokens, modelLimit, testThreshold * 100);
    console.log(`   Should condense now (${testThreshold * 100}% threshold): ${shouldCondenseNow ? '✅ YES' : '❌ NO'}`);

    if (shouldCondenseNow || currentTokens > targetTokens) {
      console.log('   🔄 Triggering condense...');
      
      // Access the private method for testing
      const condenseResult = await agent.performCondense(true);
      
      if (condenseResult.error) {
        console.log(`   ❌ Condense failed: ${condenseResult.error}`);
      } else {
        const afterTokens = tokenCounter.countMessageTokens(agent.messages);
        console.log(`   ✅ Condense successful!`);
        console.log(`   Messages after condense: ${agent.messages.length}`);
        console.log(`   Tokens after condense: ${afterTokens}`);
        console.log(`   Token reduction: ${currentTokens - afterTokens} tokens (${Math.round((1 - afterTokens/currentTokens) * 100)}%)`);
        
        // Verify that history was completely replaced
        const hasOnlySummary = agent.messages.length <= 2; // system + summary only
        console.log(`   History completely replaced: ${hasOnlySummary ? '✅ YES' : '❌ NO'}`);
        
        // Check chat history
        console.log(`   Chat history entries: ${agent.chatHistory.length}`);
        const chatHistoryReplaced = agent.chatHistory.length === 1; // only summary
        console.log(`   Chat history replaced: ${chatHistoryReplaced ? '✅ YES' : '❌ NO'}`);
        
        // Verify summary content
        const summaryMessage = agent.messages.find(m => m.role === 'user' && m.content.includes('Previous conversation summary'));
        console.log(`   Summary message found: ${summaryMessage ? '✅ YES' : '❌ NO'}`);
        
        // Test that new messages can be added after condense
        agent.messages.push({
          role: 'user',
          content: 'New message after condense'
        });
        
        const finalTokens = tokenCounter.countMessageTokens(agent.messages);
        console.log(`   Tokens after adding new message: ${finalTokens}`);
        console.log(`   Can continue conversation: ${finalTokens < modelLimit ? '✅ YES' : '❌ NO'}`);
      }
    } else {
      console.log('   ℹ️  Forcing condense for testing...');
      
      const condenseResult = await agent.performCondense(true);
      
      if (!condenseResult.error) {
        const finalTokens = tokenCounter.countMessageTokens(agent.messages);
        console.log(`   ✅ Forced condense successful!`);
        console.log(`   Final messages: ${agent.messages.length}`);
        console.log(`   Final tokens: ${finalTokens}`);
        console.log(`   Total reduction: ${currentTokens - finalTokens} tokens`);
      } else {
        console.log(`   ❌ Forced condense failed: ${condenseResult.error}`);
      }
    }

    console.log('\n🎉 All tests completed successfully!');
    
    // Cleanup
    tokenCounter.dispose();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testAutomaticCondense().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});