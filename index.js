#!/usr/bin/env node

// MemVid MCP Server - Main Entry Point
// This file provides programmatic access to the server

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start the MemVid MCP server programmatically
 * @param {Object} options - Server options
 * @returns {ChildProcess} The server process
 */
export function startServer(options = {}) {
  const serverPath = path.join(__dirname, 'dist', 'server.js');
  
  const serverProcess = spawn('node', [serverPath], {
    stdio: options.stdio || 'inherit',
    env: { ...process.env, ...options.env }
  });
  
  return serverProcess;
}

/**
 * Run setup for Cursor IDE integration
 * @param {Object} options - Setup options
 * @returns {Promise<boolean>} Success status
 */
export async function setup(options = {}) {
  const setupPath = path.join(__dirname, 'dist', 'setup.js');
  
  return new Promise((resolve, reject) => {
    const setupProcess = spawn('node', [setupPath], {
      stdio: options.stdio || 'inherit',
      env: { ...process.env, ...options.env }
    });
    
    setupProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    setupProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// If run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
} 