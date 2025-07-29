const { MultiLLMAgent } = require('./dist/agent/multi-llm-agent');
const { LLMClient } = require('./dist/llm/client');

async function testStreamingToolCalling() {
  console.log('🧪 Testing streaming tool calling functionality...\n');
  
  try {
    // Initialize LLM client (using environment variables)
    const client = new LLMClient({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY || 'test-key'
    });
    
    // Create agent
    const agent = new MultiLLMAgent(client);
    
    console.log('✅ Agent created successfully');
    
    // Test streaming tool calling - view README file
    console.log('\n📖 Testing streaming view_file tool with README.md...');
    
    const chunks = [];
    let chunkCount = 0;
    
    for await (const chunk of agent.processUserMessageStream('lihat isi file README.md')) {
      chunkCount++;
      chunks.push(chunk);
      
      console.log(`\n📦 Chunk ${chunkCount}: ${chunk.type}`);
      
      switch (chunk.type) {
        case 'content':
          console.log(`   Content: "${chunk.content}"`);
          break;
        case 'tool_calls':
          console.log(`   Tool calls: ${chunk.toolCalls?.length || 0}`);
          chunk.toolCalls?.forEach((tc, i) => {
            console.log(`     ${i + 1}. ${tc.function?.name} - Args: ${tc.function?.arguments}`);
          });
          break;
        case 'tool_result':
          console.log(`   Tool: ${chunk.toolCall?.function?.name}`);
          console.log(`   Success: ${chunk.toolResult?.success}`);
          if (chunk.toolResult?.success) {
            console.log(`   Output length: ${chunk.toolResult.output?.length || 0} chars`);
          } else {
            console.log(`   Error: ${chunk.toolResult?.error}`);
          }
          break;
        case 'token_count':
          console.log(`   Tokens: ${chunk.tokenCount}`);
          break;
        case 'done':
          console.log('   ✅ Stream completed');
          break;
      }
    }
    
    console.log(`\n📊 Summary: Received ${chunkCount} chunks total`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
testStreamingToolCalling();