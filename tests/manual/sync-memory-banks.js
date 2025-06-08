#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

async function syncMemoryBanks() {
  console.log('🔄 Syncing memory bank registry with actual files...\n');

  const memoryBanksDir = path.resolve('./memory-banks');
  const registryPath = path.join(process.cwd(), 'config', 'memory-banks.json');

  try {
    // Read existing registry
    let registry;
    try {
      const registryContent = await fs.readFile(registryPath, 'utf-8');
      registry = JSON.parse(registryContent);
    } catch (error) {
      console.log('📋 Creating new registry...');
      registry = {
        banks: {},
        last_updated: null,
        version: '1.0.0'
      };
    }

    // Clear existing banks that don't have files
    const existingBanks = Object.keys(registry.banks);
    console.log(`📋 Found ${existingBanks.length} registered banks`);
    
    for (const bankName of existingBanks) {
      const bankPath = registry.banks[bankName].file_path;
      try {
        await fs.access(bankPath);
        console.log(`✅ ${bankName} - file exists`);
      } catch {
        console.log(`❌ ${bankName} - file missing, removing from registry`);
        delete registry.banks[bankName];
      }
    }

    // Scan for .mp4 files in memory-banks directory
    const files = await fs.readdir(memoryBanksDir);
    const mp4Files = files.filter(f => f.endsWith('.mp4'));
    
    console.log(`\n📁 Found ${mp4Files.length} .mp4 files in memory-banks directory:`);
    
    for (const mp4File of mp4Files) {
      const bankName = path.basename(mp4File, '.mp4');
      const bankPath = path.join(memoryBanksDir, mp4File);
      
      // Check if corresponding .faiss and .json files exist
      const faissPath = path.join(memoryBanksDir, `${bankName}.faiss`);
      const jsonPath = path.join(memoryBanksDir, `${bankName}.json`);
      
      let hasIndex = false;
      let hasMetadata = false;
      
      try {
        await fs.access(faissPath);
        hasIndex = true;
      } catch {}
      
      try {
        await fs.access(jsonPath);
        hasMetadata = true;
      } catch {}
      
      console.log(`  📄 ${bankName}:`);
      console.log(`    - MP4: ✅`);
      console.log(`    - FAISS Index: ${hasIndex ? '✅' : '❌'}`);
      console.log(`    - Metadata: ${hasMetadata ? '✅' : '❌'}`);
      
      if (hasIndex && hasMetadata) {
        // Register this bank if it's not already registered
        if (!registry.banks[bankName]) {
          const stats = await fs.stat(bankPath);
          registry.banks[bankName] = {
            name: bankName,
            description: `Auto-discovered memory bank`,
            size: stats.size,
            created: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            tags: ['auto-discovered'],
            file_path: bankPath
          };
          console.log(`    ✅ Registered in storage manager`);
        } else {
          console.log(`    📋 Already registered`);
        }
      } else {
        console.log(`    ⚠️  Incomplete - missing index or metadata files`);
      }
    }

    // Save updated registry
    registry.last_updated = new Date().toISOString();
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    
    console.log(`\n✅ Registry updated successfully!`);
    console.log(`📊 Total registered banks: ${Object.keys(registry.banks).length}`);
    
    // List registered banks
    if (Object.keys(registry.banks).length > 0) {
      console.log(`\n📋 Registered memory banks:`);
      for (const [name, metadata] of Object.entries(registry.banks)) {
        console.log(`  - ${name} (${Math.round(metadata.size / 1024)} KB)`);
      }
    }

  } catch (error) {
    console.error('❌ Error syncing memory banks:', error);
  }
}

syncMemoryBanks().catch(console.error); 