#!/usr/bin/env node
/**
 * Minimal JSON-RPC stdio client for MemVid MCP integration smoke tests.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class McpStdioClient {
  /**
   * @param {object} options
   * @param {string} options.projectRoot
   * @param {number} [options.requestTimeoutMs]
   * @param {number} [options.startupTimeoutMs]
   * @param {Record<string, string>} [options.env]
   */
  constructor({
    projectRoot,
    requestTimeoutMs = 30_000,
    startupTimeoutMs = 10_000,
    env = {},
  }) {
    this.projectRoot = projectRoot;
    this.requestTimeoutMs = requestTimeoutMs;
    this.startupTimeoutMs = startupTimeoutMs;
    this.env = env;
    this.server = null;
    this.requestId = 0;
    this.pending = new Map();
    this.responseBuffer = '';
    this.initialized = false;
  }

  async start() {
    const serverPath = path.join(this.projectRoot, 'dist', 'server.js');

    return new Promise((resolve, reject) => {
      this.server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.projectRoot,
        env: { ...process.env, ...this.env },
      });

      let settled = false;

      const failStartup = (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(startupTimer);
        reject(error);
      };

      const startupTimer = setTimeout(() => {
        failStartup(new Error(`MCP server did not become ready within ${this.startupTimeoutMs}ms`));
      }, this.startupTimeoutMs);

      this.server.stdout.on('data', (chunk) => {
        this.#handleStdout(chunk.toString());
      });

      this.server.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        if (text.includes('MemVid MCP Server connected and running on stdio') && !settled) {
          settled = true;
          clearTimeout(startupTimer);
          resolve();
        }
      });

      this.server.on('error', failStartup);

      this.server.on('exit', (code, signal) => {
        if (!settled) {
          failStartup(
            new Error(`MCP server exited before ready (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
          );
          return;
        }

        for (const { reject: rejectPending } of this.pending.values()) {
          rejectPending(new Error('MCP server exited during request'));
        }
        this.pending.clear();
      });
    });
  }

  async initialize() {
    const response = await this.#sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'memvid-read-tools-smoke', version: '1.0.0' },
    });

    if (response.error) {
      throw new Error(`initialize failed: ${JSON.stringify(response.error)}`);
    }

    this.initialized = true;
    return response.result;
  }

  /**
   * @param {string} toolName
   * @param {Record<string, unknown>} [toolArgs]
   */
  async callTool(toolName, toolArgs = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const response = await this.#sendRequest('tools/call', {
      name: toolName,
      arguments: toolArgs,
    });

    if (response.error) {
      throw new Error(`${toolName} MCP error: ${JSON.stringify(response.error)}`);
    }

    return response.result;
  }

  async stop() {
    if (!this.server || this.server.killed) {
      return;
    }

    this.server.kill();
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 500);
      this.server?.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  #handleStdout(chunk) {
    this.responseBuffer += chunk;

    const lines = this.responseBuffer.split('\n');
    this.responseBuffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }

      if (message.id == null || !this.pending.has(message.id)) {
        continue;
      }

      const { resolve } = this.pending.get(message.id);
      this.pending.delete(message.id);
      resolve(message);
    }
  }

  async #sendRequest(method, params) {
    if (!this.server?.stdin) {
      throw new Error('MCP server is not running');
    }

    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error(`Request timed out after ${this.requestTimeoutMs}ms (${method})`));
        }
      }, this.requestTimeoutMs);

      this.pending.set(id, {
        resolve: (response) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      this.server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }
}

export function resolveProjectRoot() {
  return path.resolve(__dirname, '..', '..');
}
