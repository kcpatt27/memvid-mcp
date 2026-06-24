/**
 * MCP tool schemas with guidance for when to use memory banks vs live workspace files.
 */
export const MCP_TOOL_DEFINITIONS = [
  {
    name: 'create_memory_bank',
    description: `Create a semantic-search memory bank from files, directories, text, or URLs.

WHEN TO USE:
- Corpora outside the current Cursor workspace (notes, other repos, reference docs) — set paths under MEMVID_ALLOWED_PATHS / MEMVID_WORKSPACE_ROOT in server env
- Curated subsets you want ranked semantic retrieval over (not keyword grep)
- Persistent cross-session knowledge that should not be re-ingested every chat

WHEN NOT TO USE (prefer Cursor codebase search / read_file instead):
- Files already open in the workspace and likely current
- Small corpora where reading 1–3 files directly is faster

STALENESS: Banks are a snapshot at creation time. Content on disk can drift until you recreate the bank or use add_to_memory. After large source changes, recreate or incrementally update.

URL sources require MEMVID_ALLOW_URL_SOURCES=true (HTTPS only). File/directory paths must be under allowed roots.`,
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description:
            'Unique bank name (alphanumeric, underscore, hyphen; max 64 chars). Not a filesystem path.',
          minLength: 1,
          maxLength: 64,
        },
        description: {
          type: 'string',
          description: 'Human-readable purpose, e.g. "Career notes" or "API reference outside workspace"',
        },
        sources: {
          type: 'array',
          description:
            'Sources to index once. Use absolute paths for folders outside the Cursor workspace (must be allowed by server env).',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['file', 'directory', 'url', 'text'],
                description: 'file/directory: local paths; url: disabled unless env allows; text: inline content',
              },
              path: {
                type: 'string',
                description:
                  'Absolute file or directory path, HTTPS URL, or raw text (when type is text). Outside-workspace paths need MEMVID_ALLOWED_PATHS.',
              },
              options: {
                type: 'object',
                properties: {
                  chunk_size: { type: 'number', description: 'Custom chunk size for this source' },
                  overlap: { type: 'number', description: 'Custom overlap for this source' },
                  file_types: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Extensions to include for directory sources, e.g. ["md", "txt"]',
                  },
                },
              },
            },
            required: ['type', 'path'],
          },
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for filtering in search_memory',
        },
      },
      required: ['name', 'sources'],
    },
  },
  {
    name: 'search_memory',
    description: `Semantic search over pre-built memory banks (meaning-based, not exact keyword match).

WHEN TO USE:
- Querying indexed corpora, especially outside-workspace or multi-project banks
- Finding conceptually related chunks when you do not know filenames

WHEN NOT TO USE:
- You need the live on-disk file in the workspace RIGHT NOW — read_file/grep instead
- No bank exists yet — call create_memory_bank first
- Sources changed significantly since the bank was built — recreate or add_to_memory first, then search

STALENESS: Results reflect the last index build, not live disk. If answers seem outdated, check list_memory_banks dates and refresh the bank.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural-language or keyword query; semantic embeddings match by meaning',
          minLength: 1,
        },
        memory_banks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Bank names to search (default: all). Use list_memory_banks to discover names.',
        },
        top_k: {
          type: 'number',
          minimum: 1,
          maximum: 50,
          description: 'Number of top results (default: 5)',
        },
        min_score: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Minimum relevance score 0–1 (default: 0.3)',
        },
        filters: {
          type: 'object',
          description: 'Optional filters on file type, date, tags, content length',
          properties: {
            file_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by extensions, e.g. ["md", "pdf"]',
            },
            date_range: {
              type: 'object',
              properties: {
                start: { type: 'string', description: 'Start date (ISO)' },
                end: { type: 'string', description: 'End date (ISO)' },
              },
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by bank tags',
            },
            content_length: {
              type: 'object',
              properties: {
                min: { type: 'number', description: 'Minimum chunk length in characters' },
                max: { type: 'number', description: 'Maximum chunk length in characters' },
              },
            },
          },
        },
        sort_by: {
          type: 'string',
          enum: ['relevance', 'date', 'file_size', 'content_length'],
          description: 'Sort field (default: relevance)',
        },
        sort_order: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (default: desc)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_memory_banks',
    description: `List memory banks with metadata (name, description, tags, creation time).

Use before search_memory to discover bank names and judge staleness — compare bank age to when source files last changed. If stale, recreate with create_memory_bank or patch with add_to_memory.`,
    inputSchema: {
      type: 'object',
      properties: {
        include_stats: {
          type: 'boolean',
          description: 'Include chunk counts and file sizes when available',
        },
      },
    },
  },
  {
    name: 'add_to_memory',
    description: `Append new content to an existing bank without a full rebuild.

Use when sources gained new material but most of the bank is still valid — reduces staleness vs recreating from scratch. Does not remove or re-index changed existing chunks; for large rewrites, prefer create_memory_bank again.`,
    inputSchema: {
      type: 'object',
      properties: {
        memory_bank: {
          type: 'string',
          description: 'Existing bank name from list_memory_banks',
        },
        content: {
          type: 'string',
          description: 'New text to index and append',
        },
        metadata: {
          type: 'object',
          description: 'Optional source label, date, or tags for this chunk',
        },
      },
      required: ['memory_bank', 'content'],
    },
  },
  {
    name: 'get_context',
    description: `Return search results formatted as a single context block for the conversation.

Same staleness rules as search_memory. Prefer read_file for live workspace code; use this for pre-indexed corpora (especially outside-workspace knowledge).`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Query to retrieve context for' },
        memory_banks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Banks to search (default: all)',
        },
        max_tokens: { type: 'number', description: 'Cap on formatted context length' },
        include_metadata: {
          type: 'boolean',
          description: 'Include source paths and scores in the output',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'health_check',
    description: 'Check Python bridge, storage, and server readiness. Run if tools fail or after env changes.',
    inputSchema: {
      type: 'object',
      properties: {
        detailed: { type: 'boolean', description: 'Include component-level metrics' },
      },
    },
  },
  {
    name: 'system_diagnostics',
    description: 'Detailed diagnostics for troubleshooting Python path, memory banks dir, and bridge errors.',
    inputSchema: {
      type: 'object',
      properties: {
        includeMetrics: { type: 'boolean', description: 'Include performance metrics' },
        includeLogs: { type: 'boolean', description: 'Include recent log excerpts' },
      },
    },
  },
] as const;
