// Simple console logger for Phase 1 - will upgrade to Winston later
// NOTE: All output goes to stderr to avoid interfering with MCP JSON-RPC on stdout
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.error(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.error(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
}; 