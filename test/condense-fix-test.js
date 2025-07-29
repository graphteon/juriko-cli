const { MultiLLMAgent } = require('../dist/agent/multi-llm-agent');
const { LLMClient } = require('../dist/llm/client');

async function testCondenseWithCurrentModel() {
  console.log('🧪 Testing condense feature with current model...');
  
  // Create a mock LLM config for Anthropic (current model)
  const llmConfig = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
    baseURL: undefined
  };
  
  try {
    // Create LLM client and agent
    const llmClient = new LLMClient(llmConfig);
    const agent = new MultiLLMAgent(llmClient, llmConfig);
    
    // Test that the agent correctly derives the LLM config
    const derivedConfig = agent.deriveLLMConfigFromClient();
    
    console.log('✅ Current model:', llmClient.getCurrentModel());
    console.log('✅ Derived config provider:', derivedConfig.provider);
    console.log('✅ Derived config model:', derivedConfig.model);
    
    // Verify that the config matches Anthropic
    if (derivedConfig.provider === 'anthropic' && derivedConfig.model.includes('claude')) {
      console.log('✅ SUCCESS: Condense feature will use Anthropic instead of OpenAI');
      return true;
    } else {
      console.log('❌ FAILED: Config derivation not working correctly');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testCondenseWithCurrentModel()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });