# Archive & Pivot Plan — memvid-mcp → Context Research

**Created:** 2026-10-04
**Owner:** kcpat
**Status:** Proposal

---

## Where this comes from

Assessment findings (2026-10-04 session):

- `memvid-mcp` wraps **MemVid v1** (Python, MP4 + QR codes + FAISS). Upstream has explicitly deprecated v1 and removed QR codes: <https://docs.memvid.com/memvid-v1-deprecation>. MemVid v2 is Rust, single-file `.mv2`, with official SDKs (<https://github.com/memvid/memvid>).
- npm latest is **1.1.15 (June 2025)**; v1.2.0 exists in git only. ~40 downloads/month, 1 GitHub star.
- The "memory MCP" category is crowded (mem0 ~66k★, Letta ~25k★, basic-memory ~4k★, official MCP memory server). The coding-agent retrieval niche has moved to **agentic search** (grep; Cursor Instant Grep), **AST/knowledge-graph tools** (codebase-memory-mcp ~46k★), and **context compression/sandboxing** (context-mode ~25k★).
- Anthropic's context-engineering guidance (`context rot`, just-in-time retrieval, compaction/subagents/note-taking) is the industry frame: <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>.

**Decision:** archive cleanly and cheaply, then invest in what the owner actually cares about: **studying how coding agents spend and conserve context**.

**Target roles:** AI / agent engineering (primary), full-stack / product engineering, Forward Deployed Engineer.

---

## Goals

1. Take `memvid-mcp` from "stale product" to "clean, honest archive" in **one focused session**.
2. Replace it as the portfolio centerpiece with a **visible, reproducible context-engineering research program**.

---

## Part A — Clean archive (time-box: ~1 session / 4–6 hours)

### A1. Freeze the repo (~30 min)

- [ ] Review uncommitted changes (`package.json`, `config/memory-banks.json`, untracked test/docs files). Commit what matters; discard the rest.
- [ ] Confirm final version. Recommendation: **do not publish v1.2.0**; deprecate what's on npm instead.
- [ ] Tag final state: `git tag v1.2.0-final` and push tags.
- [ ] Keep the `memvid/` submodule pinned at v0.1.3 for historical reproducibility; note this in the README.

### A2. Deprecation notice (~1 hr)

- [ ] Add a banner at the top of `README.md`:

  > **Archived / Deprecated.** This server is built on MemVid v1 (MP4 + QR codes), which upstream deprecated in favor of the `.mv2` single-file format. See <https://docs.memvid.com/memvid-v1-deprecation>. Kept as a learning archive — see `docs/CASE-STUDY.md` for lessons learned.

- [ ] Deprecate the npm package (shows a warning on install; do **not** unpublish):

  ```bash
  npm deprecate @kcpatt27/memvid-mcp "Deprecated: built on MemVid v1 (QR-based), deprecated upstream. See memvid/memvid v2."
  ```

- [ ] After A3: archive the GitHub repository; close or deflect the ~10 open issues.

### A3. Claim hygiene + resume artifacts (~2–3 hrs — this is the actual portfolio value)

- [ ] Fix the three overlapping career docs (`docs/summary-for-career.md`, `docs/memvid-RESUME_DATA_POINTS.md`, `docs/key-metrics.md`):
  - [ ] Timeline: docs say Dec 2024–Jan 2025, but npm publish was June 2025 and work continued to June 2026.
  - [ ] Remove unfalsifiable claims: "75% complete", "100% success rate", "540x memory efficiency" (0.37 MB vs an arbitrary soft target is apples-to-oranges).
  - [ ] Label estimates as estimates.
  - [ ] De-emphasize "MP4/QR as innovation" — it is now a dead-tech liability. Lead with MCP protocol work, cross-language bridge, performance debugging, security hardening, distribution.
- [ ] Merge the three docs into **one** `docs/CASE-STUDY.md` (~2 pages) structured as:
  1. Problem and constraints (2025)
  2. Architecture and key decisions
  3. The three hard bugs: 30s cold start, Python bridge protocol, cross-platform `npx`
  4. Measured results (honest numbers)
  5. What changed in the ecosystem (v1 deprecation, agentic search)
  6. Decision to archive + what I'd do differently
  7. Lessons
- [ ] Final resume bullets (verified numbers only):
  1. Built and published an MCP server (7 tools; TypeScript + Python bridge over JSON-RPC/stdio); cut cold start 57× (30 s → 522 ms) via lazy-loaded ML dependencies and served cached semantic queries in 3 ms (1,900× vs fresh).
  2. Hardened local file/URL ingestion with path allowlists, SSRF guards, a 5-pass security review, and a CI audit workflow.
  3. Shipped one-command `npx` setup with cross-platform auto-configuration (Windows/macOS/Linux).
  4. Deprecated the project after upstream replaced the v1 format; documented the decision and migration path publicly. *(Signals judgment — often the best interview story.)*
- [ ] Optional, high ROI for FDE roles: one short writeup — "What building an MCP memory server taught me about context" — linking the deprecation note and the new research program.

### A4. Definition of done

- npm install shows a deprecation warning.
- README states archived status and why.
- Final tag exists; GitHub repo archived.
- One case study + 3–4 defensible resume bullets exist.

---

## Part B — Context research program ("Context Lab" working title)

### Positioning

> "I measure how coding agents spend and conserve context, and publish reproducible results and small tools."

This maps directly to AI/agent engineering hiring (evals, context engineering, harness fluency) and gives FDE-style artifacts: public writeups, demos, numbers.

### Why this is the right pivot

- Context engineering is *the* core discipline for agents in 2026: context rot, just-in-time retrieval, compaction, subagents, note-taking.
- The field rewards honest, reproducible measurement — still scarce, still visible.
- It matches the owner's stated interest (research over productizing this repo).

### Research questions (pick 2–3; each = one experiment + one writeup + maybe a tiny tool)

1. **MCP token tax.** How many tokens do installed MCP servers' tool schemas cost per session? Tool: a local "MCP diet" report. *Cheapest credible first result.*
2. **Session context map.** Where does context actually go in a real coding-agent session (system prompt, tool schemas, file reads, tool outputs, compaction)? Tool: a context-budget analyzer CLI.
3. **Grep vs embeddings vs AST/KG retrieval.** On repo Q&A: correctness, tokens-to-answer, freshness. Build a 30–50 question benchmark.
4. **Does persistent memory help or hurt?** No-memory vs note-files vs semantic memory on multi-session tasks; measure stale-memory failures.
5. **Tool-output sandboxing savings.** Survey prior art first (context-mode), then measure independently if a gap remains.

Prior art to study before building anything: Claude Code `/context` + memory docs; context-mode; codebase-memory-mcp; LoCoMo / LongMemEval benchmarks; existing context-budget tooling.

### Infrastructure (what makes it credible)

- **Local-first eval harness:** task set, rubric, LLM-judge, seed control, token/cost accounting. Runs on a laptop (Ollama available) with optional API models.
- **Results as static charts:** one page per experiment.
- **Methodology + limitations section** in every writeup. Honesty is the brand.

### Cadence

- 4–6 short posts over 2–3 months; each ships a demo repo.
- **Phase 0 (2 weeks):** finish Part A; run research question #1 (MCP token tax) end-to-end; publish post 1 and the repo.

### Skills mapping

| Artifact | AI/agent eng | Full-stack | FDE |
|---|---|---|---|
| Eval harness + benchmark | ●●● | ●● | ●● |
| Small tools / MCP servers | ●●● | ●● | ●● |
| Public writeups + charts | ●● | ● | ●●● |
| Harness integrations (Claude Code, Cursor, OpenCode) | ●●● | ● | ●●● |

---

## Decisions (resolved 2026-10-04)

1. **Deprecate only** — do not publish v1.2.0 to npm; `npm deprecate` the existing package.
2. Research program name/location: TBD ("Context Lab" working title).
3. **First experiments:** (D) the memory help-or-hurt study — pre-existing interest, and it informs the direction — plus (A) MCP token tax as the quick publishable result.

## Experiment sketches

### A. MCP token tax (quick win)

- **Question:** how many context tokens do configured MCP servers cost per session, purely from tool schemas?
- **Method:** parse MCP client configs (`.cursor/mcp.json`, Claude / OpenCode configs), enumerate each server's tools and JSON schemas, tokenize with a named tokenizer, report per-server and total cost.
- **Deliverable:** CLI ("mcp-diet") + a table over real installed servers; verify against a live session where possible.
- **Success:** a hard number for 5+ real servers, one chart, one post.
- **Risks:** servers differ in schema shape; tokenizers vary → label the tokenizer, report min/max.

### D. Does persistent memory help or hurt? (informs direction)

- **Question:** on multi-session coding tasks, does agent memory (notes vs semantic memory) improve outcomes — or introduce stale-context failure modes?
- **Conditions:** (1) no memory, (2) agent-written notes (CLAUDE.md-style), (3) semantic memory (`.mv2` / SQLite-FTS baseline), (4) notes + semantic hybrid.
- **Task set:** 12–20 tasks across 2 repos with deliberate session boundaries; objective checks where possible (tests passing, expected files changed) + a quality rubric.
- **Metrics:** task success, tokens per completed task, wall-clock, stale-memory incidents (memory contradicts repo state), re-education cost (tokens spent re-explaining context).
- **Controls:** fixed model + temperature, fixed harness, seeds, LLM-judge with rubric + human spot-checks; record everything.
- **Deliverable:** harness repo + findings ("When memory hurts") + raw data.
- **Success:** a defensible directional answer on whether semantic memory beats simple notes for coding agents — the input to the next build decision.

---

## Non-goals

- No major feature work on `memvid-mcp`.
- No migration to MemVid v2 as "saving" this project — the niche is occupied; if MemVid v2 is used later, it is as a tool inside research experiments, not as a product.
- No attempt to grow the old npm package.
