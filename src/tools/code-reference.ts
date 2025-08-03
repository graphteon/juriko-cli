/**
 * Code Reference System - Phase 3 Implementation
 * Based on Claude Code patterns for clickable file references
 */

import * as path from 'path';
import * as fs from 'fs';

export interface CodeReference {
  file: string;
  line?: number;
  column?: number;
  context?: string;
  absolutePath?: string;
}

export interface ReferenceFormatOptions {
  includeLineNumbers: boolean;
  makeClickable: boolean;
  useRelativePaths: boolean;
  workingDirectory?: string;
}

export class CodeReferenceManager {
  private static workingDirectory: string = process.cwd();

  /**
   * Set the working directory for relative path resolution
   */
  static setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir;
  }

  /**
   * Format a file reference in Claude Code style: [`file:line`](file:line)
   */
  static formatReference(
    file: string, 
    line?: number, 
    options: Partial<ReferenceFormatOptions> = {}
  ): string {
    const opts: ReferenceFormatOptions = {
      includeLineNumbers: true,
      makeClickable: true,
      useRelativePaths: true,
      workingDirectory: this.workingDirectory,
      ...options
    };

    // Resolve file path
    const resolvedFile = opts.useRelativePaths 
      ? this.getRelativePath(file, opts.workingDirectory!)
      : file;

    // Create display text
    const displayText = opts.includeLineNumbers && line 
      ? `${resolvedFile}:${line}`
      : resolvedFile;

    if (!opts.makeClickable) {
      return displayText;
    }

    // Create clickable link
    const linkTarget = this.generateClickableLink(file, line);
    return `[\`${displayText}\`](${linkTarget})`;
  }

  /**
   * Parse a reference string to extract file and line information
   */
  static parseReference(reference: string): CodeReference | null {
    // Match patterns like [`file.ts:123`](link) or [file.ts:123](link)
    const clickableMatch = reference.match(/\[`?([^`\]]+):(\d+)`?\]\([^)]+\)/);
    if (clickableMatch) {
      return {
        file: clickableMatch[1],
        line: parseInt(clickableMatch[2]),
        absolutePath: this.resolveAbsolutePath(clickableMatch[1])
      };
    }

    // Match simple patterns like file.ts:123
    const simpleMatch = reference.match(/([a-zA-Z0-9_\-\/\.\\]+\.(ts|js|tsx|jsx|py|java|cpp|h|md|json|yaml|yml)):(\d+)/);
    if (simpleMatch) {
      return {
        file: simpleMatch[1],
        line: parseInt(simpleMatch[3]),
        absolutePath: this.resolveAbsolutePath(simpleMatch[1])
      };
    }

    // Match file-only patterns
    const fileMatch = reference.match(/\[`?([^`\]]+)`?\]\([^)]+\)/);
    if (fileMatch) {
      return {
        file: fileMatch[1],
        absolutePath: this.resolveAbsolutePath(fileMatch[1])
      };
    }

    return null;
  }

  /**
   * Generate a clickable link compatible with VSCode and other editors
   */
  static generateClickableLink(file: string, line?: number): string {
    const absolutePath = this.resolveAbsolutePath(file);
    
    // VSCode URL scheme
    const vscodeUrl = `vscode://file${absolutePath}${line ? `:${line}` : ''}`;
    
    // Also support file:// protocol for broader compatibility
    const fileUrl = `file://${absolutePath}${line ? `#L${line}` : ''}`;
    
    // Return VSCode URL as primary, with file URL as fallback
    return vscodeUrl;
  }

  /**
   * Extract code references from content automatically
   */
  static extractReferencesFromContent(content: string): CodeReference[] {
    const references: CodeReference[] = [];
    
    // Patterns to match various reference formats
    const patterns = [
      // file.ext:line patterns
      /([a-zA-Z0-9_\-\/\.\\]+\.(ts|js|tsx|jsx|py|java|cpp|h|md|json|yaml|yml)):(\d+)/g,
      // "in file" patterns
      /in file ([a-zA-Z0-9_\-\/\.\\]+\.(ts|js|tsx|jsx|py|java|cpp|h|md|json|yaml|yml))/g,
      // "at line" patterns
      /at line (\d+) in ([a-zA-Z0-9_\-\/\.\\]+\.(ts|js|tsx|jsx|py|java|cpp|h|md|json|yaml|yml))/g,
      // Error stack trace patterns
      /at .+ \(([^:]+):(\d+):(\d+)\)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let file: string;
        let line: number | undefined;
        let column: number | undefined;

        if (pattern.source.includes('at line')) {
          // "at line X in file" pattern
          line = parseInt(match[1]);
          file = match[2];
        } else if (pattern.source.includes('at .+')) {
          // Stack trace pattern
          file = match[1];
          line = parseInt(match[2]);
          column = parseInt(match[3]);
        } else if (match[3]) {
          // file:line pattern
          file = match[1];
          line = parseInt(match[3]);
        } else {
          // file only pattern
          file = match[1];
        }

        // Validate file exists
        if (this.fileExists(file)) {
          references.push({
            file,
            line,
            column,
            absolutePath: this.resolveAbsolutePath(file)
          });
        }
      }
    }

    // Remove duplicates
    return this.deduplicateReferences(references);
  }

  /**
   * Enhance tool output with clickable references
   */
  static enhanceWithReferences(content: string): string {
    const references = this.extractReferencesFromContent(content);
    let enhancedContent = content;

    for (const ref of references) {
      const originalPattern = ref.line 
        ? `${ref.file}:${ref.line}`
        : ref.file;
      
      const clickableRef = this.formatReference(ref.file, ref.line);
      
      // Replace first occurrence to avoid double-replacement
      enhancedContent = enhancedContent.replace(originalPattern, clickableRef);
    }

    return enhancedContent;
  }

  /**
   * Create a reference for a specific location in code
   */
  static createReference(
    file: string, 
    line?: number, 
    context?: string
  ): CodeReference {
    return {
      file,
      line,
      context,
      absolutePath: this.resolveAbsolutePath(file)
    };
  }

  /**
   * Validate if a file reference is valid
   */
  static validateReference(ref: CodeReference): boolean {
    if (!ref.file) return false;
    
    const absolutePath = ref.absolutePath || this.resolveAbsolutePath(ref.file);
    
    // Check if file exists
    if (!this.fileExists(ref.file)) return false;
    
    // If line is specified, validate it's within file bounds
    if (ref.line) {
      return this.validateLineNumber(ref.file, ref.line);
    }
    
    return true;
  }

  /**
   * Get file content around a specific line for context
   */
  static getContextAroundLine(
    file: string, 
    line: number, 
    contextLines: number = 3
  ): string | null {
    try {
      const absolutePath = this.resolveAbsolutePath(file);
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n');
      
      const startLine = Math.max(0, line - contextLines - 1);
      const endLine = Math.min(lines.length, line + contextLines);
      
      const contextContent = lines
        .slice(startLine, endLine)
        .map((lineContent, index) => {
          const lineNumber = startLine + index + 1;
          const marker = lineNumber === line ? '>' : ' ';
          return `${marker} ${lineNumber.toString().padStart(3)} | ${lineContent}`;
        })
        .join('\n');
      
      return contextContent;
    } catch (error) {
      return null;
    }
  }

  // Private helper methods

  private static getRelativePath(file: string, workingDir: string): string {
    const absolutePath = this.resolveAbsolutePath(file);
    return path.relative(workingDir, absolutePath);
  }

  private static resolveAbsolutePath(file: string): string {
    if (path.isAbsolute(file)) {
      return file;
    }
    return path.resolve(this.workingDirectory, file);
  }

  private static fileExists(file: string): boolean {
    try {
      const absolutePath = this.resolveAbsolutePath(file);
      return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
    } catch {
      return false;
    }
  }

  private static validateLineNumber(file: string, line: number): boolean {
    try {
      const absolutePath = this.resolveAbsolutePath(file);
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n');
      return line > 0 && line <= lines.length;
    } catch {
      return false;
    }
  }

  private static deduplicateReferences(references: CodeReference[]): CodeReference[] {
    const seen = new Set<string>();
    return references.filter(ref => {
      const key = `${ref.file}:${ref.line || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

/**
 * Utility functions for common reference operations
 */
export class ReferenceUtils {
  /**
   * Create a quick file reference
   */
  static file(path: string): string {
    return CodeReferenceManager.formatReference(path);
  }

  /**
   * Create a quick file:line reference
   */
  static line(path: string, line: number): string {
    return CodeReferenceManager.formatReference(path, line);
  }

  /**
   * Create multiple references from an array
   */
  static multiple(files: string[]): string[] {
    return files.map(file => CodeReferenceManager.formatReference(file));
  }

  /**
   * Create references from error stack trace
   */
  static fromError(error: Error): CodeReference[] {
    if (!error.stack) return [];
    return CodeReferenceManager.extractReferencesFromContent(error.stack);
  }
}