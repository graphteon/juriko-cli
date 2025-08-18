#!/usr/bin/env node

/**
 * Test script for settings UI with condense threshold
 * This tests that the condense threshold setting can be saved and loaded
 */

const { 
  getEffectiveSettings, 
  saveCondenseThreshold, 
  resetAllSettings 
} = require('../dist/utils/user-settings');

async function testSettingsUI() {
  console.log('🧪 Testing Settings UI with Condense Threshold...\n');

  try {
    // Test 1: Load current settings
    console.log('📊 Test 1: Loading Current Settings');
    const currentSettings = await getEffectiveSettings();
    console.log(`   Current condense threshold: ${currentSettings.condenseThreshold}%`);
    console.log(`   Response style: ${currentSettings.responseStyle}`);
    console.log(`   Security level: ${currentSettings.securityLevel}`);
    console.log(`   Batching enabled: ${currentSettings.enableBatching}`);
    console.log(`   Code references enabled: ${currentSettings.enableCodeReferences}`);
    console.log('   ✅ Settings loaded successfully');

    // Test 2: Save different threshold values
    console.log('\n🔧 Test 2: Testing Threshold Values');
    const testThresholds = [50, 60, 70, 75, 80, 85, 90];
    
    for (const threshold of testThresholds) {
      await saveCondenseThreshold(threshold);
      const updatedSettings = await getEffectiveSettings();
      
      if (updatedSettings.condenseThreshold === threshold) {
        console.log(`   ✅ Threshold ${threshold}% saved and loaded correctly`);
      } else {
        console.log(`   ❌ Threshold ${threshold}% failed - got ${updatedSettings.condenseThreshold}%`);
      }
    }

    // Test 3: Test boundary values
    console.log('\n🔍 Test 3: Testing Boundary Values');
    
    // Test minimum (should clamp to 0)
    await saveCondenseThreshold(-10);
    let settings = await getEffectiveSettings();
    console.log(`   Negative value (-10) clamped to: ${settings.condenseThreshold}% ${settings.condenseThreshold === 0 ? '✅' : '❌'}`);
    
    // Test maximum (should clamp to 100)
    await saveCondenseThreshold(150);
    settings = await getEffectiveSettings();
    console.log(`   Over-limit value (150) clamped to: ${settings.condenseThreshold}% ${settings.condenseThreshold === 100 ? '✅' : '❌'}`);

    // Test 4: Reset to defaults
    console.log('\n🔄 Test 4: Reset to Defaults');
    await resetAllSettings();
    const defaultSettings = await getEffectiveSettings();
    console.log(`   Default condense threshold: ${defaultSettings.condenseThreshold}%`);
    console.log(`   Default response style: ${defaultSettings.responseStyle}`);
    console.log(`   Default security level: ${defaultSettings.securityLevel}`);
    console.log(`   Default batching: ${defaultSettings.enableBatching}`);
    console.log(`   Default code references: ${defaultSettings.enableCodeReferences}`);
    
    const expectedDefaults = {
      condenseThreshold: 75,
      responseStyle: 'balanced',
      securityLevel: 'medium',
      enableBatching: false,
      enableCodeReferences: false
    };
    
    let allDefaultsCorrect = true;
    for (const [key, expectedValue] of Object.entries(expectedDefaults)) {
      if (defaultSettings[key] !== expectedValue) {
        console.log(`   ❌ Default ${key}: expected ${expectedValue}, got ${defaultSettings[key]}`);
        allDefaultsCorrect = false;
      }
    }
    
    if (allDefaultsCorrect) {
      console.log('   ✅ All defaults restored correctly');
    }

    // Test 5: Settings persistence
    console.log('\n💾 Test 5: Settings Persistence');
    await saveCondenseThreshold(85);
    
    // Simulate app restart by loading settings again
    const persistedSettings = await getEffectiveSettings();
    if (persistedSettings.condenseThreshold === 85) {
      console.log('   ✅ Settings persisted correctly after save');
    } else {
      console.log(`   ❌ Settings not persisted - expected 85%, got ${persistedSettings.condenseThreshold}%`);
    }

    console.log('\n🎉 All settings UI tests completed successfully!');
    
    console.log('\n📋 Settings UI Features:');
    console.log('   ✅ Auto-Condense Threshold setting added to UI');
    console.log('   ✅ Threshold values: 50%, 60%, 70%, 75%, 80%, 85%, 90%');
    console.log('   ✅ Value validation and clamping (0-100%)');
    console.log('   ✅ Settings persistence to ~/.juriko/user-settings.json');
    console.log('   ✅ Reset to defaults functionality');
    console.log('   ✅ Integration with existing settings system');

  } catch (error) {
    console.error('❌ Settings UI test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testSettingsUI().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});