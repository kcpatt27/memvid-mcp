# Case Study — MemVid MCP Server (2024–2026)

**Status:** Archived. This document is the honest, consolidated record of the project: what was built, what was measured, and why it was retired.

---

## TL;DR

- Built and published a **Model Context Protocol (MCP) server** (7 tools) that let AI assistants semantically search a project's files from local "memory banks" — TypeScript MCP server + persistent Python bridge (JSON-RPC over stdio) + FAISS vector search.
- Solved a **30s+ startup blocker** (→ 522 ms) with lazy-loaded ML dependencies, and search latency with an LRU cache (**5.7 s → 3 ms** cached).
- Published to npm in June 2025; maintained with security hardening and CI through June 2026.
- **Retired in October 2026:** the underlying MemVid v1 format (MP4 + QR codes) was deprecated upstream, and the coding-agent ecosystem moved to just-in-time agentic search, code-intelligence graphs, and harness-native memory.
- Transferable work: MCP protocol integration, cross-language IPC, performance debugging across process boundaries, security hardening, cross-platform packaging.

---

## Context (2024–2025)

- **Problem:** AI coding assistants have limited context windows; loading whole codebases is expensive and lossy. Goal: persistent, local, semantic memory over a project that assistants query on demand.
- **Constraints:** fully offline (no external services), no database server, cross-platform (Windows/macOS/Linux), one-command install via `npx`, integrate with Cursor/Claude Desktop through MCP.
- **Role:** solo developer — architecture, implementation, docs, packaging, security, release.

## Architecture and key decisions

```
MCP client (Cursor / Claude Desktop)
        │ JSON-RPC over stdio
MCP server (TypeScript)         — tool routing, validation, filtering, caching, health
        │ JSON-RPC over stdio
Python bridge (memvid-bridge.py) — persistent subprocess, lazy-loaded ML deps
        │
MemVid v1 (Python)              — chunking → QR codes → MP4, sentence-transformers, FAISS
        │
File system storage             — {bank}.mp4 + {bank}.faiss + {bank}.json
```

**Tools shipped:** `create_memory_bank`, `search_memory`, `list_memory_banks`, `add_to_memory`, `get_context`, `health_check`, `system_diagnostics`.

Key decisions and trade-offs:

| Decision | Why | Later verdict |
|---|---|---|
| Persistent Python subprocess instead of per-call spawn | Per-call spawn cost 25s+; persistent process made operations feasible | ✅ Right call for the constraint set |
| File-system storage (MP4 + FAISS + JSON), no database | Portable, zero-config, offline | ⚠️ Portability was real; the format itself aged badly |
| Node/TypeScript for MCP, Python for ML | MCP SDK maturity in Node; ML ecosystem in Python | ✅ Reasonable, at the cost of a bridge |
| LRU + TTL search cache | Repeated queries dominated interactive use | ✅ Measured 1,900× on cache hits |
| Embedding-based retrieval of text chunks | Standard RAG assumption at the time | ❌ Wrong bet for code; see "Ecosystem shift" |

## Hard problems and outcomes

1. **30+ second server startup (blocker).** `sentence_transformers` imported at bridge startup caused client timeouts. Fixed with a `_ensure_heavy_imports()` lazy-loading guard: bridge ready in ~200 ms, server in 522 ms (**57× faster**).
2. **Per-operation subprocess overhead.** Every bank operation spawned Python and reloaded dependencies (25s+). Replaced with a persistent subprocess speaking JSON-RPC over stdio.
3. **Search latency.** Fresh semantic searches took ~5.7 s. Added a query-keyed LRU cache with TTL and invalidation on bank updates: **3 ms cached (1,900×)**.
4. **Cross-platform `npx` distribution.** Shell copy commands, Python discovery, and config paths differ per OS. Built platform-aware auto-configuration with `--check` / `--install` and cross-platform CI (`npm ci` on GitHub Actions).
5. **Security hardening (passes 2–5, June 2026).** Path allowlists for file/directory sources, SSRF guards for URL sources (HTTPS-only), bank-name validation, supply-chain hygiene, and regression tests — see [`SECURITY.md`](SECURITY.md).

## Measured results

Numbers below are the documented benchmark values from the project's own test runs (December 2024 iteration; smoke-tested through June 2026). They were measured on a single developer machine, not a controlled lab — treat them as directional.

| Metric | Before | After |
|---|---|---|
| Server startup | 30+ s | 522 ms (57×) |
| Python bridge startup | 30+ s | ~200 ms (150×) |
| Cached search | 5.7 s fresh | 3 ms (1,900×) |
| Memory bank creation | timeout (30 s+), 0% success | 3–5 s, functional |
| MCP protocol latency | — | <10 ms |
| Error taxonomy | — | 16 error codes, circuit breaker, retry w/ backoff |
| Codebase | — | ~5.7k LOC TypeScript + ~570 LOC Python, ~80 test files |

**Adoption reality (why it was retired):** npm package `@kcpatt27/memvid-mcp` (v1.1.11–1.1.15), ~40 downloads/month by late 2026, 1 GitHub star. The engineering worked; the product never found users.

## What changed in the ecosystem (2025 → 2026)

1. **Upstream deprecated the foundation.** MemVid v1 (QR codes in video) was replaced by v2: Rust, single-file `.mv2`, official SDKs. The [deprecation notice](https://docs.memvid.com/memvid-v1-deprecation) states QR codes are no longer part of MemVid.
2. **Agentic search beat pre-indexed retrieval for code.** Anthropic's [context-engineering guidance](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) describes context rot and just-in-time retrieval; Claude Code uses glob/grep to "bypass the issues of stale indexing and complex syntax trees." Cursor leads with Instant Grep and a context-isolated Explore subagent.
3. **Harness-native memory.** Claude Code's CLAUDE.md + auto memory, compaction, and subagents absorb much of what a memory MCP server used to provide.
4. **The niche got crowded and specialized.** mem0, Letta, and basic-memory own general agent memory; codebase-memory-mcp owns AST/knowledge-graph code intelligence; context-mode owns tool-output compression. A wrapper around a deprecated format had no differentiated place.

## Decision and lessons

**Decision:** archive the project rather than migrate it. The valuable part was the engineering, not the product; the problem space moved on.

**What I'd do differently:**
- **Validate distribution before optimizing.** I had 1,900× cache benchmarks and ~40 downloads/month. Effort should have gone to user conversations and a differentiator, not microbenchmarks.
- **Don't build on a single upstream's bespoke format.** The format *was* the product; when upstream pivoted, the wrapper had nothing left.
- **Watch where the platforms are moving.** Harness-native memory, grep-first retrieval, and tool-output compression were all visible trends by mid-2025.
- **Ship the retirement as a first-class artifact.** Deprecating with a documented rationale is a better engineering signal than leaving a stale "production-ready" README.

**What I'd keep:** the performance-debugging methodology (isolate each boundary — process, protocol, cache), the security pass structure, and treating documentation as a deliverable.

## Resume-ready bullets

1. Built and published an MCP server (7 tools; TypeScript + Python bridge over JSON-RPC/stdio) for local semantic search; cut cold start **57× (30 s → 522 ms)** via lazy-loaded ML dependencies and served cached queries in **3 ms (1,900× vs fresh)**.
2. Hardened file/URL ingestion against path traversal and SSRF with allowlist policies, a multi-pass security review, and a CI dependency-audit workflow.
3. Shipped one-command `npx` setup with cross-platform (Windows/macOS/Linux) auto-configuration and built-in health checks.
4. Retired the project after upstream deprecated its storage format and the ecosystem shifted to agentic search; documented the decision, metrics, and lessons publicly.

---

## Links

- Repository: <https://github.com/kcpatt27/memvid-mcp>
- npm: <https://www.npmjs.com/package/@kcpatt27/memvid-mcp> (deprecated)
- MemVid v1 deprecation: <https://docs.memvid.com/memvid-v1-deprecation>
- Follow-on plan: [`ARCHIVE-AND-CONTEXT-RESEARCH-PLAN.md`](ARCHIVE-AND-CONTEXT-RESEARCH-PLAN.md)