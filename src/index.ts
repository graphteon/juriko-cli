#!/usr/bin/env node

import React from "react";
import { render } from "ink";
import { program } from "commander";
import * as dotenv from "dotenv";
import AppWithProvider from "./ui/app-with-provider";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { logger } from "./utils/logger";

// Load environment variables
dotenv.config();

// Load API key from user settings if not in environment
function loadApiKey(): string | undefined {
  // First check environment variables
  let apiKey = process.env.JURIKO_API_KEY;
  
  if (!apiKey) {
    // Try to load from user settings file
    try {
      const homeDir = os.homedir();
      const settingsFile = path.join(homeDir, '.juriko', 'user-settings.json');
      
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
  let baseURL = process.env.JURIKO_BASE_URL;
  
  if (!baseURL) {
    // Try to load from user settings file
    try {
      const homeDir = os.homedir();
      const settingsFile = path.join(homeDir, '.juriko', 'user-settings.json');
      
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
  .name("juriko")
  .description(
    "JURIKO - A conversational AI CLI tool with text editor capabilities"
  )
  .version("0.0.3")
  .option("-d, --directory <dir>", "set working directory", process.cwd())
  .option("-k, --api-key <key>", "AI API key (or set JURIKO_API_KEY env var)")
  .option("-u, --base-url <url>", "AI API base URL (or set JURIKO_BASE_URL env var)")
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
        process.env.JURIKO_API_KEY = options.apiKey;
      }

      logger.info("🤖 Starting JURIKO CLI with Multi-LLM Provider Support...\n");

      render(React.createElement(AppWithProvider, {}));
    } catch (error: any) {
      logger.error("❌ Error initializing JURIKO CLI:", error.message);
      process.exit(1);
    }
  });

program.parse();
