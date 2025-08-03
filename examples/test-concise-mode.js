#!/usr/bin/env node

/**
 * Simple test untuk demonstrasi concise mode
 * Usage: node examples/test-concise-mode.js
 */

const { ResponseFormatter } = require('../dist/utils/response-formatter');

// Test responses
const testResponses = [
  {
    name: "Verbose Response",
    content: `Great! I'll help you view the package.json file. Let me use the view_file tool to read the contents of the package.json file for you.

This will show you all the dependencies, scripts, and configuration details in your package.json file. Here's what I found:

The package.json contains your project configuration including dependencies like React, TypeScript, and various development tools.

Let me know if you need any clarification about the contents or if you'd like me to explain any specific parts of the configuration!`
  },
  {
    name: "Response with Preamble",
    content: `Sure! I can definitely help you with that. Let me check the src directory contents for you.

I'll use the bash tool to list all the files in the src directory so you can see the project structure.`
  },
  {
    name: "Simple Response",
    content: `Files in src directory:
- index.ts
- agent/
- tools/
- ui/
- utils/`
  }
];

console.log('🧪 Testing Response Formatter\n');

testResponses.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.name}`);
  console.log('─'.repeat(50));
  
  console.log('\n📝 Original:');
  console.log(test.content);
  
  console.log('\n🎯 Concise:');
  const conciseStyle = ResponseFormatter.createConciseStyle();
  const conciseResult = ResponseFormatter.formatResponseContent(test.content, conciseStyle);
  console.log(conciseResult);
  
  console.log('\n📊 Metrics:');
  const metrics = ResponseFormatter.formatResponse(test.content, conciseStyle);
  console.log(`- Original length: ${metrics.originalLength} chars`);
  console.log(`- Formatted length: ${metrics.formattedLength} chars`);
  console.log(`- Lines removed: ${metrics.linesRemoved}`);
  console.log(`- Tokens reduced: ~${metrics.tokensReduced}`);
  console.log(`- Reduction: ${Math.round((1 - metrics.formattedLength / metrics.originalLength) * 100)}%`);
  
  console.log('\n🔍 Verbosity Score:');
  console.log(`- Original: ${ResponseFormatter.detectVerbosity(test.content)}/100`);
  console.log(`- Formatted: ${ResponseFormatter.detectVerbosity(conciseResult)}/100`);
});

console.log('\n✅ Response formatting test completed!');
console.log('\n📋 Style Presets:');
console.log('- Concise: Max 4 lines, no preamble/postamble, no explanations');
console.log('- Verbose: Full explanations, no limits');
console.log('- Balanced: Max 15 lines, no preamble/postamble, keep explanations');