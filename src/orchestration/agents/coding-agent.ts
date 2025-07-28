import { BaseAgent } from '../base-agent';
import { Task, TaskResult, AgentProfile, AgentSpecialization } from '../types';
import { LLMClient } from '../../llm/client';
import { MultiLLMAgent } from '../../agent/multi-llm-agent';

export class CodingAgent extends BaseAgent {
  private multiLLMAgent: MultiLLMAgent;

  constructor(llmClient: LLMClient) {
    const profile: AgentProfile = {
      id: 'coding-001',
      name: 'Coding Agent',
      description: 'Specialized agent for software development, code analysis, and programming tasks',
      capabilities: [
        {
          name: 'code_generation',
          description: 'Generate new code files and functions',
          priority: 10,
          tools: ['create_file', 'str_replace_editor']
        },
        {
          name: 'code_analysis',
          description: 'Analyze existing code for bugs, improvements, and patterns',
          priority: 9,
          tools: ['view_file', 'bash']
        },
        {
          name: 'refactoring',
          description: 'Refactor and optimize existing code',
          priority: 9,
          tools: ['str_replace_editor', 'view_file']
        },
        {
          name: 'debugging',
          description: 'Debug and fix code issues',
          priority: 8,
          tools: ['view_file', 'str_replace_editor', 'bash']
        },
        {
          name: 'documentation',
          description: 'Generate code documentation and comments',
          priority: 7,
          tools: ['str_replace_editor', 'create_file']
        }
      ],
      systemPrompt: '',
      maxConcurrentTasks: 3,
      specialization: AgentSpecialization.CODING
    };

    super(profile, llmClient);
    this.multiLLMAgent = new MultiLLMAgent(llmClient);
  }

  canHandleTask(task: Task): boolean {
    const codingKeywords = [
      'code', 'program', 'function', 'class', 'implement', 'develop',
      'bug', 'fix', 'debug', 'refactor', 'optimize', 'algorithm',
      'api', 'library', 'framework', 'test', 'unit test', 'integration',
      'typescript', 'javascript', 'python', 'java', 'react', 'node',
      'component', 'module', 'package', 'dependency', 'build', 'compile'
    ];

    const description = task.description.toLowerCase();
    const hasCodingKeywords = codingKeywords.some(keyword => description.includes(keyword));
    
    const hasCodingCapabilities = task.requiredCapabilities.some(cap => 
      this.profile.capabilities.some(agentCap => agentCap.name === cap)
    );

    return hasCodingKeywords || hasCodingCapabilities;
  }

  async executeTask(task: Task): Promise<TaskResult> {
    try {
      // Determine the type of coding task
      const taskType = this.identifyTaskType(task);
      
      switch (taskType) {
        case 'code_generation':
          return await this.handleCodeGeneration(task);
        case 'code_analysis':
          return await this.handleCodeAnalysis(task);
        case 'debugging':
          return await this.handleDebugging(task);
        case 'refactoring':
          return await this.handleRefactoring(task);
        case 'documentation':
          return await this.handleDocumentation(task);
        default:
          return await this.handleGenericCodingTask(task);
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Coding task failed: ${error.message}`
      };
    }
  }

  private identifyTaskType(task: Task): string {
    const description = task.description.toLowerCase();
    
    if (description.includes('create') || description.includes('implement') || description.includes('generate')) {
      return 'code_generation';
    }
    if (description.includes('analyze') || description.includes('review') || description.includes('examine')) {
      return 'code_analysis';
    }
    if (description.includes('debug') || description.includes('fix') || description.includes('error')) {
      return 'debugging';
    }
    if (description.includes('refactor') || description.includes('optimize') || description.includes('improve')) {
      return 'refactoring';
    }
    if (description.includes('document') || description.includes('comment') || description.includes('readme')) {
      return 'documentation';
    }
    
    return 'generic';
  }

  private async handleCodeGeneration(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please generate the requested code. Focus on:
1. Clean, readable, and maintainable code
2. Proper error handling
3. Appropriate comments and documentation
4. Following best practices for the language/framework
5. Creating necessary files and directory structure

Use the available tools to create files and implement the solution.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    // Check if the task was completed successfully
    const hasErrors = chatEntries.some(entry => 
      entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success
    );

    if (hasErrors) {
      const errorMessages = chatEntries
        .filter(entry => entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success)
        .map(entry => entry.toolResult?.error)
        .join(', ');

      return {
        success: false,
        error: `Code generation failed: ${errorMessages}`,
        metadata: { chatEntries }
      };
    }

    const successfulOperations = chatEntries.filter(entry => 
      entry.type === 'tool_result' && entry.toolResult && entry.toolResult.success
    ).length;

    return {
      success: true,
      output: `Code generation completed successfully. ${successfulOperations} operations executed.`,
      metadata: { 
        chatEntries,
        operationsCount: successfulOperations,
        taskType: 'code_generation'
      }
    };
  }

  private async handleCodeAnalysis(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please analyze the code as requested. Focus on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security vulnerabilities
5. Maintainability and readability
6. Suggestions for improvement

Use the available tools to examine files and provide a comprehensive analysis.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    // Extract analysis results from the conversation
    const analysisContent = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    return {
      success: true,
      output: analysisContent || 'Code analysis completed.',
      metadata: { 
        chatEntries,
        taskType: 'code_analysis'
      }
    };
  }

  private async handleDebugging(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please debug the issue as requested. Focus on:
1. Identifying the root cause of the problem
2. Providing a clear explanation of what's wrong
3. Implementing the fix
4. Testing the solution
5. Preventing similar issues in the future

Use the available tools to examine files, identify issues, and implement fixes.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const hasErrors = chatEntries.some(entry => 
      entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success
    );

    if (hasErrors) {
      const errorMessages = chatEntries
        .filter(entry => entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success)
        .map(entry => entry.toolResult?.error)
        .join(', ');

      return {
        success: false,
        error: `Debugging failed: ${errorMessages}`,
        metadata: { chatEntries }
      };
    }

    const debuggingResults = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    return {
      success: true,
      output: debuggingResults || 'Debugging completed successfully.',
      metadata: { 
        chatEntries,
        taskType: 'debugging'
      }
    };
  }

  private async handleRefactoring(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please refactor the code as requested. Focus on:
1. Improving code structure and organization
2. Enhancing readability and maintainability
3. Optimizing performance where appropriate
4. Removing code duplication
5. Following modern best practices
6. Preserving existing functionality

Use the available tools to examine and modify files as needed.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const hasErrors = chatEntries.some(entry => 
      entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success
    );

    if (hasErrors) {
      const errorMessages = chatEntries
        .filter(entry => entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success)
        .map(entry => entry.toolResult?.error)
        .join(', ');

      return {
        success: false,
        error: `Refactoring failed: ${errorMessages}`,
        metadata: { chatEntries }
      };
    }

    const successfulOperations = chatEntries.filter(entry => 
      entry.type === 'tool_result' && entry.toolResult && entry.toolResult.success
    ).length;

    return {
      success: true,
      output: `Refactoring completed successfully. ${successfulOperations} operations executed.`,
      metadata: { 
        chatEntries,
        operationsCount: successfulOperations,
        taskType: 'refactoring'
      }
    };
  }

  private async handleDocumentation(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please create documentation as requested. Focus on:
1. Clear and comprehensive explanations
2. Code examples and usage patterns
3. API documentation if applicable
4. Installation and setup instructions
5. Best practices and guidelines
6. Troubleshooting information

Use the available tools to create or update documentation files.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const hasErrors = chatEntries.some(entry => 
      entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success
    );

    if (hasErrors) {
      const errorMessages = chatEntries
        .filter(entry => entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success)
        .map(entry => entry.toolResult?.error)
        .join(', ');

      return {
        success: false,
        error: `Documentation creation failed: ${errorMessages}`,
        metadata: { chatEntries }
      };
    }

    const successfulOperations = chatEntries.filter(entry => 
      entry.type === 'tool_result' && entry.toolResult && entry.toolResult.success
    ).length;

    return {
      success: true,
      output: `Documentation created successfully. ${successfulOperations} operations executed.`,
      metadata: { 
        chatEntries,
        operationsCount: successfulOperations,
        taskType: 'documentation'
      }
    };
  }

  private async handleGenericCodingTask(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please complete this coding task. Use your expertise to determine the best approach and implement the solution using the available tools.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const hasErrors = chatEntries.some(entry => 
      entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success
    );

    if (hasErrors) {
      const errorMessages = chatEntries
        .filter(entry => entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success)
        .map(entry => entry.toolResult?.error)
        .join(', ');

      return {
        success: false,
        error: `Coding task failed: ${errorMessages}`,
        metadata: { chatEntries }
      };
    }

    const results = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    return {
      success: true,
      output: results || 'Coding task completed successfully.',
      metadata: { 
        chatEntries,
        taskType: 'generic'
      }
    };
  }

  getSpecializedSystemPrompt(): string {
    return `You are a Coding Agent specialized in software development and programming tasks. You have expertise in:

- Multiple programming languages (TypeScript, JavaScript, Python, Java, etc.)
- Web development frameworks (React, Node.js, Express, etc.)
- Software architecture and design patterns
- Code quality and best practices
- Testing and debugging
- Performance optimization
- Security considerations

Your approach to coding tasks:
1. Always analyze requirements thoroughly before implementing
2. Write clean, maintainable, and well-documented code
3. Follow language-specific best practices and conventions
4. Include proper error handling and edge case considerations
5. Consider performance and security implications
6. Provide clear explanations of your implementation decisions

When working with existing code:
- Always examine the current codebase first to understand the context
- Maintain consistency with existing patterns and style
- Preserve functionality while making improvements
- Document any breaking changes or migration requirements

Use the available tools effectively to view files, create new code, and make precise edits.`;
  }
}