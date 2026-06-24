# MemVid MCP Security

**Audit date:** 2026-06-24  
**Scope:** Dependency audit (npm + pip) and application threat model. Hardening implementation is deferred to follow-up passes; this document is the source of truth for what to fix next.

## Trust model

This MCP server runs with the **same filesystem and network privileges as the user who launches it**. It is designed for local development with a **trusted MCP client** (e.g. Cursor, Claude Desktop) over stdio.

- There is **no authentication** on the MCP connection.
- Any connected client can invoke all tools, including reading arbitrary files and fetching URLs.
- **Do not expose** this server to untrusted callers or remote networks without the hardening steps in [Future hardening](#future-hardening-roadmap) below.

---

## Dependency audit results (2026-06-24)

Raw outputs: [`docs/audit/npm-audit.json`](audit/npm-audit.json), [`docs/audit/pip-audit.txt`](audit/pip-audit.txt)

### Node.js (`npm audit`)

| Package | Severity | Issue | Recommended fix |
|---------|----------|-------|-----------------|
| `@modelcontextprotocol/sdk` (resolved via `"latest"`) | **High** | ReDoS in SDK ([GHSA-8r9q-7v3j-jr4g](https://github.com/advisories/GHSA-8r9q-7v3j-jr4g)) | Pin to `>=1.29.0` (audit suggests 1.29.0) |
| `@modelcontextprotocol/sdk` | **High** | DNS rebinding protection not enabled by default ([GHSA-w48q-cv73-mx4w](https://github.com/advisories/GHSA-w48q-cv73-mx4w)) | Pin SDK; enable rebinding protection if HTTP transport is used |
| `diff` (transitive via `ts-node`) | Low | DoS in `parsePatch` / `applyPatch` ([GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx)) | `npm audit fix` |

**Supply-chain gaps:**

- `@modelcontextprotocol/sdk` is pinned to `"latest"` in `package.json` — non-reproducible installs.
- `package-lock.json` is gitignored; lockfiles are not committed.
- `zod` is imported in `src/types/index.ts` but not declared as a direct dependency (comes transitively via MCP SDK).

### Python (`pip-audit -r memvid/requirements.txt`)

Audit targets the **declared** requirements file (not necessarily the live `memvid-env`). Findings:

| Package | Version in requirements | CVEs / advisories | Fix version |
|---------|-------------------------|-------------------|-------------|
| `pillow` | `>=9.0.0` (resolved 11.2.1 in audit) | PYSEC-2025-61, PYSEC-2026-165, CVE-2026-25990, CVE-2026-40192, CVE-2026-42309–42311 | `>=12.2.0` |
| `python-dotenv` | `>=0.19.0` (resolved 1.1.0) | CVE-2026-28684 | `>=1.2.2` |
| `transformers` | via `sentence-transformers` (resolved 4.57.6) | PYSEC-2025-217, CVE-2026-1839 | `>=5.0.0` (or pin sentence-transformers stack) |

**Note:** Fresh `memvid-env` install (2026-06-24) resolved Pillow 12.2.0, python-dotenv 1.2.2, transformers 5.12.1 — newer than the requirements-file audit baseline. Re-run `pip-audit` after pinning.

**Unpinned Python deps:** `beautifulsoup4`, `ebooklib` in `memvid/requirements.txt`.

---

## Application security findings

| Risk | Severity | Location | Notes |
|------|----------|----------|-------|
| Arbitrary file read | High | `src/lib/memvid-bridge.py` (`file`, `directory` sources) | By design for MCP; no path allowlist |
| SSRF | High | `urllib.request.urlopen` in bridge | No scheme/host/IP restrictions |
| Path traversal (bank name) | Medium | `src/lib/storage.ts` `getMemoryBankPath` | Names like `../../outside` can escape `memory_banks_dir` |
| Command injection | Medium | `src/lib/auto-setup.ts` `execSync` string commands | Malicious `PYTHON_EXECUTABLE` in MCP config |
| Full env inheritance | Low–Med | `src/lib/memvid.ts` spawn env | Forwards entire `process.env` to Python child |
| Traceback disclosure | Low | Bridge JSON-RPC errors | Full Python tracebacks returned to MCP client |
| Verbose logging | Low | `src/server.ts` | Full tool args logged in some modes |
| No MCP auth | Info | stdio trust boundary | Expected for local MCP; document clearly |

### Fixes applied in recovery pass (2026-06-24)

- Python path resolution: `PYTHON_EXECUTABLE` → ConfigManager → `memvid-env` fallback ([`src/lib/memvid.ts`](../src/lib/memvid.ts))
- `output_path` honored in Python bridge (files land in configured `memory_banks_dir`)
- `MEMORY_BANKS_DIR`, `PYTHONIOENCODING=utf-8`, `PYTHONUTF8=1` passed to Python child (Windows emoji/encoding fix)

---

## Audit runbook (repeat quarterly)

**Schedule:** first week of March, June, September, December.

```powershell
cd memvid-mcp
git pull
npm ci
npm run audit
npm audit --json > docs/audit/npm-audit.json
npm run test:security

.\memvid-env\Scripts\pip install -U pip-audit
.\memvid-env\Scripts\pip-audit -r python\requirements.txt | Tee-Object docs\audit\pip-audit.txt
.\memvid-env\Scripts\pip-audit  # installed packages in venv

npm test  # optional full smoke (requires PYTHON_EXECUTABLE + memvid-env)
```

Record the audit date at the top of this file and in commit message if findings change.

Optional: [OSV-Scanner](https://google.github.io/osv-scanner/) across the repo root.

### memvid submodule

The [`memvid`](../memvid) directory is a **read-only git submodule** (`Olow304/memvid`). We cannot push pinned requirements upstream. Supply-chain pins live in [`python/requirements.txt`](../python/requirements.txt). Update the submodule when upstream releases matter:

```powershell
git submodule update --remote memvid
pip install -e .\memvid
```

---

## Future hardening roadmap

Implement in order across follow-up passes. Each pass should include regression tests where noted.

### Pass 2 — Critical fixes (low effort, high value)

- [x] Pin `@modelcontextprotocol/sdk` to a specific semver (`^1.29.0`); add explicit `zod` dependency
- [x] Run `npm audit fix`; verify MCP protocol still works
- [x] Sanitize bank names: `^[a-zA-Z0-9_-]{1,64}$`, reject `..` and path separators
- [x] Replace `execSync` strings in [`src/lib/auto-setup.ts`](../src/lib/auto-setup.ts) with `spawn([...])` array form
- [x] Strip tracebacks from MCP-facing error responses (log server-side only)

### Fixes applied in Pass 2 (2026-06-24)

- [`src/lib/bank-name.ts`](../src/lib/bank-name.ts) — Zod schema + path confinement in `resolveBankFilePath`
- [`package.json`](../package.json) — pinned MCP SDK and `zod`
- [`tests/security/bank-name.test.mjs`](../tests/security/bank-name.test.mjs) — regression checks
- [`tests/smoke-test.mjs`](../tests/smoke-test.mjs) — calls `shutdown()` so Python bridge exits (fixes hung background shells)

### Pass 3 — Defense in depth

- [x] Path allowlist for `file` / `directory` sources (workspace root + `MEMORY_BANKS_DIR`)
- [x] URL fetch policy: HTTPS only, block RFC1918/link-local; URL sources disabled unless `MEMVID_ALLOW_URL_SOURCES=true`
- [x] Filter child process env to required vars only (drop full `process.env` spread)
- [x] Redact full tool args in MCP-mode logging ([`src/server.ts`](../src/server.ts))

### Fixes applied in Pass 3 (2026-06-24)

- [`src/lib/path-policy.ts`](../src/lib/path-policy.ts) — allowed roots + path validation
- [`src/lib/python-env.ts`](../src/lib/python-env.ts) — filtered env for Python child
- [`src/lib/log-sanitize.ts`](../src/lib/log-sanitize.ts) — MCP-mode log redaction
- [`src/lib/memvid-bridge.py`](../src/lib/memvid-bridge.py) — enforce path/URL policy at read time
- [`tests/security/source-policy.test.mjs`](../tests/security/source-policy.test.mjs) — regression checks

**Env vars:** `MEMVID_WORKSPACE_ROOT`, `MEMVID_ALLOWED_PATHS` (path-delimited), `MEMVID_ALLOW_URL_SOURCES`

### Pass 4 — Supply chain hygiene

- [x] Commit `package-lock.json`; remove `package-lock.json` from `.gitignore`
- [x] Pin all Python deps in `python/requirements.txt`; add `pip-audit` to CI
- [x] Enable Dependabot for npm + pip ([`.github/dependabot.yml`](../.github/dependabot.yml))
- [x] Add `.nvmrc` with Node 20

### Fixes applied in Pass 4 (2026-06-24)

- [`.nvmrc`](../.nvmrc) — Node 20 for local/CI parity
- [`package-lock.json`](../package-lock.json) — reproducible npm installs
- [`.github/workflows/security-audit.yml`](../.github/workflows/security-audit.yml) — `npm audit`, `npm run test:security`, `pip-audit` on push/PR/monthly
- [`python/requirements.txt`](../python/requirements.txt) — fully pinned versions (audit-clean baseline; parent-owned because `memvid` is an upstream submodule)

### Pass 5 — Ongoing

- [x] Quarterly audit runbook (above)
- [x] Security regression tests in `tests/security/`:
  - Path traversal: bank name `../../../tmp/evil` ([`bank-name.test.mjs`](../tests/security/bank-name.test.mjs))
  - File exfil probe with sensitive path ([`path-probes.test.mjs`](../tests/security/path-probes.test.mjs))
  - SSRF probe against `169.254.169.254` ([`ssrf-probe.py`](../tests/security/ssrf-probe.py))

### Fixes applied in Pass 5 (2026-06-24)

- [`tests/security/path-probes.test.mjs`](../tests/security/path-probes.test.mjs) — sensitive path + traversal source denial
- [`tests/security/ssrf-probe.py`](../tests/security/ssrf-probe.py) — bridge URL policy regression (metadata IP, loopback, non-HTTPS)
- [`tests/security/ssrf-probe.test.mjs`](../tests/security/ssrf-probe.test.mjs) — Node runner for Python SSRF probes
- [`docs/SECURITY.md`](../docs/SECURITY.md) — quarterly runbook, submodule note, `python/requirements.txt` audit path

---

## Reporting vulnerabilities

If you discover a security issue in this project, please open a private disclosure via [GitHub Security Advisories](https://github.com/kcpatt27/memvid-mcp/security/advisories) or email the maintainer listed in `package.json`.
