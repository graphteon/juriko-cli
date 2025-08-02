# JURIKO CLI Improvement Plan - Based on Claude Code Analysis

This document outlines the improvement plan for JURIKO CLI based on reverse engineering analysis of Claude Code patterns and best practices.

## 📊 Analysis Summary

### Claude Code Key Patterns Identified:
- **Concise Communication**: < 4 lines responses unless detail requested
- **Multi-Tool Batching**: Parallel execution for performance
- **Code References**: Clickable [`file:line`](file:line) format navigation
- **Proactive Task Management**: Frequent TodoWrite usage with real-time updates
- **Enhanced Security**: Malicious code detection and input validation
- **Specialized Agents**: Task delegation to specialized subagents
- **Advanced Search**: Dedicated Grep, Glob, and search tools
- **Git Integration**: Sophisticated commit formatting and PR workflows

### JURIKO CLI Current State:
- Verbose responses with detailed explanations
- Sequential tool execution
- Basic file references without line numbers
- Simple todo functionality
- Basic validation
- Single agent architecture
- Bash-based searching
- Basic git command support

## 🎯 Improvement Opportunities

### 1. **Communication Style & Response Optimization**
**Issue**: Verbose responses, unnecessary explanations
**Solution**: Implement concise mode with configurable verbosity

### 2. **Multi-Tool Batching**
**Issue**: Sequential tool execution impacts performance
**Solution**: Parallel execution for independent operations

### 3. **Code Reference System**
**Issue**: Basic file references without navigation
**Solution**: Clickable code references with line numbers

### 4. **Enhanced Security & Validation**
**Issue**: Basic input validation
**Solution**: Comprehensive security framework with malicious code detection

### 5. **Advanced Task Management**
**Issue**: Manual todo management
**Solution**: Auto-detection and proactive task breakdown

### 6. **Git Integration & Workflow**
**Issue**: Basic bash git commands
**Solution**: Dedicated git tools with proper formatting

### 7. **Search & Discovery Enhancement**
**Issue**: Bash-based searching limitations
**Solution**: Specialized search tools (ripgrep, glob)

### 8. **Specialized Agent System**
**Issue**: Single agent handles all tasks
**Solution**: Specialized agents for specific domains

## 🚀 Implementation Plan

### **PHASE 1: Core System Prompt Overhaul (Week 1-2)**
**Priority: HIGH**

#### Files to Create/Modify:
- `src/agent/prompts/system-prompt-builder.ts` (NEW)
- `src/utils/response-formatter.ts` (NEW)
- `src/agent/multi-llm-agent.ts:236` (MODIFY)
- `src/index.ts:70` (MODIFY)

#### Implementation Details:

**1.1 Modular System Prompt Architecture**
```typescript
// src/agent/prompts/system-prompt-builder.ts
export interface PromptOptions {
  concise: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  customInstructions?: string;
  workingDirectory: string;
}

export class SystemPromptBuilder {
  static buildPrompt(options: PromptOptions): string {
    const basePrompt = this.getBasePrompt();
    const styleGuidelines = this.getStyleGuidelines(options.concise);
    const securityGuidelines = this.getSecurityGuidelines(options.securityLevel);
    const toolUsageRules = this.getToolUsageRules();
    
    return [
      basePrompt,
      styleGuidelines,
      securityGuidelines,
      toolUsageRules,
      options.customInstructions || ''
    ].filter(Boolean).join('\n\n');
  }

  private static getStyleGuidelines(concise: boolean): string {
    return concise ? `
COMMUNICATION STYLE:
- Be concise and direct (< 4 lines unless detail requested)
- No unnecessary preamble ("Great!", "Certainly!")
- Answer directly without elaboration unless asked
- One word answers when appropriate
- Minimize output tokens while maintaining helpfulness
    ` : `
COMMUNICATION STYLE:
- Provide helpful explanations and context
- Include reasoning for complex operations
- Offer additional guidance when beneficial
    `;
  }

  private static getSecurityGuidelines(level: string): string {
    const baseGuidelines = `
SECURITY GUIDELINES:
- Validate all file operations for safety
- Sanitize user inputs and command arguments
- Never execute potentially harmful commands without confirmation
    `;

    if (level === 'high') {
      return baseGuidelines + `
- Refuse malicious code creation or modification
- Audit and log all security-sensitive operations
- Require explicit confirmation for system modifications
      `;
    }

    return baseGuidelines;
  }
}
```

**1.2 Response Style Controls**
```typescript
// src/utils/response-formatter.ts
export interface ResponseStyle {
  concise: boolean;
  maxLines: number;
  includeExplanations: boolean;
  skipPreamble: boolean;
}

export class ResponseFormatter {
  static formatResponse(content: string, style: ResponseStyle): string {
    if (!style.concise) return content;
    
    let formatted = content;
    
    if (style.skipPreamble) {
      formatted = this.removePreamble(formatted);
    }
    
    if (!style.includeExplanations) {
      formatted = this.removeExplanations(formatted);
    }
    
    if (style.maxLines > 0) {
      formatted = this.limitLines(formatted, style.maxLines);
    }
    
    return formatted;
  }

  private static removePreamble(content: string): string {
    // Remove common preambles
    const preambles = [
      /^(Great|Certainly|Sure|Okay|Alright)[!,.]?\s*/i,
      /^I'll\s+/i,
      /^Let me\s+/i
    ];
    
    let result = content;
    for (const pattern of preambles) {
      result = result.replace(pattern, '');
    }
    
    return result.trim();
  }

  private static removeExplanations(content: string): string {
    // Remove explanatory sentences that start with common patterns
    const explanationPatterns = [
      /This will\s+.+?\./g,
      /This allows\s+.+?\./g,
      /Here's what\s+.+?\./g
    ];
    
    let result = content;
    for (const pattern of explanationPatterns) {
      result = result.replace(pattern, '');
    }
    
    return result.trim();
  }

  private static limitLines(content: string, maxLines: number): string {
    const lines = content.split('\n');
    if (lines.length <= maxLines) return content;
    
    return lines.slice(0, maxLines).join('\n') + '\n[...truncated]';
  }
}
```

**1.3 CLI Flag Integration**
```typescript
// Modify src/index.ts:70
program
  .name("juriko")
  .description("JURIKO - A conversational AI CLI tool with text editor capabilities")
  .version(packageJson.version)
  .option("-d, --directory <dir>", "set working directory", process.cwd())
  .option("-k, --api-key <key>", "AI API key (or set JURIKO_API_KEY env var)")
  .option("-u, --base-url <url>", "AI API base URL (or set JURIKO_BASE_URL env var)")
  .option("--concise", "enable concise response mode (< 4 lines)")
  .option("--verbose", "enable verbose response mode with explanations")
  .option("--security-level <level>", "set security validation level (low|medium|high)", "medium")
```

### **PHASE 2: Multi-Tool Batching (Week 3-4)**
**Priority: HIGH**

#### Files to Create/Modify:
- `src/tools/batch-executor.ts` (NEW)
- `src/agent/multi-llm-agent.ts:747` (MODIFY)

#### Implementation Details:

**2.1 Batch Tool Executor**
```typescript
// src/tools/batch-executor.ts
export interface BatchResult {
  results: ToolResult[];
  executionTime: number;
  parallelCount: number;
}

export class BatchToolExecutor {
  async executeBatch(toolCalls: LLMToolCall[]): Promise<BatchResult> {
    const startTime = Date.now();
    const batches = this.identifyIndependentTools(toolCalls);
    const results: ToolResult[] = [];
    
    for (const batch of batches) {
      if (batch.length === 1) {
        // Single tool execution
        const result = await this.executeSingle(batch[0]);
        results.push(result);
      } else {
        // Parallel execution
        const batchResults = await this.executeParallel(batch);
        results.push(...batchResults);
      }
    }
    
    return {
      results,
      executionTime: Date.now() - startTime,
      parallelCount: batches.filter(b => b.length > 1).length
    };
  }

  private identifyIndependentTools(toolCalls: LLMToolCall[]): LLMToolCall[][] {
    // Group tools that can run in parallel
    const readOnlyTools = ['view_file', 'bash_read_only'];
    const writeTools = ['create_file', 'str_replace_editor'];
    
    const batches: LLMToolCall[][] = [];
    const readOnlyBatch: LLMToolCall[] = [];
    
    for (const toolCall of toolCalls) {
      if (readOnlyTools.includes(toolCall.function.name)) {
        readOnlyBatch.push(toolCall);
      } else {
        // Write operations must be sequential
        if (readOnlyBatch.length > 0) {
          batches.push([...readOnlyBatch]);
          readOnlyBatch.length = 0;
        }
        batches.push([toolCall]);
      }
    }
    
    if (readOnlyBatch.length > 0) {
      batches.push(readOnlyBatch);
    }
    
    return batches;
  }

  private async executeParallel(batch: LLMToolCall[]): Promise<ToolResult[]> {
    const promises = batch.map(toolCall => this.executeSingle(toolCall));
    return Promise.all(promises);
  }
}
```

### **PHASE 3: Code Reference System (Week 5)**
**Priority: MEDIUM**

#### Files to Create/Modify:
- `src/tools/code-reference.ts` (NEW)
- `src/tools/text-editor.ts` (MODIFY)
- `src/ui/components/enhanced-tool-display.tsx` (NEW)

#### Implementation Details:

**3.1 Code Reference Manager**
```typescript
// src/tools/code-reference.ts
export interface CodeReference {
  file: string;
  line?: number;
  column?: number;
  context?: string;
}

export class CodeReferenceManager {
  static formatReference(file: string, line?: number): string {
    return line ? `[${file}:${line}](${file}:${line})` : `[${file}](${file})`;
  }

  static parseReference(reference: string): CodeReference | null {
    const match = reference.match(/\[([^\]]+):(\d+)\]/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2])
      };
    }
    
    const fileMatch = reference.match(/\[([^\]]+)\]/);
    if (fileMatch) {
      return {
        file: fileMatch[1]
      };
    }
    
    return null;
  }

  static generateClickableLink(file: string, line?: number): string {
    // Generate VSCode-compatible links
    const vscodeUrl = `vscode://file/${process.cwd()}/${file}${line ? `:${line}` : ''}`;
    return `[${file}${line ? `:${line}` : ''}](${vscodeUrl})`;
  }

  static extractReferencesFromContent(content: string): CodeReference[] {
    const references: CodeReference[] = [];
    const patterns = [
      /([a-zA-Z0-9_\-\/\.]+\.(ts|js|tsx|jsx|py|java|cpp|h)):(\d+)/g,
      /in file ([a-zA-Z0-9_\-\/\.]+\.(ts|js|tsx|jsx|py|java|cpp|h))/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        references.push({
          file: match[1],
          line: match[3] ? parseInt(match[3]) : undefined
        });
      }
    }
    
    return references;
  }
}
```

### **PHASE 4: Security Enhancement (Week 6)**
**Priority: MEDIUM**

#### Files to Create/Modify:
- `src/security/security-validator.ts` (NEW)
- `src/security/malicious-patterns.ts` (NEW)
- `src/tools/confirmation-tool.ts` (MODIFY)

### **PHASE 5: Advanced Search Tools (Week 7-8)**
**Priority: LOW**

#### Files to Create/Modify:
- `src/tools/search-tools.ts` (NEW)
- `src/tools/ripgrep-tool.ts` (NEW)
- `src/tools/glob-tool.ts` (NEW)

### **PHASE 6: Specialized Agent System (Week 9-10)**
**Priority: LOW**

#### Files to Create/Modify:
- `src/agents/base-agent.ts` (NEW)
- `src/agents/code-reviewer-agent.ts` (NEW)
- `src/agents/security-analyzer-agent.ts` (NEW)
- `src/agents/agent-manager.ts` (NEW)

## 📋 Implementation Checklist

### Phase 1: System Prompt Overhaul
- [ ] Create `SystemPromptBuilder` class
- [ ] Implement `ResponseFormatter` utility
- [ ] Add CLI flags for response style
- [ ] Update agent constructor
- [ ] Test concise vs verbose modes
- [ ] Update documentation

### Phase 2: Multi-Tool Batching
- [ ] Create `BatchToolExecutor` class
- [ ] Implement dependency detection
- [ ] Add parallel execution logic
- [ ] Update agent tool execution loop
- [ ] Performance benchmarking
- [ ] Error handling for batch operations

### Phase 3: Code Reference System
- [ ] Create `CodeReferenceManager` class
- [ ] Update tool responses with references
- [ ] Implement clickable links
- [ ] VSCode integration testing
- [ ] UI component updates

### Phase 4: Security Enhancement
- [ ] Create `SecurityValidator` class
- [ ] Implement malicious pattern detection
- [ ] Update confirmation system
- [ ] Add security logging
- [ ] Security testing

### Phase 5: Advanced Search Tools
- [ ] Create `RipgrepTool` class
- [ ] Create `GlobTool` class
- [ ] Implement semantic search
- [ ] Update tool registry
- [ ] Performance optimization

### Phase 6: Specialized Agent System
- [ ] Create base agent architecture
- [ ] Implement code reviewer agent
- [ ] Implement security analyzer agent
- [ ] Create agent manager
- [ ] Integration testing

## 🔧 Technical Specifications

### Configuration Options
```typescript
// src/config/improvement-config.ts
export interface ImprovementConfig {
  responseStyle: {
    concise: boolean;
    maxLines: number;
    includeExplanations: boolean;
  };
  security: {
    level: 'low' | 'medium' | 'high';
    enableMaliciousDetection: boolean;
    requireConfirmation: boolean;
  };
  performance: {
    enableBatching: boolean;
    maxParallelTools: number;
    cacheResults: boolean;
  };
  features: {
    enableCodeReferences: boolean;
    enableSpecializedAgents: boolean;
    enableAdvancedSearch: boolean;
  };
}
```

### User Settings Integration
```typescript
// Update src/utils/user-settings.ts
export interface UserSettings {
  // ... existing settings
  improvements?: ImprovementConfig;
  enabledFeatures?: string[];
  experimentalFeatures?: string[];
}
```

## 📊 Success Metrics

### Performance Metrics:
- **Response Time**: 50% reduction for batched operations
- **Token Usage**: 30% reduction with concise mode
- **User Satisfaction**: Measured via feedback system

### Quality Metrics:
- **Security**: Zero malicious code execution incidents
- **Accuracy**: Maintain current accuracy while improving speed
- **Usability**: Improved task completion rates

## 🚦 Rollout Strategy

### Phase 1: Internal Testing (Week 1-2)
- Implement core improvements
- Internal testing with development team
- Performance benchmarking

### Phase 2: Beta Release (Week 3-4)
- Feature flags for gradual rollout
- Beta user testing
- Feedback collection and iteration

### Phase 3: Production Release (Week 5-6)
- Full feature rollout
- Documentation updates
- User migration guides

## 🔄 Maintenance Plan

### Regular Updates:
- Monthly security pattern updates
- Quarterly performance optimization reviews
- Bi-annual feature usage analysis

### Monitoring:
- Performance metrics tracking
- Security incident monitoring
- User feedback analysis

## 📚 Documentation Updates Required

### User Documentation:
- Update README.md with new features
- Create feature-specific guides
- Add troubleshooting sections

### Developer Documentation:
- API documentation for new components
- Architecture decision records
- Testing guidelines

## 🎯 Next Steps

1. **Start with Phase 1** - System prompt overhaul for immediate impact
2. **Create feature flags** for gradual rollout
3. **Set up monitoring** for performance tracking
4. **Establish feedback loops** for continuous improvement

This improvement plan will transform JURIKO CLI into a more efficient, secure, and user-friendly tool that matches the sophistication of Claude Code while maintaining its unique strengths.