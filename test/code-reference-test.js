#!/usr/bin/env node

/**
 * Test script for Code Reference System functionality
 * Tests the CodeReferenceManager class and clickable link generation
 */

const { CodeReferenceManager, ReferenceUtils } = require('../dist/tools/code-reference');
const fs = require('fs');
const path = require('path');

async function testCodeReferenceSystem() {
  console.log('🧪 Testing Code Reference System...\n');
  
  // Set working directory
  CodeReferenceManager.setWorkingDirectory(process.cwd());
  
  // Test 1: Basic file reference formatting
  console.log('📋 Test 1: Basic file reference formatting');
  const fileRef = CodeReferenceManager.formatReference('package.json');
  console.log(`   File reference: ${fileRef}`);
  
  const lineRef = CodeReferenceManager.formatReference('src/index.ts', 42);
  console.log(`   Line reference: ${lineRef}`);
  
  // Test 2: Reference parsing
  console.log('\n📋 Test 2: Reference parsing');
  const parsedRef = CodeReferenceManager.parseReference('[`src/app.ts:123`](vscode://file/src/app.ts:123)');
  console.log(`   Parsed reference:`, parsedRef);
  
  // Test 3: Extract references from content
  console.log('\n📋 Test 3: Extract references from content');
  const testContent = `
Error in src/utils/helper.ts:15
Check package.json for dependencies
Modified README.md with new instructions
at line 42 in src/components/Button.tsx
  `;
  
  const extractedRefs = CodeReferenceManager.extractReferencesFromContent(testContent);
  console.log(`   Extracted ${extractedRefs.length} references:`);
  extractedRefs.forEach((ref, i) => {
    console.log(`     ${i + 1}. ${ref.file}${ref.line ? `:${ref.line}` : ''}`);
  });
  
  // Test 4: Enhance content with references
  console.log('\n📋 Test 4: Enhance content with references');
  const originalContent = 'Error in package.json at line 25';
  const enhancedContent = CodeReferenceManager.enhanceWithReferences(originalContent);
  console.log(`   Original: ${originalContent}`);
  console.log(`   Enhanced: ${enhancedContent}`);
  
  // Test 5: Utility functions
  console.log('\n📋 Test 5: Utility functions');
  console.log(`   ReferenceUtils.file(): ${ReferenceUtils.file('src/app.ts')}`);
  console.log(`   ReferenceUtils.line(): ${ReferenceUtils.line('src/app.ts', 100)}`);
  
  const multipleFiles = ['src/index.ts', 'src/app.ts', 'package.json'];
  const multipleRefs = ReferenceUtils.multiple(multipleFiles);
  console.log(`   Multiple files:`);
  multipleRefs.forEach((ref, i) => {
    console.log(`     ${i + 1}. ${ref}`);
  });
  
  // Test 6: VSCode link generation
  console.log('\n📋 Test 6: VSCode link generation');
  const vscodeLink = CodeReferenceManager.generateClickableLink('src/index.ts', 50);
  console.log(`   VSCode link: ${vscodeLink}`);
  
  // Test 7: Context around line (if file exists)
  console.log('\n📋 Test 7: Context around line');
  if (fs.existsSync('package.json')) {
    const context = CodeReferenceManager.getContextAroundLine('package.json', 5, 2);
    if (context) {
      console.log(`   Context around package.json:5:`);
      console.log(context.split('\n').map(line => `     ${line}`).join('\n'));
    }
  }
  
  // Test 8: Reference validation
  console.log('\n📋 Test 8: Reference validation');
  const validRef = CodeReferenceManager.createReference('package.json', 1);
  const isValid = CodeReferenceManager.validateReference(validRef);
  console.log(`   Valid reference (package.json:1): ${isValid}`);
  
  const invalidRef = CodeReferenceManager.createReference('nonexistent.txt', 1);
  const isInvalid = CodeReferenceManager.validateReference(invalidRef);
  console.log(`   Invalid reference (nonexistent.txt:1): ${isInvalid}`);
  
  console.log('\n🎉 Code Reference System test completed successfully!');
  
  console.log('\n💡 Usage examples:');
  console.log('   - File reference: [`package.json`](vscode://file/package.json)');
  console.log('   - Line reference: [`src/index.ts:42`](vscode://file/src/index.ts:42)');
  console.log('   - Click these links in VSCode to navigate directly to the files!');
}

// Test error reference extraction
function testErrorReferences() {
  console.log('\n🔍 Testing error reference extraction...');
  
  const mockError = new Error('Test error');
  mockError.stack = `Error: Test error
    at Object.<anonymous> (/path/to/file.js:10:5)
    at Module._compile (module.js:456:26)
    at Object.Module._extensions..js (module.js:474:10)`;
  
  const errorRefs = ReferenceUtils.fromError(mockError);
  console.log(`   Extracted ${errorRefs.length} references from error stack`);
  errorRefs.forEach((ref, i) => {
    console.log(`     ${i + 1}. ${ref.file}:${ref.line}:${ref.column}`);
  });
}

// Run tests
async function runTests() {
  try {
    await testCodeReferenceSystem();
    testErrorReferences();
    
    console.log('\n🎯 All tests completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Build the project: npm run build');
    console.log('   2. Test in VSCode by clicking the generated links');
    console.log('   3. Verify tool outputs include clickable references');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { testCodeReferenceSystem, testErrorReferences };