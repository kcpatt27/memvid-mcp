# 🎥 MemVid MCP

[![npm version](https://badge.fury.io/js/@kcpatt27%2Fmemvid-mcp.svg)](https://badge.fury.io/js/@kcpatt27%2Fmemvid-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**AI Memory Management using Video via MCP Protocol**

Transform your files, documents, and data into searchable AI memory banks using MP4 video embeddings. Built for seamless integration with the MCP Protocol.

## ✨ Features

- 🎯 **Smart Memory Banks**: Convert any content (files, directories, URLs, text) into searchable AI memory
- 🔍 **Advanced Search**: Enhanced filtering by file type, date, tags, and content length
- ⚡ **High Performance**: Sub-second search with intelligent caching and concurrent processing
- 🛠️ **Auto-Setup**: One-command integration with automatic configuration

## 🚀 Quick Start

### Installation & Setup

```bash
# Install and setup in one command
npx @kcpatt27/memvid-mcp

# Or install globally
npm install -g @kcpatt27/memvid-mcp
```

This will:
- ✅ Detect your system and MCP client installation
- ✅ Configure MCP integration automatically
- ✅ Set up Python environment for MemVid
- ✅ Create necessary directories and files

### MCP Client Configuration

Add this to your **Cursor**, **Claude Desktop**, or **Windsurf** settings:

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["-y", "@kcpatt27/memvid-mcp"]
    }
  }
}
```

**Manual setup commands** (if auto-setup fails):
```bash
# Check current configuration
npx @kcpatt27/memvid-mcp --check

# View detailed diagnostics
npx @kcpatt27/memvid-mcp --setup
```

## 🎯 Usage

Once configured, restart your MCP client and use these tools:

### Create Memory Bank
```typescript
// Convert your project files into searchable memory
{
  "name": "my-project",
  "description": "My project documentation", 
  "sources": [
    {
      "type": "directory",
      "path": "./src",
      "options": {
        "file_types": ["ts", "js", "md"],
        "chunk_size": 512
      }
    }
  ]
}
```

### Search Memory Banks
```typescript
// Find information across all memory banks
{
  "query": "authentication logic",
  "filters": {
    "file_types": ["ts", "js"], 
    "content_length": {"min": 100}
  },
  "sort_by": "relevance",
  "top_k": 10
}
```

### Supported Source Types
```typescript
// File source
{ "type": "file", "path": "./document.pdf" }

// Directory with filtering
{ 
  "type": "directory", 
  "path": "./docs",
  "options": { "file_types": ["md", "txt"] }
}

// URL source
{ "type": "url", "path": "https://api-docs.example.com" }

// Direct text
{ "type": "text", "path": "Important notes to remember..." }
```

## ⚙️ Configuration

### Environment Variables
```bash
# Memory banks storage location
MEMORY_BANKS_DIR=./memory-banks

# Python executable (auto-detected)
PYTHON_EXECUTABLE=python

# Performance tuning
MAX_CONCURRENT_OPERATIONS=5
CACHE_SIZE=100
LOG_LEVEL=info
```

### Advanced MCP Configuration
```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["-y", "@kcpatt27/memvid-mcp"],
      "env": {
        "MEMORY_BANKS_DIR": "./custom-banks",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

## 📊 Performance

- **Memory Bank Creation**: 3-5 seconds (typical)
- **Search Response**: <500ms with caching
- **Memory Usage**: <50MB per memory bank
- **Concurrent Operations**: 5+ simultaneous users

## 🔍 Troubleshooting

### Common Issues

**Python Installation Error:**
```bash
# Install Python 3.8+ from https://python.org
npx @kcpatt27/memvid-mcp --check
```

**Memory Bank Creation Timeout:**
```bash
# Check system resources and file sizes
# Large files (>100MB) may take longer to process
```

**Search Returns No Results:**
```bash
# Verify memory bank was created successfully
npx @kcpatt27/memvid-mcp --check
```

### Debug Mode
```bash
# Enable detailed logging
DEBUG=memvid:* npx @kcpatt27/memvid-mcp
```

## 🛠️ Advanced Usage

### Programmatic API
```javascript
import { startServer, setup } from '@kcpatt27/memvid-mcp';

// Start server programmatically
const server = startServer({
  env: { MEMORY_BANKS_DIR: './custom-banks' }
});

// Run setup check
const isReady = await setup();
```

### Search Filtering
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

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
git clone https://github.com/kcpatt27/memvid-mcp
cd memvid-mcp
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

- 🐛 [Report Issues](https://github.com/kcpatt27/memvid-mcp/issues)
- 💬 [Discussions](https://github.com/kcpatt27/memvid-mcp/discussions)
- 📧 Email support: coming soon

---

**Made with ❤️ for the AI development community**