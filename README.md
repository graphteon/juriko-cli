# JURIKO CLI

A conversational AI CLI tool with intelligent text editor capabilities and tool usage.

<img width="980" height="435" alt="Screenshot 2025-07-21 at 13 35 41" src="" />

## Features

- **🤖 Multi-LLM Provider Support**: Choose from Anthropic Claude, OpenAI GPT, or Grok models
- **🎯 Interactive Provider Selection**: Easy-to-use interface for selecting providers and models at startup
- **📝 Smart File Operations**: AI automatically uses tools to view, create, and edit files
- **⚡ Bash Integration**: Execute shell commands through natural conversation
- **🔧 Automatic Tool Selection**: AI intelligently chooses the right tools for your requests
- **💬 Interactive UI**: Beautiful terminal interface built with Ink
- **⚙️ Persistent Settings**: Save your preferred provider and model settings
- **🌍 Global Installation**: Install and use anywhere with `npm i -g @graphteon/juriko-cli`

## Installation

### Prerequisites
- Node.js 16+
- API key from at least one supported provider:
  - **Anthropic Claude**: Get your key from [console.anthropic.com](https://console.anthropic.com/)
  - **OpenAI**: Get your key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - **Grok (X.AI)**: Get your key from [console.x.ai](https://console.x.ai/)

### Global Installation (Recommended)
```bash
npm install -g @graphteon/juriko-cli
```

### Local Development
```bash
git clone <repository>
cd juriko-cli
npm install
npm run build
npm link
```

## Setup

### Multi-LLM Provider Support

JURIKO supports multiple AI providers. You can set up API keys for any or all of them:

**Method 1: Environment Variables**
```bash
# Anthropic Claude
export ANTHROPIC_API_KEY=your_anthropic_key_here

# OpenAI
export OPENAI_API_KEY=your_openai_key_here

# Grok (X.AI)
export GROK_API_KEY=your_grok_key_here
```

**Method 2: .env File**
```bash
cp .env.example .env
# Edit .env and add your API keys
```

**Method 3: Command Line Flags**
```bash
juriko --anthropic-key your_anthropic_key_here
juriko --openai-key your_openai_key_here
juriko --grok-key your_grok_key_here
```

**Method 4: User Settings File**
Create `~/.juriko/user-settings.json`:
```json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "apiKeys": {
    "anthropic": "your_anthropic_key_here",
    "openai": "your_openai_key_here",
    "grok": "your_grok_key_here"
  }
}
```

### Provider Selection

When you first run JURIKO, you'll be presented with an interactive interface to:

1. **Select your preferred LLM provider** (Anthropic, OpenAI, or Grok)
2. **Choose a model** from the available options for that provider
3. **Enter your API key** if not already configured
4. **Save your preferences** for future sessions

You can change providers anytime by:
- Typing `provider` or `switch` in the chat
- Pressing `Ctrl+P` for quick provider switching
- Running `juriko` again to go through the selection process

### Supported Models

**Anthropic Claude:**
- `claude-3-5-sonnet-20241022` (Latest Sonnet)
- `claude-3-5-haiku-20241022` (Fast and efficient)
- `claude-3-opus-20240229` (Most capable)

**OpenAI:**
- `gpt-4o` (Latest GPT-4 Omni)
- `gpt-4o-mini` (Fast and cost-effective)
- `gpt-4-turbo` (High performance)
- `gpt-3.5-turbo` (Fast and affordable)

**Grok (X.AI):**
- `grok-beta` (Latest Grok model)
- `grok-vision-beta` (With vision capabilities)

## Usage

Start the conversational AI assistant:
```bash
juriko
```

Or specify a working directory:
```bash
juriko -d /path/to/project
```

### First Run Experience

On your first run, JURIKO will guide you through:

1. **Provider Selection**: Choose from Anthropic, OpenAI, or Grok
2. **Model Selection**: Pick the best model for your needs
3. **API Key Setup**: Enter your API key (with option to save it)
4. **Ready to Chat**: Start conversing with your chosen AI

### Switching Providers

You can easily switch between providers and models:

- Type `provider` or `switch` in the chat
- Press `Ctrl+P` for quick access
- Your preferences are automatically saved to `~/.juriko/user-settings.json`

### Custom Instructions

You can provide custom instructions to tailor JURIKO's behavior to your project by creating a `.juriko/JURIKO.md` file in your project directory:

```bash
mkdir .juriko
```

Create `.juriko/JURIKO.md` with your custom instructions:
```markdown
# Custom Instructions for JURIKO CLI

Always use TypeScript for any new code files.
When creating React components, use functional components with hooks.
Prefer const assertions and explicit typing over inference where it improves clarity.
Always add JSDoc comments for public functions and interfaces.
Follow the existing code style and patterns in this project.
```

JURIKO will automatically load and follow these instructions when working in your project directory. The custom instructions are added to JURIKO's system prompt and take priority over default behavior.

## Example Conversations

Instead of typing commands, just tell JURIKO what you want to do:

```
💬 "Show me the contents of package.json"
💬 "Create a new file called hello.js with a simple console.log"
💬 "Find all TypeScript files in the src directory"
💬 "Replace 'oldFunction' with 'newFunction' in all JS files"
💬 "Run the tests and show me the results"
💬 "What's the current directory structure?"
```

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build project
npm run build

# Run linter
npm run lint

# Type check
npm run typecheck
```

## Architecture

- **Multi-LLM Client**: Unified interface supporting Anthropic, OpenAI, and Grok APIs
- **Provider Selection**: Interactive UI for choosing providers and models
- **Agent**: Core command processing and execution logic with multi-provider support
- **Tools**: Text editor and bash tool implementations
- **UI**: Ink-based terminal interface components with provider management
- **Settings**: Persistent user preferences and API key management
- **Types**: TypeScript definitions for the entire system

## License

MIT
