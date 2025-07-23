import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { LLMProvider } from '../llm/types';
import { logger } from './logger';

export interface UserSettings {
  provider?: LLMProvider;
  model?: string;
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    grok?: string;
  };
  customInstructionsPath?: string;
  theme?: string;
  lastUsed?: string;
}

const SETTINGS_DIR = path.join(os.homedir(), '.juriko');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'user-settings.json');

export async function ensureSettingsDirectory(): Promise<void> {
  await fs.ensureDir(SETTINGS_DIR);
}

export async function loadUserSettings(): Promise<UserSettings> {
  try {
    await ensureSettingsDirectory();
    
    if (await fs.pathExists(SETTINGS_FILE)) {
      const settings = await fs.readJson(SETTINGS_FILE);
      return settings;
    }
    
    return {};
  } catch (error) {
    logger.warn('Failed to load user settings:', error);
    return {};
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  try {
    await ensureSettingsDirectory();
    
    // Load existing settings and merge with new ones
    const existingSettings = await loadUserSettings();
    const mergedSettings = { ...existingSettings, ...settings };
    
    await fs.writeJson(SETTINGS_FILE, mergedSettings, { spaces: 2 });
  } catch (error) {
    logger.error('Failed to save user settings:', error);
    throw error;
  }
}

export async function updateProviderSettings(provider: LLMProvider, model: string): Promise<void> {
  const settings: UserSettings = {
    provider,
    model,
    lastUsed: new Date().toISOString(),
  };
  
  await saveUserSettings(settings);
}

export async function getApiKeyFromSettings(provider: LLMProvider): Promise<string | undefined> {
  const settings = await loadUserSettings();
  return settings.apiKeys?.[provider];
}

export async function saveApiKey(provider: LLMProvider, apiKey: string): Promise<void> {
  const settings = await loadUserSettings();
  
  const updatedSettings: UserSettings = {
    ...settings,
    apiKeys: {
      ...settings.apiKeys,
      [provider]: apiKey,
    },
  };
  
  await saveUserSettings(updatedSettings);
}

export function getApiKeyFromEnv(provider: LLMProvider): string | undefined {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || process.env.JURIKO_ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY || process.env.JURIKO_OPENAI_API_KEY;
    case 'grok':
      return process.env.GROK_API_KEY || process.env.JURIKO_GROK_API_KEY;
    default:
      return undefined;
  }
}

export async function getApiKey(provider: LLMProvider): Promise<string | undefined> {
  // First try environment variables
  const envKey = getApiKeyFromEnv(provider);
  if (envKey) {
    return envKey;
  }
  
  // Then try user settings
  return await getApiKeyFromSettings(provider);
}

export function getSettingsPath(): string {
  return SETTINGS_DIR;
}

export function getSettingsFilePath(): string {
  return SETTINGS_FILE;
}