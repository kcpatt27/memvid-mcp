# MemVid MCP Server

A production-ready Model Context Protocol (MCP) server that provides AI memory bank management with enhanced search capabilities using MemVid's video-based storage system.

## 🚀 **Quick Start**

### **One-Line Setup for Cursor/Claude**

Add this to your MCP configuration and you're ready to go:

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["-y", "@kcpatt27/memvid-mcp-server"]
    }
  }
}
```

### **Prerequisites**

- **Node.js** 18+ 
- **Python** 3.8+ with `pip install memvid`

The server will auto-detect your environment and guide you through any missing setup.

## 🔧 **Installation Methods**

### **Method 1: NPX (Recommended)**
No installation required - just add to your MCP client configuration:

```json
"memvid": {
  "command": "npx",
  "args": ["-y", "@kcpatt27/memvid-mcp-server"]
}
```

### **Method 2: Global Install**
```bash
npm install -g @kcpatt27/memvid-mcp-server
```

Then use:
```json
"memvid": {
  "command": "memvid-mcp"
}
```

### **Method 3: Local Project**
```bash
npm install @kcpatt27/memvid-mcp-server
```

## 🎯 **MCP Client Configuration**

### **Cursor IDE**
1. Open Cursor Settings (`Ctrl+,`)
2. Search for "MCP" → "Model Context Protocol"
3. Add server configuration:

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["-y", "@kcpatt27/memvid-mcp-server"]
    }
  }
}
```

### **Claude Desktop**
1. Open Claude Settings → Developer → Edit Config
2. Add server configuration:

```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["-y", "@kcpatt27/memvid-mcp-server"]
    }
  }
}
```

### **Advanced Configuration**
```json
{
  "mcpServers": {
    "memvid": {
      "command": "npx",
      "args": ["-y", "@kcpatt27/memvid-mcp-server"],
      "env": {
        "MEMORY_BANKS_DIR": "/custom/path/to/memory-banks",
        "PYTHON_EXECUTABLE": "python3"
      }
    }
  }
}
```

## 🛠️ **Available Tools**

### **Memory Bank Management**
- **`create_memory_bank`** - Create new memory banks from files, text, or URLs
- **`search_memory`** - Enhanced search with filtering and sorting
- **`list_memory_banks`** - List all available memory banks
- **`get_memory_bank_stats`** - Get detailed memory bank statistics

### **Enhanced Search Features**
- **File Type Filtering**: Search specific file types (PDF, TXT, etc.)
- **Content Length Filtering**: Filter by content size
- **Date Range Filtering**: Search by creation dates
- **Tag Filtering**: Multi-tag search capabilities
- **Smart Sorting**: By relevance, content length, or date
- **Result Caching**: 3ms repeat searches (1,900x faster)

### **Health & Monitoring**
- **`health_check`** - System health monitoring
- **`system_diagnostics`** - Comprehensive system diagnostics

## 🎉 **Production Features**

### **Performance Optimized**
- **522ms** startup time (57x improvement)
- **3ms** cached search results (1,900x faster repeats)
- **~5.7s** fresh search times
- Lazy loading of heavy dependencies

### **Production Reliability**
- Automatic error recovery with retry logic
- Circuit breaker pattern for failure protection
- Memory bank validation and integrity checks
- Resource monitoring and health checks
- Graceful error handling with user-friendly messages

### **Enterprise Ready**
- Comprehensive error classification (16 error codes)
- System health monitoring with alerts
- Background resource monitoring
- Production-grade logging and diagnostics

## 🔍 **Usage Examples**

### **Create Memory Bank**
```javascript
// In your AI conversation:
"Create a memory bank called 'project-docs' from my project documentation folder"
```

### **Enhanced Search**
```javascript
// Search with filtering:
"Search for 'authentication' in memory banks, only in PDF files from 2024"

// Advanced search with sorting:
"Find recent content about 'database optimization', sort by relevance"
```

### **Health Monitoring**
```javascript
// Check system health:
"Run a health check on the MemVid system"

// Get diagnostics:
"Show me system diagnostics for the memory banks"
```

## 📁 **File Locations**

### **Automatic Setup**
The server automatically creates directories in platform-appropriate locations:

- **Windows**: `%APPDATA%\memvid-mcp\memory-banks`
- **macOS**: `~/Library/Application Support/memvid-mcp/memory-banks`
- **Linux**: `~/.local/share/memvid-mcp/memory-banks`

### **Custom Locations**
Set environment variables to customize:
```bash
export MEMORY_BANKS_DIR="/path/to/your/memory-banks"
export PYTHON_EXECUTABLE="python3"
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **"Python not found"**
Install Python 3.8+ and ensure it's in your PATH:
- Windows: Download from python.org
- macOS: `brew install python3`
- Linux: `apt-get install python3`

#### **"MemVid not installed"**
Install the MemVid package:
```bash
pip install memvid
```

#### **Server not connecting**
1. Restart your MCP client (Cursor/Claude)
2. Check the server logs for errors
3. Verify Python and MemVid are installed

### **Debug Mode**
For detailed logging, set environment variable:
```bash
export DEBUG=memvid-mcp:*
```

## 🔧 **Development**

### **Local Development**
```bash
git clone https://github.com/kcpatt27/memvid-mcp-server
cd memvid-mcp-server
npm install
npm run build
npm start
```

### **Testing**
```bash
npm test
```

## 📊 **Performance Benchmarks**

| Operation | Performance | Description |
|-----------|-------------|-------------|
| **Server Startup** | ~522ms | Initial bridge connection |
| **Fresh Search** | ~5.7s | First-time search with processing |
| **Cached Search** | ~3ms | Repeat search from cache |
| **Memory Bank Creation** | 3-5s | After initial model download |
| **Health Check** | <100ms | System health validation |

## 🆔 **Version History**

- **v1.0.0** - Production release with complete Phase 3d implementation
  - Enhanced error handling and recovery
  - System health monitoring
  - Production reliability features
  - Performance optimization and caching

## 📄 **License**

MIT License - see LICENSE file for details.

## 🙋 **Support**

- **Issues**: [GitHub Issues](https://github.com/kcpatt27/memvid-mcp-server/issues)
- **Documentation**: [MCP Protocol Guide](https://modelcontextprotocol.io/)
- **MemVid**: [MemVid Documentation](https://github.com/kingjulio8238/memvid)

---

**Transform your AI conversations with persistent, searchable memory banks! 🧠✨** 