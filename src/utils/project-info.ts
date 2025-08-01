import { execSync } from 'child_process';
import path from 'path';
import os from 'os';
import { readFileSync } from 'fs';

export interface ProjectInfo {
  projectPath: string;
  gitBranch?: string;
  hasUncommittedChanges?: boolean;
  sandboxStatus: string;
}

export function getProjectInfo(): ProjectInfo {
  const cwd = process.cwd();
  const homeDir = os.homedir();
  
  // Convert absolute path to relative path from home directory
  let projectPath = cwd;
  if (cwd.startsWith(homeDir)) {
    projectPath = '~' + cwd.substring(homeDir.length);
  }
  
  let gitBranch: string | undefined;
  let hasUncommittedChanges: boolean | undefined;
  
  try {
    // Get current git branch
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { 
      cwd, 
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    
    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { 
      cwd, 
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    
    hasUncommittedChanges = status.length > 0;
  } catch (error) {
    // Not a git repository or git not available
    gitBranch = undefined;
    hasUncommittedChanges = undefined;
  }
  
  return {
    projectPath: gitBranch ? `${projectPath} (${gitBranch}${hasUncommittedChanges ? '*' : ''})` : projectPath,
    gitBranch,
    hasUncommittedChanges,
    sandboxStatus: 'no sandbox' // Default status, can be customized later
  };
}

export function getModelDisplayName(provider: string, model: string): string {
  // Get app version from package.json
  let appVersion = 'v0.1.4'; // fallback version
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    appVersion = `v${packageJson.version}`;
  } catch (error) {
    // Use fallback version if package.json can't be read
  }
  
  // Format model name for display
  const providerMap: Record<string, string> = {
    'anthropic': 'claude',
    'openai': 'gpt',
    'xai': 'grok'
  };
  
  const providerPrefix = providerMap[provider.toLowerCase()] || provider;
  
  // Extract version/date from model name if present
  const modelParts = model.split('-');
  if (modelParts.length > 1) {
    // For models like "claude-3-5-sonnet-20241022"
    if (model.includes('sonnet') || model.includes('haiku') || model.includes('opus')) {
      return `${providerPrefix}-${modelParts.slice(-2).join('-')} (${appVersion})`;
    }
    // For other models
    return `${providerPrefix}-${modelParts.slice(-1)[0]} (${appVersion})`;
  }
  
  return `${providerPrefix}-${model} (${appVersion})`;
}