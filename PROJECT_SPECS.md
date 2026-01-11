# MemVid MCP Server Specifications

## Project Vision

Transform AI assistant interactions by making entire codebases and documentation instantly searchable without consuming context windows. MemVid MCP Server enables AI assistants (like Cursor and Claude Desktop) to understand and search through large codebases, documentation, and project files on-demand, solving the problem of limited context windows and inefficient project loading.

## Current Status
- **Version:** v1.1.15
- **Completion:** 75% complete
- **Last Updated:** January 2025
- **Availability:** Public (published on npm as `@kcpatt27/memvid-mcp`)

## Technology Stack
- **Backend:** Node.js 18+ with TypeScript
- **Protocol:** Model Context Protocol (MCP) - JSON-RPC over stdio
- **Python Integration:** Python 3.8+ with MemVid library
- **Core Libraries:**
  - `@modelcontextprotocol/sdk` - MCP protocol implementation
  - `memvid` (Python) - MP4 video encoding and vector search
  - `sentence-transformers` (Python) - Semantic embeddings (all-MiniLM-L6-v2)
  - `faiss` (Python) - Vector similarity search
  - `winston` - Logging
- **Storage:** File system (MP4 videos, FAISS indices, JSON metadata) - No database required
- **Hosting:** Local execution, distributed via npm package
- **AI Tools Used:** Cursor (Claude 3.5 for scaffolding and development)

## Key Features (Completed)
- ✅ **Core MCP Infrastructure** - Full Model Context Protocol implementation with JSON-RPC communication
- ✅ **Memory Bank Creation** - Create searchable memory banks from files, directories, URLs, or text
- ✅ **Enhanced Semantic Search** - Advanced search with filtering by file type, content length, date ranges, and tags
- ✅ **Search Result Caching** - LRU cache with TTL providing 1,900x speedup for cached queries (3ms vs 5.7s)
- ✅ **Production Reliability** - Memory bank validation, graceful error handling, file integrity checks
- ✅ **Error Recovery** - Automatic retry logic with exponential backoff, circuit breaker pattern, 16 error codes
- ✅ **Health Monitoring** - Python bridge health monitoring, resource monitoring, event-driven alerts
- ✅ **7 MCP Tools** - create_memory_bank, search_memory, list_memory_banks, add_to_memory, get_context, health_check, system_diagnostics
- ✅ **Cross-Platform Support** - Windows, macOS, Linux
- ✅ **One-Command Installation** - `npx @kcpatt27/memvid-mcp` with auto-configuration
- ✅ **Performance Optimization** - 522ms startup (57x improvement), lazy loading, efficient memory usage

## Features In Progress
- 🔄 **Direct Python Integration** (ETA: 2-3 weeks) - Critical performance fix to replace subprocess architecture, targeting 3-5s memory bank creation vs current 30+ second timeouts
- 🔄 **Enhanced Error Recovery** (ETA: 1 week) - More robust recovery mechanisms for edge cases, better error messages
- 🔄 **Documentation Improvements** (ETA: 1 week) - Usage examples, troubleshooting guides, video tutorials
- 🔄 **Performance Monitoring Dashboard** (ETA: 1 week) - Better visibility into performance metrics, cache hit rates, system resource usage

## Planned Features
- **Incremental Memory Bank Updates** - Add new content without full regeneration (90% faster updates for large banks)
- **Multi-User Support & Access Control** - Team collaboration, shared knowledge bases, user management and permissions
- **Advanced Search Features** - Regex patterns, code-specific searches (function names, class definitions), saved search queries
- **Memory Bank Encryption** - Encrypted storage for sensitive codebases, enterprise security requirements
- **Cloud Storage Integration** - Sync memory banks across devices, team collaboration, backup and recovery
- **Web Interface / Dashboard** - Visual memory bank management, search result visualization, non-technical user support
- **API Server Mode** - HTTP API access for non-MCP clients, broader integration possibilities
- **Performance Optimizations** - Sub-second memory bank creation (<1s), improved cache hit rates, reduced memory usage
- **Real-Time Memory Bank Synchronization** - Automatically update banks when source files change
- **AI-Powered Code Navigation** - Intelligent code exploration and refactoring assistance

## Key Decisions
- **Why Node.js/TypeScript for MCP Server?** Official MCP SDK is Node.js-based, cross-platform support, rich npm ecosystem, TypeScript provides type safety. Alternative (Python) would require implementing MCP protocol from scratch.
- **Why Python for MemVid Core?** Existing, proven MemVid library for video encoding and vector search, rich ML ecosystem (sentence-transformers, FAISS, OpenCV), mature and well-documented. Alternative (JavaScript ML libraries) less mature with fewer options.
- **Why File System Storage Instead of Database?** Simplicity (no database server required), portability (files can be copied/shared easily), offline operation, direct file access is fast for local operations. Alternative (SQLite/PostgreSQL) would require schema management and be less portable.
- **Why FAISS for Vector Search?** Extremely fast similarity search optimized for large-scale vectors, industry standard, excellent Python bindings, open source. Alternative (Annoy, Milvus, Elasticsearch) either less performant or too heavy for local use.
- **Why MP4 Videos with QR Codes?** Compact, portable format that can be easily shared, visual verification possible, standard format universally supported, efficient text embedding. Alternative (database storage) would require server and be less portable.
- **Why Public Release Now?** Core features are production-ready, performance is excellent (3.6s direct MemVid), community feedback needed to prioritize features, open source enables contributions.

## Success Metrics
- **User Growth Rate:** 1,000+ GitHub stars within 6 months, consistent 20%+ month-over-month growth
- **Feature Adoption:** 80% of users create at least one memory bank, high feature adoption with low abandonment
- **Performance Benchmarks:**
  - Memory bank creation: <3 seconds (currently 3-5s, target <1s)
  - Search response: <100ms cached, <1s fresh (currently 3ms cached, 5.7s fresh)
  - Startup time: <500ms (currently 522ms, target <300ms)
- **Community Feedback:** 4.5+ star rating, positive feedback in issues/discussions, active community engagement
- **Technical Quality:** <1% error rate in production, 100% test coverage for critical paths, zero critical security vulnerabilities
- **Developer Experience:** <5 minute setup time, clear documentation, low support burden
- **Long-Term Vision (1-2 years):** 10,000+ developers using MemVid MCP, sub-second memory bank creation, native IDE support, enterprise features

## Known Limitations
- **Subprocess Overhead:** Current Python bridge uses subprocess communication causing 25+ second overhead per operation (root cause identified, direct integration solution planned for Phase 3a)
- **Single-User Only:** No multi-user support or access control (planned for months 2-3)
- **No Incremental Updates:** Must recreate entire bank to add content (incremental update feature planned)
- **File System Only:** No database or cloud storage option (cloud storage integration planned)
- **No Encryption:** Memory banks stored unencrypted (encryption support planned for sensitive use cases)
- **Limited to Text Files:** Binary files are skipped, only text-based content supported
- **No Real-Time Sync:** Memory banks don't automatically update when source files change (real-time sync planned)
- **Local Storage Only:** No cloud sync or multi-device support (cloud storage integration planned)
- **No Web Interface:** Management only through MCP tools (web dashboard planned)
- **Performance Bottleneck:** Subprocess architecture causes timeouts (direct integration in progress)

## Important URLs/Credentials
- **GitHub Repository:** https://github.com/kcpatt27/memvid-mcp
- **NPM Package:** https://www.npmjs.com/package/@kcpatt27/memvid-mcp
- **Documentation:** https://github.com/kcpatt27/memvid-mcp#readme
- **Issues & Bug Reports:** https://github.com/kcpatt27/memvid-mcp/issues
- **Discussions:** https://github.com/kcpatt27/memvid-mcp/discussions
- **Contributing Guide:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Architecture Documentation:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Roadmap:** [ROADMAP.md](ROADMAP.md)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
