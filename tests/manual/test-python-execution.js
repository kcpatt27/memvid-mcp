#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function testPythonExecution() {
  console.log('🧪 Testing Python Process Execution...\\n');

  // Create a simple test script
  const testScript = `
import sys
import time

print("Starting Python script", file=sys.stderr)
print("Hello from Python!")
print("Script completed successfully", file=sys.stderr)
sys.exit(0)
`;

  const scriptPath = path.join('temp', 'test_process.py');
  await fs.writeFile(scriptPath, testScript);

  console.log('📄 Created test script:', scriptPath);

  // Test with different spawn configurations
  const configs = [
    { name: 'Basic', options: {} },
    { name: 'With shell', options: { shell: true } },
    { name: 'Detached', options: { detached: false } },
    { name: 'Shell + Detached', options: { shell: true, detached: false } }
  ];

  for (const config of configs) {
    console.log(`\\n🔧 Testing: ${config.name}`);
    
    try {
      const result = await testSpawnConfig(scriptPath, config.options);
      console.log(`✅ ${config.name}: Success`);
      console.log(`   stdout: "${result.stdout}"`);
      console.log(`   stderr: "${result.stderr}"`);
      console.log(`   exit code: ${result.code}`);
    } catch (error) {
      console.log(`❌ ${config.name}: Failed - ${error.message}`);
    }
  }

  // Clean up
  try {
    await fs.unlink(scriptPath);
    console.log('\\n🧹 Cleaned up test script');
  } catch (error) {
    console.log('Warning: Could not clean up test script');
  }
}

function testSpawnConfig(scriptPath, options) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout after 10 seconds'));
    }, 10000);

    const python = spawn('python', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });
    
    let stdout = '';
    let stderr = '';
    let resolved = false;

    const cleanup = (code) => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
      }
    };

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', cleanup);
    python.on('exit', cleanup);

    python.on('error', (error) => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(error);
      }
    });
  });
}

testPythonExecution().catch(console.error); 