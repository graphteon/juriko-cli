# KILOCODE CLI - Condense Threshold Guide

## Overview

KILOCODE CLI includes an automatic conversation condensing feature that helps manage token usage by summarizing older parts of conversations when they approach the token limit. The condense threshold determines when this condensing is triggered.

## What is the Condense Threshold?

The condense threshold is a percentage value (0-100) that determines when KILOCODE should automatically condense (summarize) the conversation to reduce token usage. When the conversation reaches this percentage of the model's token limit, KILOCODE will:

1. Summarize older messages in the conversation
2. Keep recent messages intact for context
3. Reduce the total token count while preserving important information

## Default Configuration

- **Default threshold**: 75% of the model's token limit
- **Range**: 0-100 (percentage)
- **Trigger**: Automatic when threshold is reached

## Configuration Methods

### 1. Environment Variable (Highest Priority)

Set the `KILOCODE_CONDENSE_THRESHOLD` environment variable:

```bash
# Set threshold to 80%
export KILOCODE_CONDENSE_THRESHOLD=80

# Or run KILOCODE with the environment variable
KILOCODE_CONDENSE_THRESHOLD=80 kilocode
```

### 2. User Settings File

The threshold is stored in `~/.kilocode/user-settings.json`:

```json
{
  "condenseThreshold": 75,
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}
```

### 3. Programmatic Configuration

You can modify the threshold programmatically using the built-in functions:

```typescript
import { getCondenseThreshold, saveCondenseThreshold } from './src/utils/user-settings';

// Get current threshold
const currentThreshold = await getCondenseThreshold();
console.log(`Current threshold: ${currentThreshold}%`);

// Set new threshold
await saveCondenseThreshold(85); // Set to 85%
```

## Configuration Priority

KILOCODE checks for the condense threshold in this order:

1. **Environment Variable**: `KILOCODE_CONDENSE_THRESHOLD` (0-100)
2. **User Settings**: `~/.kilocode/user-settings.json`
3. **Default**: 75%

## Recommended Thresholds

### Conservative (Early Condensing)
- **Threshold**: 60-70%
- **Best for**: Users who want to minimize token usage and costs
- **Trade-off**: More frequent condensing, potential loss of some context

### Balanced (Default)
- **Threshold**: 75-80%
- **Best for**: Most users - good balance of context preservation and token management
- **Trade-off**: Moderate condensing frequency

### Aggressive (Late Condensing)
- **Threshold**: 85-95%
- **Best for**: Users who prioritize maximum context retention
- **Trade-off**: Higher token usage, less frequent condensing

## How Condensing Works

When the threshold is reached:

1. **Token Analysis**: KILOCODE calculates current token usage vs. model limit
2. **Message Selection**: Identifies older messages for condensing
3. **Summarization**: Uses the AI model to create a concise summary
4. **Context Preservation**: Keeps recent messages and important context
5. **Token Reduction**: Replaces verbose history with summary

## Examples

### Setting via Environment Variable

```bash
# Terminal 1: Set for current session
export KILOCODE_CONDENSE_THRESHOLD=70
kilocode

# Terminal 2: Set for single run
KILOCODE_CONDENSE_THRESHOLD=85 kilocode
```

### Manual User Settings File Edit

Edit `~/.kilocode/user-settings.json`:

```json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "condenseThreshold": 80,
  "theme": "dark"
}
```

### Checking Current Settings

You can verify your current settings by examining the user settings file:

```bash
# View current settings
cat ~/.kilocode/user-settings.json

# Check if environment variable is set
echo $KILOCODE_CONDENSE_THRESHOLD
```

## Model-Specific Considerations

Different models have different token limits, which affects when condensing triggers:

| Model | Token Limit | 75% Threshold | 80% Threshold |
|-------|-------------|---------------|---------------|
| Claude 3.5 Sonnet | 200,000 | 150,000 | 160,000 |
| GPT-4 | 128,000 | 96,000 | 102,400 |
| GPT-3.5 Turbo | 16,385 | 12,289 | 13,108 |

## Troubleshooting

### Issue: Condensing happens too frequently
**Solution**: Increase the threshold (e.g., from 75% to 85%)

### Issue: Running out of tokens before condensing
**Solution**: Decrease the threshold (e.g., from 75% to 65%)

### Issue: Settings not taking effect
**Check**:
1. Environment variable value: `echo $KILOCODE_CONDENSE_THRESHOLD`
2. User settings file: `cat ~/.kilocode/user-settings.json`
3. Valid range (0-100)

### Issue: Invalid threshold values
**Note**: KILOCODE automatically clamps values to 0-100 range. Invalid values default to 75%.

## Best Practices

1. **Start with default (75%)**: Works well for most users
2. **Monitor token usage**: Adjust based on your conversation patterns
3. **Consider model limits**: Smaller models may need lower thresholds
4. **Test different values**: Find what works best for your workflow
5. **Use environment variables**: For temporary threshold changes

## Advanced Usage

### Dynamic Threshold Adjustment

You can create scripts to adjust thresholds based on context:

```bash
#!/bin/bash
# Set different thresholds for different projects

if [[ "$PWD" == *"large-project"* ]]; then
    export KILOCODE_CONDENSE_THRESHOLD=85  # More context for complex projects
else
    export KILOCODE_CONDENSE_THRESHOLD=70  # Less context for simple tasks
fi

kilocode
```

### Project-Specific Configuration

Create project-specific threshold settings:

```bash
# In your project directory
echo 'export KILOCODE_CONDENSE_THRESHOLD=80' > .kilocoderc
source .kilocoderc
kilocode
```

## Summary

The condense threshold is a powerful feature that helps KILOCODE manage long conversations efficiently. By understanding and configuring this setting appropriately, you can optimize the balance between context preservation and token usage for your specific needs.

**Default**: 75% - Good for most users
**Configuration**: Environment variable or user settings file
**Range**: 0-100%
**Effect**: Higher values = more context, more tokens; Lower values = less context, fewer tokens