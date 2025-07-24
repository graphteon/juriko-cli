# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Local LLM Provider Support**: Added comprehensive support for local LLM servers
  - New 'local' provider type alongside existing Anthropic, OpenAI, and Grok providers
  - 4-step configuration wizard for local LLM setup (URL → Model Name → API Key → Save)
  - Support for popular local LLM solutions (LM Studio, Ollama, llama.cpp, etc.)
  - OpenAI-compatible API integration for local servers
  - Persistent settings for local server configuration (baseURL, model names, API keys)
  - Environment variable support for local LLM configuration
  - Interactive wizard with examples and validation

### Fixed
- **Streaming Tool Calling Bug**: Fixed tool arguments parsing issue in streaming mode
  - Tool calls now properly accumulate JSON fragments during streaming
  - Fixed `undefined` path parameters in tool execution
  - Improved error handling for malformed tool arguments
- **TUI Blinking Issue**: Resolved excessive interface blinking problems
  - Implemented content debouncing to reduce unnecessary re-renders
  - Added token count throttling for better performance
  - Optimized React components with useCallback hooks
  - Fixed timeout cleanup to prevent memory leaks
  - Improved streaming response display stability

### Enhanced
- **Provider Selection Interface**: Updated to include local LLM option
- **Settings Management**: Extended user settings to support local LLM configuration
- **Documentation**: Comprehensive README updates with local LLM setup guides
- **Type Safety**: Enhanced TypeScript definitions for local LLM support

### Technical Improvements
- Added `baseURLs` configuration in user settings
- Extended LLM client with local provider initialization
- Improved wizard state management and form validation
- Enhanced error handling and user feedback
- Better separation of concerns in provider management

## [0.0.3] - Previous Release

### Features
- Multi-LLM provider support (Anthropic, OpenAI, Grok)
- Interactive provider and model selection
- Smart file operations with AI tool usage
- Bash command integration
- Persistent user settings
- Custom instructions support
- Global CLI installation

### Core Components
- Multi-LLM client with unified interface
- Agent-based command processing
- Ink-based terminal UI
- Text editor and bash tools
- Settings persistence system