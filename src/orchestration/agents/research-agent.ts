import { BaseAgent } from '../base-agent';
import { Task, TaskResult, AgentProfile, AgentSpecialization } from '../types';
import { LLMClient } from '../../llm/client';
import { MultiLLMAgent } from '../../agent/multi-llm-agent';

export class ResearchAgent extends BaseAgent {
  private multiLLMAgent: MultiLLMAgent;

  constructor(llmClient: LLMClient) {
    const profile: AgentProfile = {
      id: 'research-001',
      name: 'Research Agent',
      description: 'Specialized agent for information gathering, analysis, and research tasks',
      capabilities: [
        {
          name: 'web_research',
          description: 'Search and gather information from web sources',
          priority: 10,
          tools: ['bash'] // Can use curl, wget, or MCP web search tools
        },
        {
          name: 'data_analysis',
          description: 'Analyze and synthesize information from multiple sources',
          priority: 9,
          tools: ['view_file', 'create_file']
        },
        {
          name: 'documentation_research',
          description: 'Research technical documentation and APIs',
          priority: 9,
          tools: ['view_file', 'bash']
        },
        {
          name: 'competitive_analysis',
          description: 'Analyze competitors and market trends',
          priority: 8,
          tools: ['create_file', 'bash']
        },
        {
          name: 'fact_checking',
          description: 'Verify information accuracy and credibility',
          priority: 8,
          tools: ['bash', 'view_file']
        },
        {
          name: 'report_generation',
          description: 'Generate comprehensive research reports',
          priority: 7,
          tools: ['create_file', 'str_replace_editor']
        }
      ],
      systemPrompt: '',
      maxConcurrentTasks: 4,
      specialization: AgentSpecialization.RESEARCH
    };

    super(profile, llmClient);
    this.multiLLMAgent = new MultiLLMAgent(llmClient);
  }

  canHandleTask(task: Task): boolean {
    const researchKeywords = [
      'research', 'analyze', 'investigate', 'study', 'examine', 'explore',
      'find information', 'gather data', 'search', 'lookup', 'discover',
      'compare', 'evaluate', 'assess', 'review', 'survey', 'report',
      'documentation', 'api docs', 'examples', 'tutorials', 'guides',
      'best practices', 'trends', 'market analysis', 'competitive analysis',
      'fact check', 'verify', 'validate', 'sources', 'references'
    ];

    const description = task.description.toLowerCase();
    const hasResearchKeywords = researchKeywords.some(keyword => description.includes(keyword));
    
    const hasResearchCapabilities = task.requiredCapabilities.some(cap => 
      this.profile.capabilities.some(agentCap => agentCap.name === cap)
    );

    return hasResearchKeywords || hasResearchCapabilities;
  }

  async executeTask(task: Task): Promise<TaskResult> {
    try {
      // Determine the type of research task
      const taskType = this.identifyTaskType(task);
      
      switch (taskType) {
        case 'web_research':
          return await this.handleWebResearch(task);
        case 'documentation_research':
          return await this.handleDocumentationResearch(task);
        case 'data_analysis':
          return await this.handleDataAnalysis(task);
        case 'competitive_analysis':
          return await this.handleCompetitiveAnalysis(task);
        case 'fact_checking':
          return await this.handleFactChecking(task);
        case 'report_generation':
          return await this.handleReportGeneration(task);
        default:
          return await this.handleGenericResearch(task);
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Research task failed: ${error.message}`
      };
    }
  }

  private identifyTaskType(task: Task): string {
    const description = task.description.toLowerCase();
    
    if (description.includes('web') || description.includes('online') || description.includes('internet')) {
      return 'web_research';
    }
    if (description.includes('documentation') || description.includes('api') || description.includes('docs')) {
      return 'documentation_research';
    }
    if (description.includes('analyze') || description.includes('analysis') || description.includes('data')) {
      return 'data_analysis';
    }
    if (description.includes('competitor') || description.includes('competitive') || description.includes('market')) {
      return 'competitive_analysis';
    }
    if (description.includes('fact') || description.includes('verify') || description.includes('validate')) {
      return 'fact_checking';
    }
    if (description.includes('report') || description.includes('summary') || description.includes('document')) {
      return 'report_generation';
    }
    
    return 'generic';
  }

  private async handleWebResearch(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please conduct web research as requested. Focus on:
1. Identifying reliable and authoritative sources
2. Gathering comprehensive information on the topic
3. Cross-referencing information from multiple sources
4. Organizing findings in a structured manner
5. Providing source citations and references
6. Highlighting key insights and takeaways

You have access to real-time web search capabilities. Use them to gather current and accurate information.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const researchResults = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    const toolOperations = chatEntries.filter(entry => entry.type === 'tool_result').length;

    return {
      success: true,
      output: researchResults || 'Web research completed successfully.',
      metadata: { 
        chatEntries,
        toolOperations,
        taskType: 'web_research',
        sources: this.extractSourcesFromContent(researchResults)
      }
    };
  }

  private async handleDocumentationResearch(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please research documentation as requested. Focus on:
1. Finding official documentation and API references
2. Identifying relevant examples and code samples
3. Understanding implementation patterns and best practices
4. Noting version compatibility and requirements
5. Extracting key concepts and usage guidelines
6. Providing practical implementation guidance

Use available tools to access documentation files and external resources.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const hasErrors = chatEntries.some(entry => 
      entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success
    );

    const researchResults = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    return {
      success: !hasErrors,
      output: researchResults || 'Documentation research completed.',
      metadata: { 
        chatEntries,
        taskType: 'documentation_research',
        hasErrors
      }
    };
  }

  private async handleDataAnalysis(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please analyze the data as requested. Focus on:
1. Examining data structure and quality
2. Identifying patterns, trends, and anomalies
3. Performing statistical analysis where appropriate
4. Drawing meaningful insights and conclusions
5. Visualizing data relationships when possible
6. Providing actionable recommendations

Use available tools to access and analyze data files.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const analysisResults = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    const dataFiles = chatEntries
      .filter(entry => entry.type === 'tool_result' && entry.toolCall?.function.name === 'view_file')
      .map(entry => {
        try {
          const args = JSON.parse(entry.toolCall?.function.arguments || '{}');
          return args.path;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return {
      success: true,
      output: analysisResults || 'Data analysis completed successfully.',
      metadata: { 
        chatEntries,
        taskType: 'data_analysis',
        analyzedFiles: dataFiles
      }
    };
  }

  private async handleCompetitiveAnalysis(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please conduct competitive analysis as requested. Focus on:
1. Identifying key competitors and market players
2. Analyzing competitor strengths and weaknesses
3. Comparing features, pricing, and positioning
4. Identifying market opportunities and threats
5. Benchmarking against industry standards
6. Providing strategic recommendations

Use web research capabilities to gather current market information.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const analysisResults = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    return {
      success: true,
      output: analysisResults || 'Competitive analysis completed successfully.',
      metadata: { 
        chatEntries,
        taskType: 'competitive_analysis',
        competitors: this.extractCompetitorsFromContent(analysisResults)
      }
    };
  }

  private async handleFactChecking(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please fact-check the information as requested. Focus on:
1. Verifying claims against authoritative sources
2. Cross-referencing information from multiple sources
3. Identifying potential misinformation or inaccuracies
4. Providing evidence for or against each claim
5. Rating the credibility and reliability of sources
6. Presenting findings in a clear, objective manner

Use web research capabilities to verify information against reliable sources.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const factCheckResults = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    return {
      success: true,
      output: factCheckResults || 'Fact-checking completed successfully.',
      metadata: { 
        chatEntries,
        taskType: 'fact_checking',
        verifiedClaims: this.extractClaimsFromContent(factCheckResults)
      }
    };
  }

  private async handleReportGeneration(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please generate a research report as requested. Focus on:
1. Creating a well-structured document with clear sections
2. Including executive summary and key findings
3. Providing detailed analysis and supporting evidence
4. Adding relevant charts, tables, or visualizations
5. Including proper citations and references
6. Concluding with actionable recommendations

Use available tools to create comprehensive report documents.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const hasErrors = chatEntries.some(entry => 
      entry.type === 'tool_result' && entry.toolResult && !entry.toolResult.success
    );

    const createdFiles = chatEntries
      .filter(entry => entry.type === 'tool_result' && entry.toolCall?.function.name === 'create_file')
      .map(entry => {
        try {
          const args = JSON.parse(entry.toolCall?.function.arguments || '{}');
          return args.path;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const reportContent = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    return {
      success: !hasErrors,
      output: `Research report generated successfully. Files created: ${createdFiles.join(', ')}`,
      metadata: { 
        chatEntries,
        taskType: 'report_generation',
        createdFiles,
        hasErrors,
        reportContent
      }
    };
  }

  private async handleGenericResearch(task: Task): Promise<TaskResult> {
    const prompt = `${this.getSpecializedSystemPrompt()}

TASK: ${task.description}

Please complete this research task using your expertise to determine the best approach and methodology.`;

    const chatEntries = await this.multiLLMAgent.processUserMessage(prompt);
    
    const researchResults = chatEntries
      .filter(entry => entry.type === 'assistant')
      .map(entry => entry.content)
      .join('\n\n');

    return {
      success: true,
      output: researchResults || 'Research task completed successfully.',
      metadata: { 
        chatEntries,
        taskType: 'generic'
      }
    };
  }

  private extractSourcesFromContent(content: string): string[] {
    // Extract URLs and source references from content
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    const urls = content.match(urlRegex) || [];
    
    // Extract source citations (e.g., "Source: ...", "According to ...")
    const sourceRegex = /(?:Source|According to|From|Via):\s*([^\n]+)/gi;
    const sources = [];
    let match;
    while ((match = sourceRegex.exec(content)) !== null) {
      sources.push(match[1].trim());
    }
    
    return [...urls, ...sources];
  }

  private extractCompetitorsFromContent(content: string): string[] {
    // Extract competitor names from analysis content
    // This is a simplified implementation - could be enhanced with NLP
    const competitorKeywords = ['competitor', 'rival', 'alternative', 'vs', 'compared to'];
    const lines = content.split('\n');
    const competitors: string[] = [];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (competitorKeywords.some(keyword => lowerLine.includes(keyword))) {
        // Extract potential company/product names (capitalized words)
        const capitalizedWords = line.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
        competitors.push(...capitalizedWords);
      }
    }
    
    return [...new Set(competitors)]; // Remove duplicates
  }

  private extractClaimsFromContent(content: string): Array<{claim: string, status: string}> {
    // Extract fact-checked claims and their verification status
    const claims: Array<{claim: string, status: string}> = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('claim:') || lowerLine.includes('statement:')) {
        const claim = line.split(':')[1]?.trim() || '';
        let status = 'unknown';
        
        if (lowerLine.includes('true') || lowerLine.includes('verified') || lowerLine.includes('accurate')) {
          status = 'verified';
        } else if (lowerLine.includes('false') || lowerLine.includes('incorrect') || lowerLine.includes('inaccurate')) {
          status = 'false';
        } else if (lowerLine.includes('partial') || lowerLine.includes('mixed')) {
          status = 'partially_true';
        }
        
        if (claim) {
          claims.push({ claim, status });
        }
      }
    }
    
    return claims;
  }

  getSpecializedSystemPrompt(): string {
    return `You are a Research Agent specialized in information gathering, analysis, and synthesis. You have expertise in:

- Web research and information discovery
- Source evaluation and credibility assessment
- Data analysis and pattern recognition
- Competitive intelligence and market research
- Fact-checking and verification methodologies
- Report writing and documentation

Your approach to research tasks:
1. Always start by clearly defining the research scope and objectives
2. Use multiple sources to cross-verify information
3. Evaluate source credibility and potential bias
4. Organize findings in a logical, structured manner
5. Distinguish between facts, opinions, and speculation
6. Provide proper citations and references
7. Synthesize information to generate actionable insights

Research methodology best practices:
- Primary sources are preferred over secondary sources
- Recent information is generally more valuable than outdated data
- Diverse perspectives provide a more complete picture
- Quantitative data should be verified and contextualized
- Always note limitations and uncertainties in your findings

You have access to real-time web search and can gather current information on any topic. Use this capability to provide up-to-date and accurate research results.`;
  }
}