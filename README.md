# 🎥 MemVid MCP

[![npm version](https://badge.fury.io/js/@kcpatt27%2Fmemvid-mcp.svg)](https://badge.fury.io/js/@kcpatt27%2Fmemvid-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Transform your files into searchable AI memory banks using MP4 videos and vector embeddings. Seamlessly integrates with Cursor and Claude Desktop via the Model Context Protocol (MCP).**

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage / Getting Started](#usage--getting-started)
- [Architecture Overview](#architecture-overview)
- [MCP Tools Documentation](#mcp-tools-documentation)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)
- [FAQ](#faq)

## Overview

MemVid MCP solves the problem of making large codebases, documentation, and project files easily searchable and accessible to AI assistants. Instead of loading entire projects into context windows, this tool creates compact, searchable memory banks that AI assistants can query on-demand.

**Who is this for?**
- Developers using Cursor or Claude Desktop who want AI assistants to understand their entire codebase
- Teams managing large documentation sets that need semantic search
- Anyone working with multiple projects who wants persistent, searchable memory across sessions

**What problem does it solve?**
- **Context Window Limits**: AI assistants have limited context windows. MemVid MCP creates searchable memory banks that don't consume context until queried.
- **Project Understanding**: Helps AI assistants understand your entire codebase structure, not just open files.
- **Persistent Memory**: Memory banks persist across sessions, so your AI assistant remembers your project structure.

## Key Features

- 🎥 **MP4-based Memory Banks**: Stores content as searchable MP4 videos with embedded QR codes containing text chunks
- 🔍 **Enhanced Semantic Search**: Advanced search with filtering by file type, content length, date ranges, and custom tags
- 🚀 **One-Command Setup**: Install and configure with a single `npx` command
- 🔧 **Auto-Configuration**: Automatically detects and configures Cursor MCP settings
- 📁 **Multiple Source Types**: Create memory banks from files, directories, URLs, or direct text input
- ⚡ **High Performance**: Sub-second cached search responses (<500ms), 3-5 second memory bank creation
- 🏥 **Health Monitoring**: Built-in health checks and system diagnostics
- 🔄 **Incremental Updates**: Add new content to existing memory banks without full regeneration

## Tech Stack

- **Runtime**: Node.js 18+ (TypeScript)
- **Protocol**: Model Context Protocol (MCP) - JSON-RPC over stdio
- **Python Integration**: Python 3.8+ with MemVid library
- **Core Libraries**:
  - `@modelcontextprotocol/sdk` - MCP protocol implementation
  - `memvid` (Python) - MP4 video encoding and vector search
  - `sentence-transformers` (Python) - Semantic embeddings
  - `winston` - Logging
- **Storage**: File system (MP4 videos, FAISS indices, JSON metadata)
- **Platform**: Cross-platform (Windows, macOS, Linux)

## Installation

### Prerequisites

Before installing, ensure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Python 3.8+** - [Download here](https://python.org/)
- **Cursor** (optional) - [Download here](https://cursor.sh/) - Required for Cursor integration

### Step-by-Step Installation

#### 1. Install via npx (Recommended)

```bash
npx @kcpatt27/memvid-mcp
```

This command will:
- Install the MemVid MCP Server package
- Check system requirements (Node.js, Python)
- Detect Cursor installation
- Configure Cursor MCP settings automatically
- Guide you through Python dependency setup if needed

#### 2. Verify Installation

```bash
# Check system status
npx @kcpatt27/memvid-mcp --check

# Show configuration
npx @kcpatt27/memvid-mcp --config
```

#### 3. Install Python Dependencies (if not auto-installed)

```bash
# Install MemVid Python package
pip install memvid

# Or with pip3
pip3 install memvid
```

#### 4. Restart Cursor

After installation, restart Cursor to load the MCP server configuration.

### Manual Installation (Development)

For local development:

```bash
# Clone the repository
git clone https://github.com/kcpatt27/memvid-mcp.git
cd memvid-mcp

# Install Node.js dependencies
npm install

# Build the project
npm run build

# Install Python dependencies
pip install memvid

# Test locally
node dist/cli.js --check
```

### Environment Variables

Optional environment variables for custom configuration:

- `MEMORY_BANKS_DIR` - Custom directory for memory banks (default: `./memory-banks`)
- `PYTHON_EXECUTABLE` - Custom Python executable path (default: auto-detected)
- `MEMVID_CONFIG_PATH` - Custom configuration file path
- `LOG_LEVEL` - Logging level: `info`, `warn`, `error`, `debug` (default: `info`)

## Usage / Getting Started

### Basic Example: Create Your First Memory Bank

1. **Open Cursor** and navigate to any project
2. **Look for "memvid"** in the MCP Tools section (should appear after restart)
3. **Use the `create_memory_bank` tool** with this configuration:

```json
{
  "name": "my-project-docs",
  "description": "Project documentation and README files",
  "sources": [
    {
      "type": "file",
      "path": "./README.md"
    },
    {
      "type": "directory",
      "path": "./docs",
      "options": {
        "file_types": ["md", "txt"]
      }
    }
  ],
  "tags": ["documentation", "project"]
}
```

**Expected Output:**
- Memory bank created successfully
- Files generated: `my-project-docs.mp4`, `my-project-docs.faiss`, `my-project-docs.json`
- Creation time: ~3-5 seconds

### Search Your Memory Bank

Use the `search_memory` tool to find relevant content:

```json
{
  "query": "authentication and security",
  "memory_banks": ["my-project-docs"],
  "top_k": 10,
  "filters": {
    "file_types": ["md"],
    "content_length": {
      "min": 100
    }
  },
  "sort_by": "relevance"
}
```

**Expected Output:**
- Array of search results with:
  - `content`: Matching text chunks
  - `score`: Relevance score (0-1)
  - `metadata`: File path, line numbers, timestamps
  - `memory_bank`: Source memory bank name

### Complete Workflow Example

```bash
# 1. Create memory bank from your codebase
# (Use create_memory_bank tool in Cursor)

# 2. Search for specific functionality
# (Use search_memory tool with query)

# 3. Get formatted context for AI conversation
# (Use get_context tool to format search results)

# 4. Add new content to existing bank
# (Use add_to_memory tool when files change)
```

## Architecture Overview

MemVid MCP Server acts as a bridge between AI assistants (via MCP protocol) and the MemVid Python library. The system transforms text content into searchable MP4 videos with embedded QR codes, enabling efficient semantic search without consuming large context windows.

### System Architecture

```
┌─────────────────┐
│  AI Assistant   │  Cursor, Claude Desktop, or other MCP client
│  (MCP Client)   │
└────────┬────────┘
         │ JSON-RPC over stdio
         │
┌────────▼──────────────────────┐
│   MemVid MCP Server           │  Node.js/TypeScript
│   (MCP Protocol Handler)      │
│                                │
│  ┌──────────────────────────┐ │
│  │  Tool Handlers           │ │  create_memory_bank, search_memory, etc.
│  │  - Memory Management     │ │
│  │  - Enhanced Search       │ │
│  │  - Health Monitoring     │ │
│  └──────────┬───────────────┘ │
│             │                  │
│  ┌──────────▼───────────────┐ │
│  │  MemVid Bridge            │ │  Python subprocess communication
│  │  (Python Integration)    │ │
│  └──────────┬───────────────┘ │
└────────────┼──────────────────┘
              │ Python subprocess
              │
┌─────────────▼─────────────┐
│   MemVid Python Library    │  Python 3.8+
│                            │
│  ┌──────────────────────┐ │
│  │  Video Encoder       │ │  Chunks text → QR codes → MP4
│  │  Vector Indexer      │ │  Creates FAISS embeddings
│  │  Semantic Retriever   │ │  Fast similarity search
│  └──────────────────────┘ │
└────────────┬──────────────┘
             │
┌────────────▼──────────────┐
│   File System Storage      │
│                            │
│  • .mp4 files (videos)     │
│  • .faiss files (indices) │
│  • .json files (metadata)  │
└────────────────────────────┘
```

### Data Flow

**Creating a Memory Bank:**
1. MCP client sends `create_memory_bank` request with sources
2. MCP Server validates inputs and prepares file paths
3. MemVid Bridge spawns Python subprocess with MemVid library
4. MemVid library:
   - Reads source files/directories/URLs
   - Chunks text into manageable segments
   - Encodes chunks as QR codes
   - Generates MP4 video with QR code frames
   - Creates FAISS vector index from embeddings
   - Saves metadata JSON file
5. Bridge returns success/failure to MCP Server
6. MCP Server responds to client with result

**Searching Memory Banks:**
1. MCP client sends `search_memory` request with query
2. MCP Server loads memory bank metadata
3. Enhanced search applies filters (file type, date, length, tags)
4. MemVid Bridge queries FAISS index for semantic matches
5. Results are sorted and ranked by relevance
6. MCP Server returns formatted results to client

### Key Components

**MCP Server (Node.js/TypeScript)**
- Handles JSON-RPC protocol communication
- Manages memory bank registry and metadata
- Implements enhanced search with filtering/sorting
- Provides health monitoring and diagnostics
- Bridges to Python MemVid library

**MemVid Bridge (Python)**
- Spawns Python subprocess with MemVid library loaded
- Marshals data between Node.js and Python
- Handles Python environment detection
- Manages subprocess lifecycle

**MemVid Library (Python)**
- Encodes text as MP4 videos with QR codes
- Creates FAISS vector indices for semantic search
- Provides fast similarity search capabilities
- Manages video I/O and index persistence

**Storage Layer**
- File system-based storage (no database required)
- MP4 files for video content
- FAISS files for vector indices
- JSON files for metadata and configuration

## MCP Tools Documentation

MemVid MCP Server exposes the following MCP tools:

### 🏦 create_memory_bank

Creates a new memory bank from various sources.

**Parameters:**
- `name` (string, required) - Unique name for the memory bank
- `description` (string, optional) - Description of the memory bank
- `sources` (array, required) - Array of source objects:
  - `type`: `"file"` | `"directory"` | `"url"` | `"text"`
  - `path`: File/directory path or URL (for file/directory/url types)
  - `content`: Text content (for text type)
  - `options`: Optional configuration (file_types, chunk_size, overlap)
- `tags` (array, optional) - Tags for categorization

**Example:**
```json
{
  "name": "api-docs",
  "sources": [
    { "type": "directory", "path": "./docs/api" },
    { "type": "file", "path": "./README.md" }
  ],
  "tags": ["api", "documentation"]
}
```

### 🔍 search_memory

Searches memory banks with advanced filtering and sorting.

**Parameters:**
- `query` (string, required) - Search query text
- `memory_banks` (array, optional) - Specific banks to search (default: all)
- `top_k` (number, optional) - Number of results (default: 5, max: 50)
- `filters` (object, optional):
  - `file_types`: Array of file extensions
  - `content_length`: `{ min, max }` in characters
  - `date_range`: `{ start, end }` ISO dates
  - `tags`: Array of tag names
- `sort_by` (string, optional) - `"relevance"` | `"date"` | `"content_length"` (default: `"relevance"`)
- `sort_order` (string, optional) - `"asc"` | `"desc"` (default: `"desc"`)
- `min_score` (number, optional) - Minimum relevance score 0-1 (default: 0.3)

**Example:**
```json
{
  "query": "authentication",
  "memory_banks": ["api-docs"],
  "top_k": 10,
  "filters": {
    "file_types": ["ts", "js"],
    "content_length": { "min": 100 }
  },
  "sort_by": "relevance"
}
```

### 📋 list_memory_banks

Lists all available memory banks with metadata.

**Parameters:**
- `include_stats` (boolean, optional) - Include detailed statistics (default: false)

**Returns:** Array of memory bank objects with name, description, tags, file counts, creation date.

### ➕ add_to_memory

Adds new content to an existing memory bank.

**Parameters:**
- `memory_bank` (string, required) - Name of existing memory bank
- `content` (string, required) - Content to add
- `metadata` (object, optional) - Additional metadata

### 🎯 get_context

Gets formatted context from search results for AI conversations.

**Parameters:**
- `query` (string, required) - Search query
- `memory_banks` (array, optional) - Banks to search
- `max_tokens` (number, optional) - Maximum tokens in response
- `include_metadata` (boolean, optional) - Include source metadata

### 🏥 health_check

Checks system health and readiness.

**Parameters:**
- `detailed` (boolean, optional) - Include detailed metrics

**Returns:** Health status with component checks (Python, MemVid, storage, etc.)

### 🔧 system_diagnostics

Gets comprehensive system diagnostics.

**Parameters:**
- `includeMetrics` (boolean, optional) - Include performance metrics
- `includeLogs` (boolean, optional) - Include recent logs

**Returns:** Detailed system information for troubleshooting.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**Quick Start for Contributors:**
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/memvid-mcp.git`
3. Install dependencies: `npm install && pip install memvid`
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make your changes and test: `npm run build && npm test`
6. Submit a pull request

**Areas for Contribution:**
- Performance optimizations
- Additional search filters
- New source types (databases, APIs, etc.)
- Documentation improvements
- Testing and test coverage
- Error handling enhancements

## Project Status

**Status:** 75% Complete (Core features shipped, working on performance optimization & UX improvements)

**Progress:** `████████████████████░░░░` 75%

**Completed Features:**
- ✅ Core MCP infrastructure and protocol implementation
- ✅ Enhanced semantic search with filtering and sorting
- ✅ Memory bank creation and management (7 MCP tools)
- ✅ Search result caching (1,900x speedup for cached queries)
- ✅ Production reliability and error handling
- ✅ Health monitoring and diagnostics
- ✅ Cross-platform support (Windows, macOS, Linux)
- ✅ One-command installation via npx

**In Progress:**
- 🔄 Direct Python integration (ETA: 2-3 weeks) - Critical performance fix
- 🔄 Enhanced error recovery (ETA: 1 week)
- 🔄 Documentation improvements (ETA: 1 week)
- 🔄 Performance monitoring dashboard (ETA: 1 week)

**Stats:**
- **Lines of code:** ~6,000+ (TypeScript/JavaScript)
- **Test coverage:** 50+ test files (unit, integration, performance, MCP protocol)
- **Documentation coverage:** 100% (README, ARCHITECTURE, ROADMAP, CONTRIBUTING)
- **Last updated:** January 2025

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the complete development roadmap.

**Current Focus:**
- Architecture optimization (direct Python integration)
- Performance improvements (target: 3-5s memory bank creation)
- Enhanced search capabilities
- Better error handling and diagnostics

**Upcoming:**
- Real-time memory bank updates
- Multi-user collaboration features
- Advanced analytics and insights
- Cloud deployment options

## License

MIT License - see [LICENSE](LICENSE) for details.

## FAQ

### General Questions

**Q: What is MemVid?**  
A: MemVid is a Python library that encodes text as MP4 videos with QR codes, enabling efficient storage and semantic search of large text corpora.

**Q: Why use MP4 videos instead of a database?**  
A: MP4 videos with QR codes provide a compact, portable format that can be easily shared and stored. The vector embeddings enable fast semantic search without requiring a database server.

**Q: Do I need to install Python separately?**  
A: Yes, you need Python 3.8+ installed. The setup command will help you install it if missing, and will guide you through installing the `memvid` Python package.

**Q: Can I use this with other MCP clients besides Cursor?**  
A: Yes! MemVid MCP works with any MCP-compatible client, including Claude Desktop. See the [MCP Client Configuration](#mcp-client-configuration) section.

### Installation & Setup

**Q: The setup command says Python is not found. What should I do?**  
A: Install Python 3.8+ from [python.org](https://python.org/). Make sure to add Python to your system PATH during installation. Then run `npx @kcpatt27/memvid-mcp --install` again.

**Q: How do I know if Cursor is configured correctly?**  
A: Run `npx @kcpatt27/memvid-mcp --check` to verify your setup. After restarting Cursor, you should see "memvid" tools in the MCP Tools section.

**Q: Can I customize where memory banks are stored?**  
A: Yes, set the `MEMORY_BANKS_DIR` environment variable to your desired path, or configure it in your MCP client settings.

### Usage Questions

**Q: How long does it take to create a memory bank?**  
A: Typically 3-5 seconds for small to medium projects. Larger projects (1000+ files) may take longer. The time depends on the amount of content being processed.

**Q: Can I search across multiple memory banks?**  
A: Yes! Use the `search_memory` tool and specify multiple banks in the `memory_banks` array, or omit it to search all banks.

**Q: What file types are supported?**  
A: All text-based files are supported. The system automatically handles common formats like `.md`, `.txt`, `.js`, `.ts`, `.py`, `.json`, etc. Binary files are skipped.

**Q: How do I update a memory bank when files change?**  
A: Use the `add_to_memory` tool to append new content, or recreate the memory bank with `create_memory_bank` to regenerate it completely.

**Q: Can I delete a memory bank?**  
A: Currently, you need to manually delete the `.mp4`, `.faiss`, and `.json` files from the memory banks directory. A delete tool may be added in a future release.

### Performance & Troubleshooting

**Q: Search is slow. How can I improve performance?**  
A: Search results are cached automatically. The first search may take 5-7 seconds, but subsequent searches on the same query return in <500ms. Consider creating smaller, more focused memory banks for faster searches.

**Q: I'm getting timeout errors. What's wrong?**  
A: Timeouts usually indicate Python environment issues. Run `npx @kcpatt27/memvid-mcp --check` to diagnose. Common issues: Python not in PATH, MemVid not installed, or insufficient system resources.

**Q: Memory bank creation fails. How do I debug?**  
A: Use the `system_diagnostics` tool to get detailed error information. Check that:
- Python 3.8+ is installed and accessible
- `memvid` Python package is installed (`pip install memvid`)
- Source files/directories exist and are readable
- You have write permissions in the memory banks directory

**Q: How much disk space do memory banks use?**  
A: Memory banks are relatively compact. A typical project with 100 files might generate 5-10 MB of storage (MP4 + FAISS + JSON files). The size depends on the amount of text content.

### Technical Questions

**Q: How does semantic search work?**  
A: MemVid uses sentence-transformers to create vector embeddings of text chunks. When you search, your query is also embedded, and the system finds the most similar chunks using FAISS (Facebook AI Similarity Search).

**Q: Can I use my own embedding model?**  
A: Currently, MemVid uses the default `all-MiniLM-L6-v2` model. Custom models may be supported in future versions.

**Q: Is my data sent to external servers?**  
A: No. All processing happens locally on your machine. The MemVid library runs entirely offline, and no data is sent to external services.

**Q: How do I backup my memory banks?**  
A: Simply copy the memory banks directory (default: `./memory-banks`). Each memory bank consists of three files: `.mp4`, `.faiss`, and `.json`. Copy all three to preserve a memory bank.

---

**Support & Resources:**
- 📖 [Documentation](https://github.com/kcpatt27/memvid-mcp/wiki)
- 🐛 [Report Issues](https://github.com/kcpatt27/memvid-mcp/issues)
- 💬 [Discussions](https://github.com/kcpatt27/memvid-mcp/discussions)

Made with ❤️ for the AI community
