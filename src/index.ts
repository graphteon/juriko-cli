#!/usr/bin/env node

import React from "react";
import { render } from "ink";
import { program } from "commander";
import * as dotenv from "dotenv";
import AppWithProvider from "./ui/app-with-provider";
import { SettingsMenu } from "./ui/components/settings-menu";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
const packageJson = require("../package.json");
import { logger } from "./utils/logger";
import { mcpManager } from "./mcp";
import {
  getEffectiveSettings,
  saveResponseStyle,
  saveBetaFeatures,
  saveSecurityLevel,
  resetAllSettings,
  getSettingsFilePath
} from "./utils/user-settings";

// Load environment variables
dotenv.config();

// Load API key from user settings if not in environment
function loadApiKey(): string | undefined {
  // First check environment variables
  let apiKey = process.env.KILOCODE_API_KEY;
  
  if (!apiKey) {
    // Try to load from user settings file
    try {
      const homeDir = os.homedir();
      const settingsFile = path.join(homeDir, '.kilocode', 'user-settings.json');
      
      if (fs.existsSync(settingsFile)) {
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        apiKey = settings.apiKey;
      }
    } catch (error) {
      // Ignore errors, apiKey will remain undefined
    }
  }
  
  return apiKey;
}

// Load base URL from user settings if not in environment
function loadBaseURL(): string | undefined {
  // First check environment variables
  let baseURL = process.env.KILOCODE_BASE_URL;
  
  if (!baseURL) {
    // Try to load from user settings file
    try {
      const homeDir = os.homedir();
      const settingsFile = path.join(homeDir, '.kilocode', 'user-settings.json');
      
      if (fs.existsSync(settingsFile)) {
        const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        baseURL = settings.baseURL;
      }
    } catch (error) {
      // Ignore errors, baseURL will remain undefined
    }
  }
  
  return baseURL;
}

program
  .name("kilocode")
  .description(
    "KILOCODE - A conversational AI CLI tool with text editor capabilities"
  )
  .version(packageJson.version)
  .option("-d, --directory <dir>", "set working directory", process.cwd())
  .option("-k, --api-key <key>", "AI API key (or set KILOCODE_API_KEY env var)")
  .option("-u, --base-url <url>", "AI API base URL (or set KILOCODE_BASE_URL env var)")
  .option("--concise", "enable concise response mode (< 4 lines)")
  .option("--verbose", "enable verbose response mode with explanations")
  .option("--security-level <level>", "set security validation level (low|medium|high)", "medium")
  .option("--enable-batching", "enable parallel execution of independent tools")
  .option("--disable-batching", "disable parallel execution (use sequential execution)")
  .option("--enable-code-references", "enable clickable file references with VSCode integration")
  .option("--disable-code-references", "disable clickable file references")
  .action((options) => {
    if (options.directory) {
      try {
        process.chdir(options.directory);
      } catch (error: any) {
        logger.error(
          `Error changing directory to ${options.directory}:`,
          error.message
        );
        process.exit(1);
      }
    }

    try {
      // Set API keys from command line options if provided
      if (options.apiKey) {
        process.env.KILOCODE_API_KEY = options.apiKey;
      }

      // Set response style options
      if (options.concise) {
        process.env.KILOCODE_RESPONSE_STYLE = 'concise';
      } else if (options.verbose) {
        process.env.KILOCODE_RESPONSE_STYLE = 'verbose';
      }

      // Set security level
      if (options.securityLevel) {
        process.env.KILOCODE_SECURITY_LEVEL = options.securityLevel;
      }

      // Set batching options
      if (options.enableBatching) {
        process.env.KILOCODE_ENABLE_BATCHING = 'true';
      } else if (options.disableBatching) {
        process.env.KILOCODE_ENABLE_BATCHING = 'false';
      }

      // Set code reference options
      if (options.enableCodeReferences) {
        process.env.KILOCODE_ENABLE_CODE_REFERENCES = 'true';
      } else if (options.disableCodeReferences) {
        process.env.KILOCODE_ENABLE_CODE_REFERENCES = 'false';
      }

      logger.info("🤖 Starting KILOCODE CLI with Multi-LLM Provider Support...\n");

      const app = render(React.createElement(AppWithProvider, {}));

      // Handle graceful shutdown
      const handleShutdown = async () => {
        try {
          logger.info("Shutting down KILOCODE CLI...");
          await mcpManager.shutdown();
          process.exit(0);
        } catch (error: any) {
          logger.error("Error during shutdown:", error.message);
          process.exit(1);
        }
      };

      // Handle process termination signals
      process.on('SIGINT', handleShutdown);
      process.on('SIGTERM', handleShutdown);
      
      // Handle app exit
      app.waitUntilExit().then(() => {
        handleShutdown();
      });
    } catch (error: any) {
      logger.error("❌ Error initializing KILOCODE CLI:", error.message);
      process.exit(1);
    }
  });

// Settings command
program
  .command('settings')
  .description('Open interactive settings menu')
  .action(async () => {
    try {
      const { unmount } = render(React.createElement(SettingsMenu, {
        onClose: () => {
          unmount();
          process.exit(0);
        }
      }));
    } catch (error: any) {
      console.error('Failed to open settings:', error.message);
      process.exit(1);
    }
  });

// Settings subcommands
const settingsCmd = program
  .command('config')
  .description('Manage configuration settings');

settingsCmd
  .command('show')
  .description('Show current settings')
  .action(async () => {
    try {
      const settings = await getEffectiveSettings();
      console.log('\n🔧 Current KILOCODE Settings:');
      console.log('─'.repeat(40));
      console.log(`Response Style: ${settings.responseStyle}`);
      console.log(`Multi-Tool Batching (BETA): ${settings.enableBatching ? 'ON' : 'OFF'}`);
      console.log(`Code References (BETA): ${settings.enableCodeReferences ? 'ON' : 'OFF'}`);
      console.log(`Security Level: ${settings.securityLevel}`);
      console.log(`Condense Threshold: ${settings.condenseThreshold}%`);
      console.log('─'.repeat(40));
      console.log(`Config file: ${getSettingsFilePath()}`);
      console.log();
    } catch (error: any) {
      console.error('Failed to load settings:', error.message);
      process.exit(1);
    }
  });

settingsCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(async (key: string, value: string) => {
    try {
      switch (key) {
        case 'response-style':
        case 'responseStyle':
          if (!['concise', 'verbose', 'balanced'].includes(value)) {
            console.error('Invalid response style. Must be: concise, verbose, or balanced');
            process.exit(1);
          }
          await saveResponseStyle(value as 'concise' | 'verbose' | 'balanced');
          console.log(`✅ Response style set to: ${value}`);
          break;
          
        case 'batching':
        case 'enable-batching':
          const enableBatching = value.toLowerCase() === 'true' || value === '1';
          const currentSettings = await getEffectiveSettings();
          await saveBetaFeatures(enableBatching, currentSettings.enableCodeReferences);
          console.log(`✅ Multi-tool batching ${enableBatching ? 'enabled' : 'disabled'}`);
          break;
          
        case 'code-references':
        case 'enable-code-references':
          const enableCodeReferences = value.toLowerCase() === 'true' || value === '1';
          const currentSettings2 = await getEffectiveSettings();
          await saveBetaFeatures(currentSettings2.enableBatching, enableCodeReferences);
          console.log(`✅ Code references ${enableCodeReferences ? 'enabled' : 'disabled'}`);
          break;
          
        case 'security-level':
        case 'securityLevel':
          if (!['low', 'medium', 'high'].includes(value)) {
            console.error('Invalid security level. Must be: low, medium, or high');
            process.exit(1);
          }
          await saveSecurityLevel(value as 'low' | 'medium' | 'high');
          console.log(`✅ Security level set to: ${value}`);
          break;
          
        default:
          console.error(`Unknown setting: ${key}`);
          console.log('Available settings:');
          console.log('  response-style (concise|verbose|balanced)');
          console.log('  batching (true|false)');
          console.log('  code-references (true|false)');
          console.log('  security-level (low|medium|high)');
          process.exit(1);
      }
    } catch (error: any) {
      console.error('Failed to save setting:', error.message);
      process.exit(1);
    }
  });

settingsCmd
  .command('reset')
  .description('Reset all settings to defaults')
  .action(async () => {
    try {
      await resetAllSettings();
      console.log('✅ All settings reset to defaults');
      console.log('   Response Style: balanced');
      console.log('   Multi-Tool Batching (BETA): OFF');
      console.log('   Code References (BETA): OFF');
      console.log('   Security Level: medium');
    } catch (error: any) {
      console.error('Failed to reset settings:', error.message);
      process.exit(1);
    }
  });

program.parse();
