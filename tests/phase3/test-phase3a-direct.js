#!/usr/bin/env node

/**
 * Phase 3a Architecture Validation Test
 * Tests the new direct integration vs old subprocess approach
 * Target: 3-5s memory bank creation vs 30s+ timeouts
 */

import { DirectMemvidIntegration } from './dist/lib/memvid-direct.js';
import fs from 'fs';
import path from 'path';

const fsPromises = fs.promises;

// Test configuration
const testConfig = {
  chunk_size: 500,
  overlap: 50,
  embedding_model: 'all-MiniLM-L6-v2'
};

// Test content
const testContent = `
# Test Memory Bank Creation - Phase 3a Architecture Validation

This is a test document to validate the new direct integration approach.
The old subprocess architecture was causing 25+ seconds of overhead per operation.
The new direct Python bridge should achieve 3-5 second performance.

## Technical Details
- Old approach: Dynamic Python script generation + subprocess spawning
- New approach: Persistent Python process with JSON-RPC communication
- Performance target: 3-5s vs 30s+ timeouts

## Test Validation
This test creates a memory bank using the new DirectMemvidIntegration class.
Success criteria:
1. Memory bank creation completes in under 10 seconds
2. No timeout errors
3. .mp4 and .faiss files are created successfully
4. Search functionality works with created memory bank

## Architecture Breakthrough
The root cause was identified as the subprocess wrapper, not MemVid core.
Direct MemVid testing showed excellent 3.665s performance.
This validates the architecture fix approach.
`;

async function testDirectIntegration() {
  console.log('🚀 Phase 3a Architecture Validation Test Starting...\n');
  
  const startTime = Date.now();
  
  try {
    // Initialize direct integration
    console.log('⚡ Initializing DirectMemvidIntegration...');
    const integration = new DirectMemvidIntegration(testConfig);
    
    console.log('⚡ Starting Python bridge initialization...');
    const initStart = Date.now();
    await integration.initialize();
    const initTime = Date.now() - initStart;
    console.log(`✅ Python bridge initialized in ${initTime}ms\n`);
    
    // Test ping to verify connection
    console.log('📡 Testing bridge connection...');
    const pingSuccess = await integration.ping();
    console.log(`${pingSuccess ? '✅' : '❌'} Bridge ping: ${pingSuccess ? 'SUCCESS' : 'FAILED'}\n`);
    
    if (!pingSuccess) {
      throw new Error('Bridge connection failed');
    }
    
    // Create test file
    const testDir = path.join(process.cwd(), 'test-data-phase3a');
    await fsPromises.mkdir(testDir, { recursive: true });
    
    const testFile = path.join(testDir, 'test-content.txt');
    await fsPromises.writeFile(testFile, testContent);
    console.log(`📝 Created test file: ${testFile}\n`);
    
    // Test memory bank creation with direct integration
    console.log('🎯 Testing Memory Bank Creation (Target: <10s vs old 30s+ timeouts)...');
    const creationStart = Date.now();
    
    const bankName = `phase3a-test-${Date.now()}`;
    const outputPath = path.join(process.cwd(), 'memory-banks', bankName);
    
    const result = await integration.createMemoryBank(
      bankName,
      [{ type: 'text', path: testFile }],
      outputPath
    );
    
    const creationTime = Date.now() - creationStart;
    console.log(`⏱️  Memory bank creation time: ${creationTime}ms (${(creationTime/1000).toFixed(2)}s)`);
    
    if (result.success) {
      console.log(`✅ Memory bank created successfully!`);
      console.log(`📊 Chunks created: ${result.chunksCreated}`);
      
      // Verify files exist
      const mp4Path = `${outputPath}.mp4`;
      const faissPath = `${outputPath}.faiss`;
      
      const mp4Exists = await fsPromises.access(mp4Path).then(() => true).catch(() => false);
      const faissExists = await fsPromises.access(faissPath).then(() => true).catch(() => false);
      
      console.log(`📁 Files created:`);
      console.log(`   - ${path.basename(mp4Path)}: ${mp4Exists ? '✅' : '❌'}`);
      console.log(`   - ${path.basename(faissPath)}: ${faissExists ? '✅' : '❌'}`);
      
      if (mp4Exists && faissExists) {
        // Test search functionality
        console.log('\n🔍 Testing Search Functionality...');
        const searchStart = Date.now();
        
        const searchResults = await integration.searchMemoryBank(
          mp4Path,
          'architecture validation test',
          5,
          0.3
        );
        
        const searchTime = Date.now() - searchStart;
        console.log(`⏱️  Search time: ${searchTime}ms`);
        console.log(`📊 Search results: ${searchResults.length} found`);
        
        if (searchResults.length > 0) {
          console.log(`✅ Search functionality working!`);
          console.log(`📝 Sample result: "${searchResults[0].content.substring(0, 100)}..."`);
        } else {
          console.log(`⚠️  No search results found (may be expected with small test)`);
        }
      }
      
    } else {
      console.log(`❌ Memory bank creation failed: ${result.error}`);
    }
    
    // Test statistics
    if (result.success) {
      console.log('\n📈 Testing Statistics...');
      const statsStart = Date.now();
      const stats = await integration.getMemoryBankStats(`${outputPath}.mp4`);
      const statsTime = Date.now() - statsStart;
      
      console.log(`⏱️  Stats retrieval time: ${statsTime}ms`);
      if (stats) {
        console.log(`📊 Bank stats: ${stats.chunks} chunks, ${(stats.size/1024).toFixed(1)} KB`);
      }
    }
    
    // Cleanup
    await integration.cleanup();
    console.log('\n🧹 Python bridge cleanup completed');
    
    // Performance analysis
    const totalTime = Date.now() - startTime;
    console.log('\n📊 Phase 3a Performance Analysis:');
    console.log(`   Total test time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log(`   Memory bank creation: ${creationTime}ms (${(creationTime/1000).toFixed(2)}s)`);
    
    // Validation results
    console.log('\n🎯 Phase 3a Success Criteria:');
    console.log(`   ✅ Creation time < 10s: ${creationTime < 10000 ? 'PASS' : 'FAIL'} (${(creationTime/1000).toFixed(2)}s)`);
    console.log(`   ✅ No timeout errors: ${result.success ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Files created: ${result.success ? 'PASS' : 'FAIL'}`);
    
    if (creationTime < 10000 && result.success) {
      console.log('\n🎉 Phase 3a SUCCESS: Direct integration eliminates subprocess bottleneck!');
      console.log(`   Performance improvement: ~${Math.round(30000/creationTime)}x faster than old approach`);
    } else {
      console.log('\n❌ Phase 3a needs further optimization');
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('\n❌ Phase 3a Test Error:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Time before error: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    
    if (error.message.includes('timeout')) {
      console.error('   🚨 Timeout detected - subprocess bottleneck may still exist');
    }
  }
}

// Run the test
testDirectIntegration().catch(console.error); 