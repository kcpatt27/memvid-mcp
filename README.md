# 🎥 MemVid MCP

[![npm version](https://badge.fury.io/js/@kcpatt27%2Fmemvid-mcp.svg)](https://badge.fury.io/js/@kcpatt27%2Fmemvid-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🧠 **AI Memory Bank Management with Enhanced Search**

Transform your files into searchable AI memory banks using MP4 videos and vector embeddings. Seamlessly integrates with Cursor and Claude Desktop via the Model Context Protocol (MCP).

## Features

- 🎥 **MP4-based Memory Banks**: Store and search content using video embeddings
- 🔍 **Enhanced Search**: Semantic search with filtering and sorting
- 🚀 **Easy Setup**: One-command installation via npx
- 🔧 **Auto-Configuration**: Automatically configures Cursor MCP settings
- 📁 **Multiple Sources**: Files, directories, URLs, and text content
- ⚡ **High Performance**: Sub-second search responses with caching

## Quick Start

### 1. Install and Setup

```bash
npx @kcpatt27/memvid-mcp
```

This single command will:
- Install the MemVid MCP Server
- Check system requirements
- Configure Cursor automatically
- Set up Python dependencies

### 2. Start Using

1. **Restart Cursor** (if currently running)
2. **Open any project** in Cursor
3. **Look for "memvid"** in the MCP Tools section
4. **Create your first memory bank** using the `create_memory_bank` tool

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Python 3.8+** - [Download here](https://python.org/)
- **Cursor** - [Download here](https://cursor.sh/)

The setup command will help you install missing dependencies.

## MCP Client Configuration

For Cursor, Claude Desktop, or other MCP clients:

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["-y", "@kcpatt27/memvid-mcp", "--server"]
    }
  }
}
```

### Custom Configuration

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["-y", "@kcpatt27/memvid-mcp", "--server"],
      "env": {
        "MEMORY_BANKS_DIR": "/custom/path/to/banks",
        "PYTHON_EXECUTABLE": "python3"
      }
    }
  }
}
```

## Available Tools

### 🏦 create_memory_bank
Create memory banks from various sources:
- **Files**: Text, code, documents
- **Directories**: Entire project folders
- **URLs**: Web content
- **Text**: Direct text input

### 🔍 search_memory
Advanced search with:
- **Semantic matching**
- **File type filtering**
- **Content length filters**
- **Date range filtering**
- **Custom sorting**

### 📋 list_memory_banks
List all available memory banks with metadata

### ➕ add_to_memory
Add new content to existing memory banks

### 🎯 get_context
Get formatted context for AI conversations

### 🏥 health_check & system_diagnostics
Monitor system health and performance

## Commands

```bash
# Setup (default)
npx @kcpatt27/memvid-mcp

# Check system status
npx @kcpatt27/memvid-mcp --check

# Auto-install dependencies
npx @kcpatt27/memvid-mcp --install

# Show configuration
npx @kcpatt27/memvid-mcp --config

# Show help
npx @kcpatt27/memvid-mcp --help

# Show version
npx @kcpatt27/memvid-mcp --version
```

## Usage Examples

### Create a Memory Bank

Use the `create_memory_bank` tool in Cursor:

```json
{
  "name": "my-project",
  "description": "My project documentation and code",
  "sources": [
    {
      "type": "directory",
      "path": "./src",
      "options": {
        "file_types": ["ts", "js", "md"]
      }
    },
    {
      "type": "file", 
      "path": "./README.md"
    }
  ],
  "tags": ["project", "documentation"]
}
```

### Search Memory Banks

Use the `search_memory` tool:

```json
{
  "query": "authentication and security",
  "memory_banks": ["my-project"],
  "top_k": 10,
  "filters": {
    "file_types": ["ts", "js"],
    "content_length": {
      "min": 100
    }
  },
  "sort_by": "relevance"
}
```

## Troubleshooting

### Setup Issues

```bash
# Check what's wrong
npx @kcpatt27/memvid-mcp --check

# Try auto-fix
npx @kcpatt27/memvid-mcp --install
```

### Common Issues

1. **Python not found**: Install Python 3.8+ from python.org
2. **MemVid not installed**: Run `pip install memvid`
3. **Cursor not detected**: Ensure Cursor is installed and running
4. **Permission errors**: Run with appropriate permissions

### Manual Python Setup

```bash
# Install MemVid package
pip install memvid

# Or with pip3
pip3 install memvid
```

## Development

```bash
# Clone the repository
git clone https://github.com/kcpatt27/memvid-mcp.git
cd memvid-mcp

# Install dependencies
npm install

# Build
npm run build

# Test locally
node dist/cli.js --check
```

## Environment Variables

- `MEMORY_BANKS_DIR`: Custom memory banks directory
- `PYTHON_EXECUTABLE`: Custom Python executable path
- `MEMVID_CONFIG_PATH`: Custom configuration file path
- `LOG_LEVEL`: Logging level (info, warn, error, debug)

## Performance

- **Memory Bank Creation**: ~3-5 seconds
- **Search Response**: <500ms (cached)
- **Memory Usage**: <200MB baseline
- **Concurrent Users**: 5+ supported

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 **Documentation**: [GitHub Wiki](https://github.com/kcpatt27/memvid-mcp/wiki)
- 🐛 **Issues**: [GitHub Issues](https://github.com/kcpatt27/memvid-mcp/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/kcpatt27/memvid-mcp/discussions)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

Made with ❤️ for the AI community