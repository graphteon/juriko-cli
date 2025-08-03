export interface ResponseStyle {
  concise: boolean;
  maxLines: number;
  includeExplanations: boolean;
  skipPreamble: boolean;
  skipPostamble: boolean;
}

export interface ResponseMetrics {
  originalLength: number;
  formattedLength: number;
  linesRemoved: number;
  tokensReduced: number;
}

export class ResponseFormatter {
  private static readonly PREAMBLE_PATTERNS = [
    /^(Great|Certainly|Sure|Okay|Alright)[!,.]?\s*/i,
    /^I'll\s+/i,
    /^Let me\s+/i,
    /^I'm going to\s+/i,
    /^I will\s+/i,
    /^I can\s+/i,
    /^I've\s+/i,
    /^Here's what I'll do:\s*/i,
    /^Here's how I'll\s+/i
  ];

  private static readonly POSTAMBLE_PATTERNS = [
    /\s*Let me know if you need.*$/i,
    /\s*Feel free to ask.*$/i,
    /\s*Is there anything else.*$/i,
    /\s*Would you like me to.*$/i,
    /\s*Do you want me to.*$/i,
    /\s*Hope this helps.*$/i,
    /\s*This should help.*$/i
  ];

  private static readonly EXPLANATION_PATTERNS = [
    /This will\s+.+?\./g,
    /This allows\s+.+?\./g,
    /Here's what\s+.+?\./g,
    /The reason\s+.+?\./g,
    /This is because\s+.+?\./g,
    /Note that\s+.+?\./g,
    /Keep in mind\s+.+?\./g
  ];

  static formatResponse(content: string, style: ResponseStyle): ResponseMetrics {
    const originalLength = content.length;
    let formatted = content;
    let linesRemoved = 0;

    if (style.skipPreamble) {
      const beforePreamble = formatted;
      formatted = this.removePreamble(formatted);
      if (formatted !== beforePreamble) {
        linesRemoved += this.countLines(beforePreamble) - this.countLines(formatted);
      }
    }

    if (style.skipPostamble) {
      const beforePostamble = formatted;
      formatted = this.removePostamble(formatted);
      if (formatted !== beforePostamble) {
        linesRemoved += this.countLines(beforePostamble) - this.countLines(formatted);
      }
    }

    if (!style.includeExplanations) {
      const beforeExplanations = formatted;
      formatted = this.removeExplanations(formatted);
      if (formatted !== beforeExplanations) {
        linesRemoved += this.countLines(beforeExplanations) - this.countLines(formatted);
      }
    }

    if (style.maxLines > 0) {
      const beforeLimit = formatted;
      formatted = this.limitLines(formatted, style.maxLines);
      if (formatted !== beforeLimit) {
        linesRemoved += this.countLines(beforeLimit) - this.countLines(formatted);
      }
    }

    // Clean up extra whitespace
    formatted = this.cleanupWhitespace(formatted);

    return {
      originalLength,
      formattedLength: formatted.length,
      linesRemoved,
      tokensReduced: Math.floor((originalLength - formatted.length) / 4) // Rough token estimation
    };
  }

  static formatResponseContent(content: string, style: ResponseStyle): string {
    const originalLength = content.length;
    let formatted = content;

    if (style.skipPreamble) {
      formatted = this.removePreamble(formatted);
    }

    if (style.skipPostamble) {
      formatted = this.removePostamble(formatted);
    }

    if (!style.includeExplanations) {
      formatted = this.removeExplanations(formatted);
    }

    if (style.maxLines > 0) {
      formatted = this.limitLines(formatted, style.maxLines);
    }

    return this.cleanupWhitespace(formatted);
  }

  private static removePreamble(content: string): string {
    let result = content;
    
    for (const pattern of this.PREAMBLE_PATTERNS) {
      result = result.replace(pattern, '');
    }
    
    return result.trim();
  }

  private static removePostamble(content: string): string {
    let result = content;
    
    for (const pattern of this.POSTAMBLE_PATTERNS) {
      result = result.replace(pattern, '');
    }
    
    return result.trim();
  }

  private static removeExplanations(content: string): string {
    let result = content;
    
    for (const pattern of this.EXPLANATION_PATTERNS) {
      result = result.replace(pattern, '');
    }
    
    return result.trim();
  }

  private static limitLines(content: string, maxLines: number): string {
    const lines = content.split('\n');
    if (lines.length <= maxLines) return content;
    
    const truncatedLines = lines.slice(0, maxLines);
    const remainingLines = lines.length - maxLines;
    
    return truncatedLines.join('\n') + `\n\n[...${remainingLines} more lines truncated]`;
  }

  private static cleanupWhitespace(content: string): string {
    return content
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .replace(/^\s+|\s+$/g, '') // Trim start and end
      .replace(/[ \t]+$/gm, ''); // Remove trailing spaces
  }

  private static countLines(content: string): number {
    return content.split('\n').length;
  }

  static detectVerbosity(content: string): number {
    // Return verbosity score (0-100)
    let score = 0;
    
    // Check for preambles
    for (const pattern of this.PREAMBLE_PATTERNS) {
      if (pattern.test(content)) score += 15;
    }
    
    // Check for postambles
    for (const pattern of this.POSTAMBLE_PATTERNS) {
      if (pattern.test(content)) score += 15;
    }
    
    // Check for explanations
    const explanationMatches = content.match(/This (will|allows|is)/g) || [];
    score += Math.min(explanationMatches.length * 10, 30);
    
    // Check line count
    const lineCount = this.countLines(content);
    if (lineCount > 10) score += 20;
    if (lineCount > 20) score += 20;
    
    return Math.min(score, 100);
  }

  static createConciseStyle(): ResponseStyle {
    return {
      concise: true,
      maxLines: 4,
      includeExplanations: false,
      skipPreamble: true,
      skipPostamble: true
    };
  }

  static createVerboseStyle(): ResponseStyle {
    return {
      concise: false,
      maxLines: 0, // No limit
      includeExplanations: true,
      skipPreamble: false,
      skipPostamble: false
    };
  }

  static createBalancedStyle(): ResponseStyle {
    return {
      concise: false,
      maxLines: 15,
      includeExplanations: true,
      skipPreamble: true,
      skipPostamble: true
    };
  }
}