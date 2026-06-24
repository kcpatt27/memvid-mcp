# Local AI Stack Sketch

**Generated:** 2026-06-24  
**Source:** `local-ai-projects` memvid bank (perplexica-mcp + memvid-mcp docs)  
**Purpose:** Wire a local AI assistant with **live search** (Perplexica) + **personal knowledge** (MemVid)

---

## The split (why two MCP servers)

| Layer | MCP | Job | Data freshness |
|-------|-----|-----|----------------|
| **Live / web** | `perplexica-mcp` | Search, chat, deep research via SearXNG + Ollama | Real-time (60–90s cold start) |
| **Personal / offline** | `memvid-mcp` | Semantic search over your notes, repos, docs | Snapshot (rebuild bank when stale) |

Cursor’s open workspace is a third layer — use codebase tools there; don’t duplicate with MemVid unless curating a subset.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  MCP host (Cursor, Open WebUI, custom agent, CLI)            │
└────────────┬─────────────────────────────┬───────────────────┘
             │ stdio                       │ stdio
   ┌─────────▼──────────┐       ┌─────────▼──────────┐
   │  perplexica-mcp     │       │  memvid-mcp         │
   │  lifecycle + search │       │  banks + search     │
   └─────────┬──────────┘       └─────────┬──────────┘
             │ HTTP :3001                  │ Python bridge
   ┌─────────▼──────────┐       ┌─────────▼──────────┐
   │ Docker stack        │       │ memory-banks/     │
   │ SearXNG + Perplexica│       │ *.mp4 + .faiss    │
   └─────────┬──────────┘       └───────────────────┘
             │
   ┌─────────▼──────────┐
   │ Ollama (host)       │  ← shared LLM; MemVid uses local embeddings only
   └────────────────────┘
```

**Routing heuristic for the model:**

1. Needs **internet / papers / current facts** → `perplexica_search` / `perplexica_research` / `perplexica_chat`
2. Needs **your docs, other repos, career notes** → `search_memory` on `local-ai-projects` (or other banks)
3. Needs **this repo’s live code** → workspace tools, not MemVid

---

## MCP config (`~/.cursor/mcp.json` or local AI host)

```json
{
  "mcpServers": {
    "perplexica-local": {
      "command": "C:\\path\\to\\node.exe",
      "args": ["C:\\Users\\kcpat\\projects\\personal-projects\\perplexica-mcp\\dist\\index.js"],
      "cwd": "C:\\Users\\kcpat\\projects\\personal-projects\\perplexica-mcp",
      "env": {
        "PERPLEXICA_API_URL": "http://127.0.0.1:3001"
      }
    },
    "memvid": {
      "command": "C:\\Users\\kcpat\\scoop\\apps\\nodejs-lts\\current\\node.exe",
      "args": [
        "C:\\Users\\kcpat\\projects\\personal-projects\\memvid-mcp\\dist\\server.js",
        "--mcp"
      ],
      "env": {
        "PYTHON_EXECUTABLE": "C:\\Users\\kcpat\\projects\\personal-projects\\memvid-mcp\\memvid-env\\Scripts\\python.exe",
        "MEMORY_BANKS_DIR": "C:\\Users\\kcpat\\projects\\personal-projects\\memvid-mcp\\memory-banks",
        "MEMVID_ALLOWED_PATHS": "C:\\Users\\kcpat\\projects\\personal-projects;C:\\Users\\kcpat\\notes",
        "MEMVID_WORKSPACE_ROOT": "C:\\Users\\kcpat\\projects\\personal-projects",
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUTF8": "1"
      }
    }
  }
}
```

---

## Perplexica startup (from bank: `next-steps.md`)

```powershell
cd perplexica-mcp
# .env + config.toml from examples; Ollama on 127.0.0.1:11434
npm install && npm run build
# In MCP client:
#   perplexica_docker_up → perplexica_health → perplexica_search
npm run smoke
```

**Chat persistence (v0.3.0):** `perplexica_chat` with `threadId` → SQLite (Perplexica UI) + `./data/threads/*.json` for portability.

---

## MemVid banks (from bank: SECURITY + README)

**Existing bank:** `local-ai-projects` — perplexica memory-bank + memvid docs (87 chunks).

**Recreate when sources change:**

```powershell
cd memvid-mcp
node scripts/create-local-ai-bank.mjs
```

**Search from any MCP client:**

```json
{
  "query": "how does perplexica chat persistence work",
  "memory_banks": ["local-ai-projects"],
  "top_k": 5
}
```

---

## Suggested banks for your local AI project

| Bank name | Sources | Refresh |
|-----------|---------|---------|
| `local-ai-projects` | perplexica-mcp + memvid-mcp docs | After major doc changes |
| `personal-notes` | `~/notes/**/*.md` | Weekly or on edit |
| `career-corpus` | resume docs, project summaries | When applying |

---

## Phased build (local AI host)

### Phase 1 — Dual MCP in Cursor (done / in progress)
- [x] perplexica-local in `mcp.json`
- [x] memvid in `mcp.json` with `MEMVID_ALLOWED_PATHS`
- [x] `local-ai-projects` bank created
- [ ] Restart Cursor; smoke both tool sets

### Phase 2 — Operational habits
- [ ] Document “ask Perplexica vs ask MemVid” in local AI system prompt
- [ ] `perplexica_health` before first search of session
- [ ] `list_memory_banks` + recreate when perplexica/memvid docs drift

### Phase 3 — Dedicated local AI client (your other project)
- [ ] Same two MCP servers over stdio from Open WebUI / custom Node host
- [ ] Optional: thin router prompt — “classify query → pick tool tier”
- [ ] Optional: `PERPLEXICA_API_URL` native mode (skip Docker) per perplexica `ARCHITECTURE.md`

### Phase 4 — Automation
- [ ] Scheduled `create-local-ai-bank.mjs` (Task Scheduler / cron)
- [ ] Bank metadata: `last_indexed_at` in tool responses (future memvid feature)

---

## Known limits (from bank)

| Issue | Mitigation |
|-------|------------|
| Perplexica first search 60–90s | Warm up with `perplexica_health`; smaller Ollama model |
| MemVid banks stale | Recreate or `add_to_memory`; tool descriptions warn the model |
| Cursor 60s MCP timeout | Use `perplexica_research` only when stack is warm |
| MemVid ≠ live code | Use workspace search for active repo |

---

## One-line pitch for the local AI project

> A stdio MCP host that combines **Perplexica** (live local search + threaded chat) with **MemVid** (semantic personal knowledge outside any single workspace) — same machine, same Ollama, two complementary memory layers.
