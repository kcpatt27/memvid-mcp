/**
 * Redact sensitive tool arguments before logging in MCP stdio mode.
 */
export function sanitizeToolArgsForLog(toolName: string, args: unknown): unknown {
  if (!args || typeof args !== 'object') {
    return args;
  }

  const record = { ...(args as Record<string, unknown>) };

  if (toolName === 'create_memory_bank' && Array.isArray(record.sources)) {
    record.sources = (record.sources as Array<Record<string, unknown>>).map((source) => {
      if (source.type === 'text' && typeof source.path === 'string') {
        return {
          ...source,
          path: `[text:${source.path.length} chars]`,
        };
      }
      return source;
    });
  }

  if (typeof record.content === 'string') {
    record.content = `[redacted:${record.content.length} chars]`;
  }

  if (typeof record.query === 'string' && record.query.length > 120) {
    record.query = `${record.query.slice(0, 120)}…`;
  }

  return record;
}
