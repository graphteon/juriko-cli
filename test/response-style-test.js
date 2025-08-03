#!/usr/bin/env node

/**
 * Test script untuk menguji concise vs verbose response modes
 * Usage: node test/response-style-test.js
 */

const { spawn } = require('child_process');
const path = require('path');

const JURIKO_PATH = path.join(__dirname, '..', 'dist', 'index.js');

async function testResponseStyle(mode, testMessage) {
  console.log(`\n🧪 Testing ${mode.toUpperCase()} mode:`);
  console.log(`Input: "${testMessage}"`);
  console.log('─'.repeat(50));

  return new Promise((resolve, reject) => {
    const args = ['node', JURIKO_PATH];
    
    if (mode === 'concise') {
      args.push('--concise');
    } else if (mode === 'verbose') {
      args.push('--verbose');
    }

    const child = spawn(args[0], args.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Use a test API key or mock
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'test-key',
        JURIKO_TEST_MODE: 'true'
      }
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Send test message after a short delay
    setTimeout(() => {
      child.stdin.write(testMessage + '\n');
      
      // Exit after getting response
      setTimeout(() => {
        child.stdin.write('exit\n');
      }, 3000);
    }, 1000);

    child.on('close', (code) => {
      console.log(`Output:\n${output}`);
      if (errorOutput) {
        console.log(`Errors:\n${errorOutput}`);
      }
      console.log(`Exit code: ${code}`);
      resolve({ output, errorOutput, code });
    });

    child.on('error', (error) => {
      console.error(`Error running ${mode} mode:`, error.message);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error(`${mode} mode test timed out`));
    }, 10000);
  });
}

async function runTests() {
  console.log('🚀 JURIKO CLI Response Style Testing');
  console.log('Testing concise vs verbose response modes...\n');

  const testMessages = [
    'help',
    'view package.json',
    'what files are in the src directory?'
  ];

  try {
    for (const message of testMessages) {
      console.log('\n' + '='.repeat(60));
      console.log(`📝 Test Message: "${message}"`);
      console.log('='.repeat(60));

      // Test concise mode
      try {
        await testResponseStyle('concise', message);
      } catch (error) {
        console.error('Concise mode test failed:', error.message);
      }

      console.log('\n' + '-'.repeat(30));

      // Test verbose mode
      try {
        await testResponseStyle('verbose', message);
      } catch (error) {
        console.error('Verbose mode test failed:', error.message);
      }

      console.log('\n' + '-'.repeat(30));

      // Test default mode
      try {
        await testResponseStyle('default', message);
      } catch (error) {
        console.error('Default mode test failed:', error.message);
      }
    }

    console.log('\n✅ Response style testing completed!');
    console.log('\n📊 Summary:');
    console.log('- Concise mode: Should show < 4 lines, no preamble/postamble');
    console.log('- Verbose mode: Should show detailed explanations');
    console.log('- Default mode: Should show balanced responses');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testResponseStyle, runTests };