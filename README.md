# 🎥 MemVid MCP Server

[![npm version](https://badge.fury.io/js/@kcpatt27%2Fmemvid-mcp-server.svg)](https://badge.fury.io/js/@kcpatt27%2Fmemvid-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Intelligent AI Memory Bank Management for Claude via MCP Protocol**

Transform your files, documents, and data into searchable AI memory banks using MP4 video embeddings. Built for seamless integration with Cursor IDE and Claude AI.

## ✨ Features

- 🎯 **Smart Memory Banks**: Convert any content (files, directories, URLs, text) into searchable AI memory
- 🔍 **Advanced Search**: Enhanced filtering by file type, date, tags, and content length
- ⚡ **High Performance**: Sub-second search with intelligent caching and concurrent processing
- 🛠️ **Auto-Setup**: One-command Cursor IDE integration with automatic configuration
- 🎨 **Production Ready**: Enterprise-grade error handling, health monitoring, and reliability
- 📱 **Modern Architecture**: TypeScript, MCP Protocol, and modular design

## 🚀 Quick Start

### Installation & Setup

```bash
# Install and setup in one command
npx @kcpatt27/memvid-mcp-server

# Or install globally
npm install -g @kcpatt27/memvid-mcp-server
memvid-mcp-server
```

This will:
- ✅ Detect your system and Cursor installation
- ✅ Configure MCP integration automatically
- ✅ Set up Python environment for MemVid
- ✅ Create necessary directories and files

### Manual Setup (if needed)

If automatic setup doesn't work, you can configure manually:

```bash
# Check current configuration
npx @kcpatt27/memvid-mcp-server --check

# Run server directly
npx @kcpatt27/memvid-mcp-server --server
```

## 🎯 Usage in Cursor/Claude

Once installed, restart Cursor and you'll have access to these tools:

### 1. Create Memory Bank

```
Use the "create_memory_bank" tool with:
- Name: "my-project"
- Description: "My project documentation"
- Sources: [
    {
      "type": "directory",
      "path": "./src",
      "options": {
        "file_types": ["ts", "js", "md"]
      }
    }
  ]
```

### 2. Search Memory

```
Use the "search_memory" tool with:
- Query: "authentication logic"
- Filters: {
    "file_types": ["ts"],
    "content_length": {"min": 100}
  }
- Sort by: "relevance"
```

### 3. List Memory Banks

```
Use the "list_memory_banks" tool to see all available memory banks
```

## 🔧 Configuration

The server automatically detects and configures optimal settings, but you can customize:

### Environment Variables

```bash
# Memory banks storage location
MEMORY_BANKS_DIR=./memory-banks

# Python executable (auto-detected)
PYTHON_EXECUTABLE=python

# Maximum concurrent operations
MAX_CONCURRENT_OPERATIONS=5

# Cache size for performance
CACHE_SIZE=100
```

### Cursor Settings (Manual)

If auto-setup fails, add this to your Cursor `settings.json`:

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["@kcpatt27/memvid-mcp-server", "--server"]
    }
  }
}
```

## 📊 Performance

- **Memory Bank Creation**: 3-5 seconds (typical)
- **Search Response**: <500ms with caching
- **Memory Usage**: <50MB per memory bank
- **Concurrent Users**: 5+ simultaneous operations

## 🛠️ Advanced Usage

### Programmatic API

```javascript
import { startServer, setup } from '@kcpatt27/memvid-mcp-server';

// Start server programmatically
const serverProcess = startServer({
  stdio: 'pipe',
  env: { MEMORY_BANKS_DIR: './custom-banks' }
});

// Run setup programmatically
const success = await setup();
```

### Custom Sources

```typescript
// File source
{
  "type": "file",
  "path": "./document.pdf"
}

// Directory source with filtering
{
  "type": "directory", 
  "path": "./src",
  "options": {
    "file_types": ["ts", "js", "md"],
    "chunk_size": 512
  }
}

// URL source
{
  "type": "url",
  "path": "https://example.com/api-docs"
}

// Direct text
{
  "type": "text",
  "path": "This is important information to remember..."
}
```

### Search Filters

```typescript
{
  "filters": {
    "file_types": ["md", "txt"],           // File extensions
    "date_range": {                        // Date filtering
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "tags": ["documentation", "api"],      // Memory bank tags
    "content_length": {                    // Content size
      "min": 100,
      "max": 5000
    }
  },
  "sort_by": "relevance",                  // relevance|date|file_size|content_length
  "sort_order": "desc"                     // asc|desc
}
```

## 🔍 Troubleshooting

### Common Issues

**Setup fails with Python error:**
```bash
# Install Python 3.8+ from https://python.org
# Then run: npx @kcpatt27/memvid-mcp-server --check
```

**Memory bank creation times out:**
```bash
# Check available memory and disk space
# Large files may take longer to process
```

**Search returns no results:**
```bash
# Verify memory bank was created successfully
# Check search query spelling and filters
```

### Health Check

```bash
# Check system health
npx @kcpatt27/memvid-mcp-server --check

# View detailed diagnostics
npx @kcpatt27/memvid-mcp-server --server --verbose
```

### Debug Mode

Set environment variable for detailed logging:
```bash
DEBUG=memvid:* npx @kcpatt27/memvid-mcp-server --server
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/kcpatt27/memvid-mcp-server
cd memvid-mcp-server
npm install
npm run build
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MemVid](https://github.com/nishantk1991/memvid) - Core video embedding technology
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP standard
- [Cursor](https://cursor.sh/) - AI-powered development environment

## 📞 Support

- 🐛 [Report Issues](https://github.com/kcpatt27/memvid-mcp-server/issues)
- 💬 [Discussions](https://github.com/kcpatt27/memvid-mcp-server/discussions)
- 📧 Email support: coming soon

---

**Made with ❤️ for the AI development community**