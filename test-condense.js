// Quick test to verify condense functionality
const { shouldCondenseConversation, getModelTokenLimit } = require('./dist/utils/condense.js');

console.log('Testing condense functionality...');

// Test token limit detection
console.log('Token limits:');
console.log('- Grok-4:', getModelTokenLimit('grok-4-latest'));
console.log('- Claude 3.7:', getModelTokenLimit('claude-3-7-sonnet-latest'));
console.log('- GPT-4o:', getModelTokenLimit('gpt-4o'));

// Test threshold detection
const testCases = [
  { tokens: 50000, limit: 100000, expected: false },
  { tokens: 75000, limit: 100000, expected: true },
  { tokens: 90000, limit: 100000, expected: true },
];

console.log('\nThreshold testing (75%):');
testCases.forEach(({ tokens, limit, expected }) => {
  const result = shouldCondenseConversation(tokens, limit);
  console.log(`- ${tokens}/${limit} tokens: ${result} (expected: ${expected}) ${result === expected ? '✅' : '❌'}`);
});

console.log('\nCondense feature implementation complete! 🎉');