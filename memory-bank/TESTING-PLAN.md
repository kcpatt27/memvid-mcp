# Pre-Launch Testing Plan 🧪

**Objective**: Verify all functionality before NPM publish  
**Status**: Ready to Execute  
**Priority**: Critical for Launch Success  

## 🎯 **TESTING OVERVIEW**

We need to systematically test every aspect of the MCP server to ensure a smooth launch. This plan covers local testing, package verification, MCP integration, error handling, and cross-platform compatibility.

### **Testing Phases**
1. **✅ Build & Package Verification**: Ensure code compiles and packages correctly
2. **🔧 Local Functionality Testing**: Test core MCP server features
3. **📦 NPX & Installation Testing**: Verify distribution mechanisms work
4. **🔗 MCP Integration Testing**: Test with actual MCP clients
5. **🚨 Error Handling Testing**: Verify graceful error handling
6. **🌐 Environment Testing**: Test auto-configuration and setup

---

## 📋 **PHASE 1: BUILD & PACKAGE VERIFICATION**

### **Test 1.1: Clean Build Test**
**Objective**: Verify TypeScript compilation and build system
```bash
# Execute these commands in sequence:
cd /d/projects/personal-projects/memvid-mcp

# Clean previous builds
rm -rf dist/ node_modules/

# Fresh install and build
npm install
npm run build

# Verify build output
ls -la dist/
```

**Success Criteria**:
- [ ] No TypeScript compilation errors
- [ ] `dist/` directory created with:
  - [ ] `server.js` (main executable)
  - [ ] `server.d.ts` (type definitions)
  - [ ] `tools/` directory
  - [ ] `lib/` directory
  - [ ] `types/` directory

### **Test 1.2: Package Content Verification**
**Objective**: Verify npm package includes correct files
```bash
# Check package contents without publishing
npm pack --dry-run
```

**Success Criteria**:
- [ ] Includes `dist/` directory with all compiled files
- [ ] Includes `package.json`
- [ ] Includes `README.md`
- [ ] Includes `LICENSE`
- [ ] Includes `CHANGELOG.md`
- [ ] Does NOT include:
  - [ ] `src/` (TypeScript source)
  - [ ] `memory-banks/` (local data)
  - [ ] `logs/` (local logs)
  - [ ] `node_modules/`

### **Test 1.3: Binary Configuration Test**
**Objective**: Verify executable configuration works
```bash
# Test local npx execution
npx .
```

**Success Criteria**:
- [ ] Server starts without immediate errors
- [ ] Shows MCP JSON-RPC ready state
- [ ] Responds to SIGINT (Ctrl+C) gracefully

---

## 📋 **PHASE 2: LOCAL FUNCTIONALITY TESTING**

### **Test 2.1: MCP Protocol Testing**
**Objective**: Verify core MCP protocol compliance
```bash
# Start server and test protocol manually
node dist/server.js
```

**Test JSON-RPC Messages**:
```json
# Test 1: List tools
{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}

# Test 2: Health check (if available)
{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "health_check", "arguments": {}}}
```

**Success Criteria**:
- [ ] Server accepts JSON-RPC 2.0 messages
- [ ] Returns proper tool list with all expected tools:
  - [ ] `create_memory_bank`
  - [ ] `search_memory`
  - [ ] `list_memory_banks`
  - [ ] `get_memory_bank_stats`
  - [ ] `health_check`
  - [ ] `system_diagnostics`
- [ ] All tools have proper schema definitions

### **Test 2.2: Auto-Configuration Testing**
**Objective**: Verify environment auto-detection works
```bash
# Test in clean environment
mkdir ../test-auto-config
cd ../test-auto-config

# Run server and check auto-configuration
npx ../memvid-mcp/dist/server.js
```

**Success Criteria**:
- [ ] Creates platform-appropriate directories:
  - [ ] Windows: `%APPDATA%\memvid-mcp\memory-banks`
  - [ ] macOS: `~/Library/Application Support/memvid-mcp/memory-banks`
  - [ ] Linux: `~/.local/share/memvid-mcp/memory-banks`
- [ ] Detects Python installation
- [ ] Creates setup instructions if MemVid missing
- [ ] No crashes on missing dependencies

---

## 📋 **PHASE 3: NPX & INSTALLATION TESTING**

### **Test 3.1: Local NPX Testing**
**Objective**: Verify package works with npx locally
```bash
# Test from parent directory
cd ..
npx ./memvid-mcp
```

**Success Criteria**:
- [ ] Server starts correctly
- [ ] Auto-configuration works
- [ ] No path-related errors

### **Test 3.2: Simulated Installation Testing**
**Objective**: Test installation simulation
```bash
# Create simulated global installation
mkdir test-global-install
cd test-global-install
cp -r ../memvid-mcp/dist ./node_modules/@kcpatt27/memvid-mcp-server/
cp ../memvid-mcp/package.json ./node_modules/@kcpatt27/memvid-mcp-server/

# Test execution
npx @kcpatt27/memvid-mcp-server
```

**Success Criteria**:
- [ ] Finds and executes package correctly
- [ ] Works from any directory
- [ ] Proper binary execution via `memvid-mcp` command

---

## 📋 **PHASE 4: MCP INTEGRATION TESTING**

### **Test 4.1: Cursor MCP Configuration**
**Objective**: Test real MCP client integration

Create test configuration file: `test-mcp-config.json`
```json
{
  "mcpServers": {
    "memvid-test": {
      "command": "node",
      "args": ["D:\\projects\\personal-projects\\memvid-mcp\\dist\\server.js"],
      "env": {
        "DEBUG": "memvid-mcp:*",
        "MEMORY_BANKS_DIR": "D:\\projects\\personal-projects\\memvid-mcp\\test-memory-banks"
      }
    }
  }
}
```

**Manual Testing Steps**:
1. [ ] Add configuration to Cursor MCP settings
2. [ ] Restart Cursor
3. [ ] Open chat with AI assistant
4. [ ] Look for MCP tools availability
5. [ ] Test basic tool calls:
   - [ ] `list_memory_banks`
   - [ ] `health_check`
   - [ ] `system_diagnostics`

**Success Criteria**:
- [ ] Tools appear in Cursor MCP interface
- [ ] Tool calls execute without errors
- [ ] Proper responses returned to Cursor
- [ ] No crashes or timeouts

### **Test 4.2: Claude Desktop Configuration** (if available)
Similar test with Claude Desktop MCP configuration

---

## 📋 **PHASE 5: ERROR HANDLING TESTING**

### **Test 5.1: Missing Dependencies Testing**
**Objective**: Verify graceful handling of missing dependencies

**Test Scenarios**:
```bash
# Test 1: No Python
# Temporarily rename python executable and test

# Test 2: No MemVid
# Test with Python but without MemVid package

# Test 3: No write permissions
# Test with read-only memory-banks directory

# Test 4: Invalid configuration
# Test with malformed environment variables
```

**Success Criteria**:
- [ ] Clear error messages for missing Python
- [ ] Helpful setup instructions created
- [ ] No crashes on permission errors
- [ ] Graceful fallback for missing MemVid

### **Test 5.2: Enhanced Error Recovery Testing**
**Objective**: Test error recovery mechanisms
```bash
# Test circuit breaker and retry logic
# Simulate network timeouts and failures
```

**Success Criteria**:
- [ ] Retry logic activates for transient failures
- [ ] Circuit breaker prevents cascade failures
- [ ] Error classification works correctly
- [ ] Health monitoring detects issues

---

## 📋 **PHASE 6: ENVIRONMENT TESTING**

### **Test 6.1: Windows Platform Testing**
**PowerShell Testing**:
```powershell
# Test in PowerShell
npx @kcpatt27/memvid-mcp-server

# Test in Command Prompt
cmd /c "npx @kcpatt27/memvid-mcp-server"
```

### **Test 6.2: WSL Testing** (if available)
```bash
# Test in WSL environment
wsl npx @kcpatt27/memvid-mcp-server
```

### **Test 6.3: Different Node Versions**
```bash
# Test with different Node.js versions if available
nvm use 18
npx @kcpatt27/memvid-mcp-server

nvm use 20
npx @kcpatt27/memvid-mcp-server
```

---

## 📋 **PHASE 7: PERFORMANCE & RELIABILITY TESTING**

### **Test 7.1: Startup Performance**
**Objective**: Verify 522ms startup target
```bash
# Time server startup
time node dist/server.js
```

**Success Criteria**:
- [ ] Startup time < 1 second
- [ ] Lazy loading prevents heavy import blocking
- [ ] JSON-RPC ready within target time

### **Test 7.2: Memory Bank Operations** (if Python/MemVid available)
```json
# Test memory bank creation
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_memory_bank",
    "arguments": {
      "name": "test-launch",
      "sources": [
        {
          "type": "text",
          "path": "This is a test memory bank for launch verification."
        }
      ]
    }
  }
}
```

### **Test 7.3: Health Monitoring**
```json
# Test health check
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "health_check",
    "arguments": {}
  }
}
```

---

## 📋 **TESTING EXECUTION CHECKLIST**

### **Pre-Testing Setup**
- [ ] Backup current working state
- [ ] Create clean testing directory
- [ ] Ensure Python and MemVid are available for full testing
- [ ] Document current system state

### **Test Execution Order**
1. [ ] **Phase 1**: Build & Package Verification
2. [ ] **Phase 2**: Local Functionality Testing  
3. [ ] **Phase 3**: NPX & Installation Testing
4. [ ] **Phase 4**: MCP Integration Testing
5. [ ] **Phase 5**: Error Handling Testing
6. [ ] **Phase 6**: Environment Testing
7. [ ] **Phase 7**: Performance & Reliability Testing

### **Test Results Documentation**
For each test, document:
- [ ] **Pass/Fail Status**
- [ ] **Actual Results**
- [ ] **Performance Metrics**
- [ ] **Issues Found**
- [ ] **Fixes Applied**

### **Launch Readiness Criteria**
- [ ] **All critical tests pass** (98% success rate minimum)
- [ ] **No critical bugs identified**
- [ ] **Performance targets met**
- [ ] **Error handling verified**
- [ ] **Documentation accurate**

---

## 🚨 **ISSUE TRACKING TEMPLATE**

```markdown
### Issue #X: [Brief Description]

**Test**: [Which test revealed the issue]
**Severity**: [Critical/High/Medium/Low]
**Description**: [Detailed description]
**Steps to Reproduce**: 
1. Step 1
2. Step 2
3. Step 3

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Fix Applied**: [Description of fix]
**Verification**: [How fix was verified]
```

---

## 🎯 **TESTING SUCCESS METRICS**

### **Quantitative Targets**
- [ ] **Build Success**: 100% clean builds
- [ ] **Test Pass Rate**: 95%+ of all tests pass
- [ ] **Performance**: Startup < 1 second
- [ ] **Error Handling**: 100% graceful error handling
- [ ] **Platform Compatibility**: Works on Windows + WSL

### **Qualitative Targets**
- [ ] **User Experience**: Smooth installation and setup
- [ ] **Documentation**: Accurate and helpful
- [ ] **Error Messages**: Clear and actionable
- [ ] **Professional Quality**: Ready for public release

---

**Bottom Line**: This comprehensive testing plan ensures the MemVid MCP Server is thoroughly validated before public release. Each phase builds confidence in the system's reliability and user-friendliness. 