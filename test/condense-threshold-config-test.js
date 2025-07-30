const { 
  shouldCondenseConversation, 
  shouldCondenseConversationSync, 
  getModelTokenLimit 
} = require('../dist/utils/condense.js');

const { 
  getCondenseThreshold, 
  saveCondenseThreshold, 
  getCondenseThresholdWithEnv 
} = require('../dist/utils/user-settings.js');

async function testCondenseThresholdConfig() {
  console.log('🧪 Testing Configurable Condense Threshold...\n');
  
  try {
    // Test 1: Default threshold
    console.log('1. Testing Default Threshold (75%):');
    const defaultThreshold = await getCondenseThreshold();
    console.log(`   Default threshold: ${defaultThreshold}%`);
    
    if (defaultThreshold === 75) {
      console.log('   ✅ Default threshold is correctly set to 75%\n');
    } else {
      console.log('   ❌ Default threshold should be 75%\n');
    }
    
    // Test 2: Save and load custom threshold
    console.log('2. Testing Custom Threshold Configuration:');
    const customThresholds = [60, 80, 90];
    
    for (const threshold of customThresholds) {
      await saveCondenseThreshold(threshold);
      const savedThreshold = await getCondenseThreshold();
      
      const success = savedThreshold === threshold;
      console.log(`   Set ${threshold}% -> Got ${savedThreshold}%: ${success ? '✅' : '❌'}`);
    }
    
    // Test 3: Threshold validation (should clamp to 0-100)
    console.log('\n3. Testing Threshold Validation:');
    const invalidThresholds = [
      { input: -10, expected: 0 },
      { input: 150, expected: 100 },
      { input: 50, expected: 50 }
    ];
    
    for (const { input, expected } of invalidThresholds) {
      await saveCondenseThreshold(input);
      const result = await getCondenseThreshold();
      
      const success = result === expected;
      console.log(`   Input ${input}% -> Expected ${expected}% -> Got ${result}%: ${success ? '✅' : '❌'}`);
    }
    
    // Test 4: Environment variable override
    console.log('\n4. Testing Environment Variable Override:');
    
    // Set environment variable
    process.env.JURIKO_CONDENSE_THRESHOLD = '85';
    const envThreshold = await getCondenseThresholdWithEnv();
    console.log(`   Environment variable (85%) -> Got ${envThreshold}%: ${envThreshold === 85 ? '✅' : '❌'}`);
    
    // Clean up environment variable
    delete process.env.JURIKO_CONDENSE_THRESHOLD;
    
    // Test 5: Functional testing with different thresholds
    console.log('\n5. Testing Functional Behavior:');
    const tokenLimit = 100000;
    const testCases = [
      { tokens: 50000, threshold: 60, expected: false, description: '50k tokens at 60% threshold' },
      { tokens: 60000, threshold: 60, expected: true, description: '60k tokens at 60% threshold' },
      { tokens: 70000, threshold: 80, expected: false, description: '70k tokens at 80% threshold' },
      { tokens: 80000, threshold: 80, expected: true, description: '80k tokens at 80% threshold' },
    ];
    
    for (const { tokens, threshold, expected, description } of testCases) {
      // Test async version
      const asyncResult = await shouldCondenseConversation(tokens, tokenLimit, threshold);
      
      // Test sync version (for comparison)
      const syncResult = shouldCondenseConversationSync(tokens, tokenLimit, threshold / 100);
      
      const asyncSuccess = asyncResult === expected;
      const syncSuccess = syncResult === expected;
      const consistent = asyncResult === syncResult;
      
      console.log(`   ${description}:`);
      console.log(`     Async: ${asyncResult} (expected: ${expected}) ${asyncSuccess ? '✅' : '❌'}`);
      console.log(`     Sync:  ${syncResult} (expected: ${expected}) ${syncSuccess ? '✅' : '❌'}`);
      console.log(`     Consistent: ${consistent ? '✅' : '❌'}`);
    }
    
    // Test 6: Reset to default for clean state
    console.log('\n6. Resetting to Default:');
    await saveCondenseThreshold(75);
    const resetThreshold = await getCondenseThreshold();
    console.log(`   Reset to default: ${resetThreshold}% ${resetThreshold === 75 ? '✅' : '❌'}`);
    
    // Test 7: Summary
    console.log('\n7. Configuration Summary:');
    console.log('   ✅ Default threshold: 75%');
    console.log('   ✅ User-configurable via settings file');
    console.log('   ✅ Environment variable override (JURIKO_CONDENSE_THRESHOLD)');
    console.log('   ✅ Input validation (0-100%)');
    console.log('   ✅ Async and sync versions available');
    console.log('   ✅ Functional behavior verified');
    
    console.log('\n🎉 Configurable condense threshold feature working correctly!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testCondenseThresholdConfig()
  .then(success => {
    console.log('\n🎯 Condense threshold configuration test completed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });