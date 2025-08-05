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
    local?: string;
  };
  baseURLs?: {
    anthropic?: string;
    openai?: string;
    grok?: string;
    local?: string;
  };
  customInstructionsPath?: string;
  theme?: string;
  lastUsed?: string;
  condenseThreshold?: number; // Percentage (0-100) when to trigger conversation condensing
  
  // Response style settings
  responseStyle?: 'concise' | 'verbose' | 'balanced';
  
  // Feature settings (disabled by default)
  settings?: {
    enableBatching?: boolean; // Multi-tool batching (BETA)
    enableCodeReferences?: boolean; // Clickable code references (BETA)
  };
  
  // Security settings
  securityLevel?: 'low' | 'medium' | 'high';
}

const SETTINGS_DIR = path.join(os.homedir(), '.kilocode');
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
      return process.env.ANTHROPIC_API_KEY || process.env.KILOCODE_ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY || process.env.KILOCODE_OPENAI_API_KEY;
    case 'grok':
      return process.env.GROK_API_KEY || process.env.KILOCODE_GROK_API_KEY;
    case 'local':
      return process.env.LOCAL_LLM_API_KEY || process.env.KILOCODE_LOCAL_LLM_API_KEY;
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

export async function saveBaseURL(provider: LLMProvider, baseURL: string): Promise<void> {
  const settings = await loadUserSettings();
  
  const updatedSettings: UserSettings = {
    ...settings,
    baseURLs: {
      ...settings.baseURLs,
      [provider]: baseURL,
    },
  };
  
  await saveUserSettings(updatedSettings);
}

export async function getBaseURLFromSettings(provider: LLMProvider): Promise<string | undefined> {
  const settings = await loadUserSettings();
  return settings.baseURLs?.[provider];
}

export function getBaseURLFromEnv(provider: LLMProvider): string | undefined {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_BASE_URL || process.env.KILOCODE_ANTHROPIC_BASE_URL;
    case 'openai':
      return process.env.OPENAI_BASE_URL || process.env.KILOCODE_OPENAI_BASE_URL;
    case 'grok':
      return process.env.GROK_BASE_URL || process.env.KILOCODE_GROK_BASE_URL;
    case 'local':
      return process.env.LOCAL_LLM_BASE_URL || process.env.KILOCODE_LOCAL_LLM_BASE_URL;
    default:
      return undefined;
  }
}

export async function getBaseURL(provider: LLMProvider): Promise<string | undefined> {
  // First try environment variables
  const envURL = getBaseURLFromEnv(provider);
  if (envURL) {
    return envURL;
  }
  
  // Then try user settings
  return await getBaseURLFromSettings(provider);
}

export function getSettingsPath(): string {
  return SETTINGS_DIR;
}

export function getSettingsFilePath(): string {
  return SETTINGS_FILE;
}

/**
 * Get the condense threshold percentage from user settings
 * @returns The threshold percentage (0-100), defaults to 75%
 */
export async function getCondenseThreshold(): Promise<number> {
  try {
    const settings = await loadUserSettings();
    return settings.condenseThreshold ?? 75; // Default to 75%
  } catch (error) {
    logger.warn('Failed to load condense threshold, using default:', error);
    return 75; // Default fallback
  }
}

/**
 * Save the condense threshold percentage to user settings
 * @param threshold The threshold percentage (0-100)
 */
export async function saveCondenseThreshold(threshold: number): Promise<void> {
  // Validate threshold is between 0 and 100
  const validThreshold = Math.max(0, Math.min(100, threshold));
  
  const settings: UserSettings = {
    condenseThreshold: validThreshold,
  };
  
  await saveUserSettings(settings);
}

/**
 * Get condense threshold from environment variable or user settings
 * Environment variable: KILOCODE_CONDENSE_THRESHOLD (0-100)
 */
export async function getCondenseThresholdWithEnv(): Promise<number> {
  // First try environment variable
  const envThreshold = process.env.KILOCODE_CONDENSE_THRESHOLD;
  if (envThreshold) {
    const parsed = parseInt(envThreshold, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      return parsed;
    }
  }
  
  // Then try user settings
  return await getCondenseThreshold();
}

/**
 * Get response style from user settings with environment variable override
 */
export async function getResponseStyle(): Promise<'concise' | 'verbose' | 'balanced'> {
  // First try environment variable
  const envStyle = process.env.KILOCODE_RESPONSE_STYLE;
  if (envStyle === 'concise' || envStyle === 'verbose' || envStyle === 'balanced') {
    return envStyle;
  }
  
  // Then try user settings
  const settings = await loadUserSettings();
  return settings.responseStyle ?? 'balanced'; // Default to balanced
}

/**
 * Save response style to user settings
 */
export async function saveResponseStyle(style: 'concise' | 'verbose' | 'balanced'): Promise<void> {
  // Load existing settings first
  const existingSettings = await loadUserSettings();
  
  const settings: UserSettings = {
    ...existingSettings,
    responseStyle: style,
  };
  
  await saveUserSettings(settings);
}

/**
 * Get beta features settings with environment variable overrides
 */
export async function getBetaFeatures(): Promise<{ enableBatching: boolean; enableCodeReferences: boolean }> {
  const userSettings = await loadUserSettings();
  
  // Default beta features to disabled
  let enableBatching = userSettings.settings?.enableBatching ?? false;
  let enableCodeReferences = userSettings.settings?.enableCodeReferences ?? false;
  
  // Environment variable overrides
  const envBatching = process.env.KILOCODE_ENABLE_BATCHING?.toLowerCase();
  if (envBatching === 'true' || envBatching === '1') {
    enableBatching = true;
  } else if (envBatching === 'false' || envBatching === '0') {
    enableBatching = false;
  }
  
  const envCodeReferences = process.env.KILOCODE_ENABLE_CODE_REFERENCES?.toLowerCase();
  if (envCodeReferences === 'true' || envCodeReferences === '1') {
    enableCodeReferences = true;
  } else if (envCodeReferences === 'false' || envCodeReferences === '0') {
    enableCodeReferences = false;
  }
  
  return { enableBatching, enableCodeReferences };
}

/**
 * Save beta features settings
 */
export async function saveBetaFeatures(enableBatching: boolean, enableCodeReferences: boolean): Promise<void> {
  // Load existing settings first
  const existingSettings = await loadUserSettings();
  
  const settingsToSave: UserSettings = {
    ...existingSettings,
    settings: {
      enableBatching,
      enableCodeReferences,
    },
  };
  
  await saveUserSettings(settingsToSave);
}

/**
 * Get security level from user settings with environment variable override
 */
export async function getSecurityLevel(): Promise<'low' | 'medium' | 'high'> {
  // First try environment variable
  const envLevel = process.env.KILOCODE_SECURITY_LEVEL;
  if (envLevel === 'low' || envLevel === 'medium' || envLevel === 'high') {
    return envLevel;
  }
  
  // Then try user settings
  const settings = await loadUserSettings();
  return settings.securityLevel ?? 'medium'; // Default to medium
}

/**
 * Save security level to user settings
 */
export async function saveSecurityLevel(level: 'low' | 'medium' | 'high'): Promise<void> {
  // Load existing settings first
  const existingSettings = await loadUserSettings();
  
  const settings: UserSettings = {
    ...existingSettings,
    securityLevel: level,
  };
  
  await saveUserSettings(settings);
}

/**
 * Get all effective settings (user settings + environment overrides)
 */
export async function getEffectiveSettings(): Promise<{
  responseStyle: 'concise' | 'verbose' | 'balanced';
  enableBatching: boolean;
  enableCodeReferences: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  condenseThreshold: number;
}> {
  const [responseStyle, betaFeatures, securityLevel, condenseThreshold] = await Promise.all([
    getResponseStyle(),
    getBetaFeatures(),
    getSecurityLevel(),
    getCondenseThresholdWithEnv(),
  ]);
  
  return {
    responseStyle,
    enableBatching: betaFeatures.enableBatching,
    enableCodeReferences: betaFeatures.enableCodeReferences,
    securityLevel,
    condenseThreshold,
  };
}

/**
 * Reset all settings to defaults
 */
export async function resetAllSettings(): Promise<void> {
  const defaultSettings: UserSettings = {
    responseStyle: 'balanced',
    settings: {
      enableBatching: false,
      enableCodeReferences: false,
    },
    securityLevel: 'medium',
    condenseThreshold: 75,
  };
  
  await saveUserSettings(defaultSettings);
}