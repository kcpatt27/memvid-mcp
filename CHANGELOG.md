# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.10] - 2025-01-09

### 🚨 Critical Bug Fix - Python Bridge Health Check

#### Fixed
- **Python Bridge Health**: Fixed critical ping response format mismatch
  - Python bridge was returning `{'status': 'pong'}` but code expected `'pong'`
  - Health monitor now correctly shows Python bridge as healthy
  - Ping response time: 3-4ms (excellent performance)
- **Health Check Timeout**: Increased ping timeout from 1s to 8s to match health monitor expectations
- **Build Process**: Added automatic Python file copying to dist directory
  - Cross-platform support (Linux/Mac `cp` fallback to Windows `copy`)
  - Ensures memvid-bridge.py is included in npm package
- **Health Tools Integration**: Enhanced immediate health check when no cached status available
  - Better error handling and logging
  - Proper TypeScript typing for health metrics

#### Performance Impact
- **Health Check Status**: Now shows "healthy" instead of "unhealthy" 
- **Python Bridge Success Rate**: 100% (was 0% due to ping format issue)
- **MCP Tool Availability**: All tools now functional through npm package
- **Error Rate**: 0% health check failures (was 100%)

#### Technical Details
- Fixed ES module `require` import compatibility
- Improved error logging visibility during debugging
- Enhanced file path resolution for Python bridge script
- Better process initialization and cleanup

**This was a critical fix that makes the NPM version fully functional!**

## [1.0.0] - 2024-12-24

### 🎉 Initial Release - Production Ready

#### Added
- **Core MCP Server**: Full Model Context Protocol implementation
- **Memory Bank Management**: Create, search, and manage AI memory banks
- **Enhanced Search**: Advanced filtering and sorting capabilities
  - File type filtering (PDF, TXT, etc.)
  - Content length filtering
  - Date range filtering  
  - Tag-based filtering
  - Multi-sort options (relevance, content_length, date)
- **Performance Optimization**: 
  - Lazy loading (522ms startup vs 30+ seconds)
  - Search result caching (3ms cached vs 5.7s fresh)
  - 57x startup improvement
- **Production Reliability**:
  - Memory bank validation system
  - Graceful error handling
  - File integrity checks
- **Enhanced Error Handling**:
  - Automatic retry logic with exponential backoff
  - Circuit breaker pattern
  - Comprehensive error classification (16 error codes)
  - User-friendly error messages
- **System Health Monitoring**:
  - Python bridge health monitoring
  - Resource monitoring (memory, disk, CPU)
  - Event-driven alerts
  - Background health checks
- **Health & Diagnostics Tools**:
  - Health check endpoint
  - System diagnostics
  - Uptime tracking
  - Error recovery status

#### Technical Features
- **Auto-configuration**: Platform-aware directory setup
- **Python Detection**: Automatic Python environment detection
- **Cross-platform**: Windows, macOS, and Linux support
- **NPX Compatible**: One-line installation with `npx @kcpatt27/memvid-mcp-server`
- **Enterprise Ready**: Production-grade error handling and monitoring

#### Performance Benchmarks
- Server startup: ~522ms
- Fresh search: ~5.7s  
- Cached search: ~3ms
- Memory bank creation: 3-5s (after initial setup)
- Health check: <100ms

### Technical Architecture
- **Phase 1**: Core MCP infrastructure ✅
- **Phase 2**: Enhanced search capabilities ✅
- **Phase 3a**: Architecture breakthrough (lazy loading) ✅
- **Phase 3b**: Performance validation ✅
- **Phase 3c**: Caching implementation ✅
- **Phase 3d Part 1**: Production reliability ✅
- **Phase 3d Part 2**: Enhanced error handling ✅

[1.0.0]: https://github.com/kcpatt27/memvid-mcp-server/releases/tag/v1.0.0 