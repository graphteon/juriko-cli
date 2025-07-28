# Conversation Condense Feature

The JURIKO CLI includes an intelligent conversation condensing feature that automatically manages token usage to prevent hitting context window limits while preserving important conversation context.

## How It Works

### Automatic Condensing
- **Threshold Monitoring**: The system continuously monitors token usage and automatically triggers condensing when usage reaches 75% of the model's token limit
- **Smart Summarization**: When triggered, the system uses an LLM to create a comprehensive summary of the conversation history
- **Context Preservation**: Recent messages (last 3 by default) are preserved to maintain immediate context

### Manual Condensing
Users can manually trigger conversation condensing using the `condense_conversation` tool:

```
Please condense this conversation to reduce token usage.
```

## Features

### Intelligent Summarization
The condense process creates structured summaries that include:
- **Previous Conversation**: Context to continue the conversation
- **Current Work**: Details about ongoing tasks
- **Key Technical Concepts**: Important technologies and frameworks discussed
- **Relevant Files and Code**: Files examined, modified, or created
- **Problem Solving**: Issues resolved and troubleshooting efforts
- **Pending Tasks**: Outstanding work items

### Token Limits by Model
The system automatically detects token limits for different models:

| Provider | Model | Token Limit |
|----------|-------|-------------|
| Anthropic | Claude 3.7 Sonnet | 200,000 |
| Anthropic | Claude Sonnet 4 | 200,000 |
| Anthropic | Claude Opus 4 | 200,000 |
| OpenAI | GPT-4o | 128,000 |
| OpenAI | GPT-4o Mini | 128,000 |
| Grok | Grok-4 Latest | 131,072 |
| Grok | Grok-3 Latest | 131,072 |

### User Confirmation
- Manual condensing requires user confirmation before proceeding
- Users can see what will be condensed and choose to proceed or cancel
- Automatic condensing provides clear feedback about the process

## Implementation Details

### Core Components

1. **Condense Utility** (`src/utils/condense.ts`)
   - `condenseConversation()`: Main condensing function
   - `shouldCondenseConversation()`: Threshold checking
   - `getModelTokenLimit()`: Model-specific token limits

2. **Condense Tool** (`src/tools/condense-tool.ts`)
   - Handles user confirmation for manual condensing
   - Integrates with the confirmation system

3. **Agent Integration** (`src/agent/juriko-agent.ts`)
   - Automatic token monitoring in streaming responses
   - Seamless integration with existing conversation flow
   - Updates both message history and chat display

### Configuration Options

```typescript
interface CondenseOptions {
  maxMessagesToKeep?: number;        // Default: 3
  customCondensePrompt?: string;     // Custom summarization prompt
  systemPrompt?: string;             // System context for condensing
  taskId?: string;                   // Task identifier for telemetry
  isAutomaticTrigger?: boolean;      // Whether triggered automatically
}
```

## Benefits

1. **Extended Conversations**: Enables much longer conversations without hitting token limits
2. **Context Preservation**: Maintains important context while reducing token usage
3. **Automatic Management**: No manual intervention required for most use cases
4. **Transparent Process**: Clear feedback about when and why condensing occurs
5. **Flexible Control**: Manual override available when needed

## Usage Examples

### Automatic Condensing
When token usage approaches 75% of the limit, you'll see:
```
🔄 Token usage is approaching the limit (75%). Condensing conversation to preserve context...
✅ Conversation condensed successfully. Token count reduced from 95,000 to 25,000.
```

### Manual Condensing
```
User: Please condense this conversation to reduce token usage.
Assistant: I'll condense the conversation to reduce token usage while preserving important context.
[Confirmation dialog appears]
```

## Error Handling

The system gracefully handles various error conditions:
- **Recent Condensing**: Prevents condensing if already done recently
- **Insufficient Messages**: Requires minimum message count for effective condensing
- **API Failures**: Falls back gracefully if condensing fails
- **User Cancellation**: Respects user choice to cancel condensing

This feature ensures that JURIKO CLI can handle extended conversations and complex tasks without being limited by token constraints.