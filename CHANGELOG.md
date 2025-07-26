# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Conversation Condense Feature**: Intelligent token management system
  - Automatic conversation condensing when token usage reaches 75% of model limit
  - Smart summarization preserving important context, technical details, and recent messages
  - Manual condensing tool (`condense_conversation`) with user confirmation
  - Model-specific token limit detection for all supported providers
  - Structured summaries including previous conversation, current work, technical concepts, and pending tasks
  - Seamless integration with existing conversation flow
  - Clear user feedback during automatic and manual condensing operations
  - Comprehensive documentation in `docs/CONDENSE_FEATURE.md`

### Enhanced
- **Token Management**: Extended token counter with model-specific limits and threshold monitoring
- **Agent System**: Enhanced JurikoAgent with automatic token monitoring and condensing capabilities
- **Tool System**: Added condense tool with confirmation workflow integration
- **User Experience**: Clear visual feedback when condensing occurs with token count reduction display

### Technical Improvements
- New condense utility module (`src/utils/condense.ts`) with conversation summarization logic
- Enhanced LLM client integration for condensing operations
- Automatic model detection and token limit configuration
- Graceful error handling and fallback mechanisms
- State management for condensed conversations in chat history

## [0.1.0] - 2025-01-25

### Added
- **Stop Conversation Feature**: Press 's' key to immediately stop ongoing operations
  - Works during any processing operation or conversation
  - Graceful cancellation using AbortController
  - Clear user feedback with stop confirmation message
- **Enhanced Processing Animation**: New animated loading spinner with improved UX
  - Rotating spinner frames with smooth animation
  - Cycling processing messages ("Thinking...", "Processing...", etc.)
  - Real-time display of processing time and token count
  - Clear keyboard shortcut instructions during processing
- **Updated Keyboard Shortcuts**: Comprehensive keyboard control system
  - `s` - Stop current operation (new)
  - `ESC` - Cancel current operation
  - `Ctrl+C` - Exit application
  - `Ctrl+P` - Switch provider/model (StreamingChat mode)
- **Enhanced User Instructions**: Updated help and interface messages
  - Updated `/help` command with keyboard shortcuts
  - Consistent instruction display across all components
  - Better user guidance during operations

### Enhanced
- **Input Handling**: Improved input handlers in both JurikoAgent and MultiLLMAgent modes
- **User Experience**: Better visual feedback and control during long-running operations
- **Documentation**: Added comprehensive feature documentation in `docs/STOP_CONVERSATION_FEATURE.md`

### Technical Improvements
- Leveraged existing AbortController infrastructure for clean cancellation
- Non-disruptive stopping that maintains application stability
- Proper state cleanup when operations are cancelled
- Enhanced component architecture with better separation of concerns

## [0.0.9] - 2025-01-27

### Added
- Enhanced MCP (Model Context Protocol) integration with Jina AI
- Real-time web search and fact-checking capabilities
- Invoice creation and payment tracking functionality
- Todo list management system for task planning
- User confirmation system for file operations

### Changed
- Improved file editing workflow with better validation
- Enhanced error handling and user feedback
- Updated tool usage documentation

## [0.0.8] - 2025-07-24

### Added
- Added welcome image to project assets
- Enhanced README with updated documentation

### Changed
- Improved tool-call-box component functionality
- Updated package metadata and dependencies

### Fixed
- Minor UI improvements and bug fixes

## [0.0.7] - 2025-07-24

### Changed
- Version bump and maintenance updates

## [0.0.6] - 2024-12-30
### Changed
- Updated version to 0.0.6
- Documentation updates and improvements
- Minor bug fixes and enhancements

## [0.0.5] - 2024-12-29

### Added
- **New Anthropic Models**: Added latest Claude models
  - `claude-3-7-sonnet-latest` (Latest Claude 3.7 Sonnet)
  - `claude-sonnet-4-20250514` (Claude Sonnet 4)
  - `claude-opus-4-20250514` (Claude Opus 4)
  - Updated default Anthropic model to `claude-3-7-sonnet-latest`
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