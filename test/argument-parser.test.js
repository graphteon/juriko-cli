const { safeParseArguments, parseToolCallArguments, validateArgumentTypes } = require('../dist/utils/argument-parser');

// Test safeParseArguments function
console.log('Testing safeParseArguments...');

// Test 1: Already an object
try {
  const result1 = safeParseArguments({ key: 'value', number: 42 });
  console.log('✅ Test 1 passed: Object input returned as-is', result1);
} catch (error) {
  console.log('❌ Test 1 failed:', error.message);
}

// Test 2: Valid JSON string
try {
  const result2 = safeParseArguments('{"key": "value", "number": 42}');
  console.log('✅ Test 2 passed: JSON string parsed correctly', result2);
} catch (error) {
  console.log('❌ Test 2 failed:', error.message);
}

// Test 3: Invalid JSON string
try {
  const result3 = safeParseArguments('{"key": "value", "number":}');
  console.log('❌ Test 3 should have failed but passed:', result3);
} catch (error) {
  console.log('✅ Test 3 passed: Invalid JSON threw error:', error.message);
}

// Test 4: Null/undefined input
try {
  const result4 = safeParseArguments(null);
  console.log('✅ Test 4 passed: Null input returned empty object', result4);
} catch (error) {
  console.log('❌ Test 4 failed:', error.message);
}

// Test parseToolCallArguments function
console.log('\nTesting parseToolCallArguments...');

// Test 5: Tool call with object arguments
try {
  const toolCall1 = {
    function: {
      arguments: { path: '/test/file.txt', content: 'Hello World' }
    }
  };
  const result5 = parseToolCallArguments(toolCall1);
  console.log('✅ Test 5 passed: Tool call with object arguments', result5);
} catch (error) {
  console.log('❌ Test 5 failed:', error.message);
}

// Test 6: Tool call with JSON string arguments
try {
  const toolCall2 = {
    function: {
      arguments: '{"path": "/test/file.txt", "content": "Hello World"}'
    }
  };
  const result6 = parseToolCallArguments(toolCall2);
  console.log('✅ Test 6 passed: Tool call with JSON string arguments', result6);
} catch (error) {
  console.log('❌ Test 6 failed:', error.message);
}

// Test validateArgumentTypes function
console.log('\nTesting validateArgumentTypes...');

// Test 7: Valid arguments with object type that needs parsing
try {
  const args = {
    path: '/test/file.txt',
    metadata: '{"author": "test", "version": 1}'
  };
  const schema = {
    properties: {
      path: { type: 'string' },
      metadata: { type: 'object' }
    },
    required: ['path']
  };
  const result7 = validateArgumentTypes(args, schema);
  if (result7 === null) {
    console.log('✅ Test 7 passed: Arguments validated and object parsed', args);
  } else {
    console.log('❌ Test 7 failed:', result7);
  }
} catch (error) {
  console.log('❌ Test 7 failed:', error.message);
}

// Test 8: Invalid object type
try {
  const args8 = {
    path: '/test/file.txt',
    metadata: 'invalid json{'
  };
  const schema8 = {
    properties: {
      path: { type: 'string' },
      metadata: { type: 'object' }
    },
    required: ['path']
  };
  const result8 = validateArgumentTypes(args8, schema8);
  if (result8 !== null) {
    console.log('✅ Test 8 passed: Invalid object detected:', result8);
  } else {
    console.log('❌ Test 8 failed: Should have detected invalid object');
  }
} catch (error) {
  console.log('❌ Test 8 failed:', error.message);
}

// Test 9: Number type conversion
try {
  const args9 = {
    path: '/test/file.txt',
    start_line: '10',
    end_line: '20'
  };
  const schema9 = {
    properties: {
      path: { type: 'string' },
      start_line: { type: 'number' },
      end_line: { type: 'number' }
    },
    required: ['path']
  };
  const result9 = validateArgumentTypes(args9, schema9);
  if (result9 === null && typeof args9.start_line === 'number' && typeof args9.end_line === 'number') {
    console.log('✅ Test 9 passed: String to number conversion', args9);
  } else {
    console.log('❌ Test 9 failed:', result9, args9);
  }
} catch (error) {
  console.log('❌ Test 9 failed:', error.message);
}

// Test 10: Boolean type conversion
try {
  const args10 = {
    enabled: 'true',
    debug: 'false',
    verbose: '1',
    quiet: '0'
  };
  const schema10 = {
    properties: {
      enabled: { type: 'boolean' },
      debug: { type: 'boolean' },
      verbose: { type: 'boolean' },
      quiet: { type: 'boolean' }
    }
  };
  const result10 = validateArgumentTypes(args10, schema10);
  if (result10 === null &&
      args10.enabled === true &&
      args10.debug === false &&
      args10.verbose === true &&
      args10.quiet === false) {
    console.log('✅ Test 10 passed: String to boolean conversion', args10);
  } else {
    console.log('❌ Test 10 failed:', result10, args10);
  }
} catch (error) {
  console.log('❌ Test 10 failed:', error.message);
}

// Test 11: Invalid number conversion
try {
  const args11 = {
    count: 'not-a-number'
  };
  const schema11 = {
    properties: {
      count: { type: 'number' }
    }
  };
  const result11 = validateArgumentTypes(args11, schema11);
  if (result11 !== null) {
    console.log('✅ Test 11 passed: Invalid number detected:', result11);
  } else {
    console.log('❌ Test 11 failed: Should have detected invalid number');
  }
} catch (error) {
  console.log('❌ Test 11 failed:', error.message);
}

console.log('\nAll tests completed!');