#!/usr/bin/env node

// Simple script to count tools in the compiled server
import { promises as fs } from 'fs';

async function countTools() {
  try {
    console.log('🔍 Analyzing compiled server for tool definitions...\n');
    
    const serverCode = await fs.readFile('dist/server.js', 'utf-8');
    
    // Look for tool definitions in the compiled code
    const toolMatches = serverCode.match(/name:\s*['"`]([^'"`]+)['"`]/g);
    
    if (toolMatches) {
      const tools = toolMatches
        .map(match => match.match(/name:\s*['"`]([^'"`]+)['"`]/)[1])
        .filter(name => !name.includes('memvid-mcp')); // Filter out package name
      
      console.log('✅ Found tools in compiled server:');
      tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool}`);
      });
      
      console.log(`\n🎉 Total tools found: ${tools.length}`);
      
      // Check for expected tools
      const expectedTools = [
        'create_memory_bank',
        'search_memory', 
        'list_memory_banks',
        'add_to_memory',
        'get_context',
        'health_check',
        'system_diagnostics'
      ];
      
      const missing = expectedTools.filter(t => !tools.includes(t));
      const unexpected = tools.filter(t => !expectedTools.includes(t));
      
      if (missing.length === 0) {
        console.log('✅ All expected tools are present!');
      } else {
        console.log('❌ Missing tools:', missing);
      }
      
      if (unexpected.length > 0) {
        console.log('ℹ️  Additional tools found:', unexpected);
      }
      
    } else {
      console.log('❌ No tool definitions found in compiled server');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing server:', error.message);
  }
}

countTools(); 