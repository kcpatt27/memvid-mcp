# MemVid MCP for Ollama agents (OpenJarvis / home-agent)

**Goal:** Any Ollama agent profile (`home-agent`, `atlas-core` configs, etc.) can call **memvid** tools the same way they call **perplexica** tools — as external MCP servers over stdio. No wiring between repos; only MCP client config + env vars.

---

## How perplexica works today (pattern to copy)

In `home-agent/config/chat-daily.toml`:

```toml
[tools.mcp]
enabled = true
servers = '[{"name": "perplexica", "command": "node", "args": ["C:\\...\\perplexica-mcp\\dist\\index.js"]}]'

[agent]
tools = "calculator,think,perplexica_web_search,perplexica_research,..."
```

OpenJarvis spawns that process on stdio; tools appear in the agent tool list.

---

## Add memvid the same way

### 1. Environment (set before `ha serve` or in your shell profile)

```powershell
$env:PYTHON_EXECUTABLE = "C:\Users\kcpat\projects\personal-projects\memvid-mcp\memvid-env\Scripts\python.exe"
$env:MEMORY_BANKS_DIR = "C:\Users\kcpat\projects\personal-projects\memvid-mcp\memory-banks"
$env:MEMVID_ALLOWED_PATHS = "C:\Users\kcpat\projects\personal-projects"
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
```

Optional: `MEMVID_NODE` (like `PERPLEXICA_NODE`) if `node` is not on PATH — patch in `ha_core.patch_mcp_node_command` later.

### 2. MCP server entry (second object in `tools.mcp.servers`)

See [`config/openjarvis-mcp-snippet.toml`](../config/openjarvis-mcp-snippet.toml) for a full copy-paste block.

Minimal JSON inside `servers = '...'`:

```json
{
  "name": "memvid",
  "command": "node",
  "args": [
    "C:\\Users\\kcpat\\projects\\personal-projects\\memvid-mcp\\dist\\server.js",
    "--mcp"
  ]
}
```

Child process inherits `PYTHON_EXECUTABLE` and `MEMVID_ALLOWED_PATHS` from the parent if set on `ha serve`.

### 3. Register tools on the agent

Add to `agent.tools` and `tools.enabled`:

```
search_memory,list_memory_banks,get_context
```

Optional (heavier): `create_memory_bank`, `add_to_memory`, `health_check`

**Suggested split:**

| Agent need | Tool |
|------------|------|
| Query personal/project knowledge | `search_memory`, `get_context` |
| Discover banks | `list_memory_banks` |
| Re-index after doc changes | `create_memory_bank` (or run `node scripts/create-local-ai-bank.mjs` manually) |

### 4. Pre-built bank

```powershell
cd memvid-mcp
npm run build
node scripts/create-local-ai-bank.mjs
```

Creates **`ollama-agent-stack`** from:

- home-agent, atlas-core, living-state-machine, meridian-whisper
- perplexica-mcp, memvid-mcp docs

Agent prompt hint: *"For cross-repo personal knowledge use `search_memory` on bank `ollama-agent-stack`. For live web use perplexica tools."*

---

## Cursor vs OpenJarvis

| Client | Config file |
|--------|-------------|
| Cursor | `~/.cursor/mcp.json` |
| home-agent / OpenJarvis | `config/chat-daily.toml` → `[tools.mcp].servers` |
| atlas-core | Own TOML when you add MCP (same pattern) |

Same memvid process (`dist/server.js --mcp`); different hosts can share one `MEMORY_BANKS_DIR`.

---

## Verify

```powershell
# Terminal 1
$env:OPENJARVIS_CONFIG = "...\home-agent\config\chat-daily.toml"
# ... env vars above ...
ha serve

# Terminal 2
ha ask --tools search_memory "what is home-agent stack map perplexica"
```

Or Cursor: restart after `mcp.json` change, invoke `search_memory` on `ollama-agent-stack`.

---

## Not in scope (per your request)

- No code coupling between atlas / home-agent / memvid repos
- No automatic perplexica ↔ memvid routing
- Each agent TOML chooses which MCP servers and tools to enable
