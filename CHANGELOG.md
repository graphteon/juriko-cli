# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2025-08-03

### Added
- **Code Reference System**: Clickable file references with VSCode integration
  - `--enable-code-references`: Enable clickable file references (default: enabled)
  - `--disable-code-references`: Disable clickable file references
  - `KILOCODE_ENABLE_CODE_REFERENCES`: Environment variable to control code references
- **CodeReferenceManager**: Intelligent file reference detection and link generation
- **VSCode Integration**: Direct navigation to files and specific line numbers
- **Automatic Enhancement**: Tool outputs automatically include clickable references
- **Context Display**: Show code context around referenced lines

### Improved
- **Tool Responses**: All file references now include clickable links for easy navigation
- **Error Messages**: Enhanced with clickable references to problematic files and lines
- **System Prompt**: Added code reference guidelines for consistent link formatting
- **Developer Experience**: Seamless navigation between terminal and editor

### Technical Details
- New files: `src/tools/code-reference.ts`, `test/code-reference-test.js`
- Enhanced files: `src/tools/text-editor.ts`, `src/agent/prompts/system-prompt-builder.ts`
- VSCode URL scheme integration for direct file navigation
- Comprehensive reference parsing and validation system

## [0.3.1] - 2025-08-03

### Added
- **Multi-Tool Batching**: Parallel execution of independent tools for improved performance
  - `--enable-batching`: Enable parallel execution of independent tools
  - `--disable-batching`: Disable parallel execution (use sequential execution)
  - `KILOCODE_ENABLE_BATCHING`: Environment variable to control batching
- **BatchToolExecutor**: Intelligent tool dependency analysis and parallel execution
- **Performance Improvements**: Up to 40% faster execution when multiple independent tools are used
- **Smart Dependency Detection**: Automatic categorization of tools by type (read/write/compute/network/bash)
- **Automatic Fallback**: Sequential execution fallback if parallel execution fails

### Improved
- **Tool Execution Logic**: Enhanced agent tool execution with batching support
- **Safety Mechanisms**: Write operations and bash commands remain sequential for safety
- **Performance Monitoring**: Detailed execution metrics and performance tracking

### Technical Details
- New files: `src/tools/batch-executor.ts`, `test/batch-execution-test.js`
- Updated files: `src/agent/multi-llm-agent.ts`, `src/index.ts`, `README.md`
- Enhanced CLI argument parsing for batching flags
- Comprehensive test suite for batch execution functionality

## [0.3.0] - 2025-08-02

### Added
- **Response Style Control**: New `--concise` and `--verbose` CLI flags for controlling response verbosity
- **Modular System Prompt**: New `SystemPromptBuilder` class for dynamic prompt construction
- **Response Formatter**: Advanced text processing with pattern-based optimization
- **Security Levels**: Configurable security validation with `--security-level` option
- **Performance Metrics**: Response optimization tracking and token usage reduction
- **Enhanced Communication Guidelines**: Claude Code-inspired behavioral patterns

### Changed
- **System Prompt Architecture**: Refactored from static to modular prompt building
- **Agent Constructor**: Enhanced with response style configuration and environment detection
- **CLI Interface**: Added new flags for response style and security level control

### Improved
- **Token Efficiency**: Up to 65% reduction in response length for verbose content
- **User Experience**: More direct and focused responses in concise mode
- **Code Quality**: Better separation of concerns with modular prompt system
- **Documentation**: Comprehensive guides for new features and implementation

### Technical Details
- New files: `src/agent/prompts/system-prompt-builder.ts`, `src/utils/response-formatter.ts`
- Updated files: `src/index.ts`, `src/agent/multi-llm-agent.ts`, `package.json`
- Test coverage: Added response style testing and validation
- Performance: Significant token usage optimization for API cost reduction

## [Unreleased]

### Added
- **Conversation Condense Feature**: Intelligent token management system
  - Automatic conversation condensing when token usage reaches 75% of model limit
  - Smart summarization preserving important context, technical details, and recent messages
  - Manual condensing tool (`condense_conversation`) with user confirmation
  - Model-specific token limit detection for all supported providers
  - Structured summaries including previous conversation, current work, technical concepts, and pending tasks

## [0.3.3] - 2025-08-04

### Added
- **System Prompt Overhaul**: Dynamic system prompt generation with context awareness
  - `SystemPromptBuilder`: Modular system prompt construction
  - `ResponseFormatter`: Intelligent response formatting with concise/verbose modes
  - CLI Integration: `--concise`, `--verbose`, `--balanced` response style options
  - Performance: Improved prompt efficiency and response quality
- **Multi-Tool Batching System**: Parallel execution of independent tools
  - `BatchToolExecutor`: Parallel execution engine for independent tools
  - Dependency Detection: Smart analysis of tool dependencies
  - Performance Boost: Up to 60% faster execution for multi-tool operations
  - CLI Flag: `--enable-batching` for beta feature control
- **Code Reference System**: Automatic file reference detection and linking
  - `CodeReferenceManager`: Automatic file reference detection and linking
  - VSCode Integration: Clickable file links with line numbers
  - Markdown Enhancement: Enhanced code blocks with reference links
  - CLI Flag: `--enable-code-references` for beta feature control
- **User Configuration System**: Persistent user settings management
  - Persistent Settings: `~/.juriko/user-settings.json` for user preferences
  - Settings Management: CLI commands (`juriko config show/set/reset`, `juriko settings`)
  - Merge Protection: Fixed critical bug preventing data loss during setting updates
  - Environment Overrides: Support for environment variable configuration
- **Security Enhancement Framework**: Comprehensive security validation and control
  - `SecurityManager`: Comprehensive security validation and control layer
  - Multi-Level Security: Low/Medium/High security levels
  - File Access Control: Path validation, extension filtering, size limits
  - Input Sanitization: XSS and injection protection

### Improved
- **Architecture**: Modular design with clean separation of concerns
- **Type Safety**: Enhanced TypeScript interfaces and type definitions
- **Error Handling**: Robust error handling with user-friendly messages
- **Performance**: Optimized tool execution and response processing
- **User Experience**: Interactive menus with keyboard navigation
- **Developer Experience**: Better code navigation and reference system

### Technical Details
- New files: `src/agent/prompts/system-prompt-builder.ts`, `src/tools/batch-executor.ts`, `src/tools/code-reference.ts`, `src/ui/components/settings-menu.tsx`, `src/utils/response-formatter.ts`, `src/utils/user-settings.ts`, `src/security/security-manager.ts`, `src/security/security-wrapper.ts`
- Updated files: `src/index.ts`, `src/agent/multi-llm-agent.ts`, `src/ui/components/streaming-chat.tsx`, `src/types/index.ts`, `README.md`
- Documentation: `docs/RESPONSE_STYLE_FEATURE.md`, `docs/CODE_REFERENCE_FEATURE.md`
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