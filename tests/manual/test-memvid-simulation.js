#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function testMemvidSimulation() {
  console.log('🧪 Testing MemVid Output Simulation...\\n');

  // Create a script that simulates MemVid's exact output pattern
  const testScript = `
import sys
import time

# Simulate MemVid warnings and progress
print("Warning: Google Generative AI library not available. Google provider will be disabled.", file=sys.stderr)
print("Warning: Anthropic library not available. Anthropic provider will be disabled.", file=sys.stderr)
print("Total files to process: 1", file=sys.stderr)
print("Added text from: temp_text_0.txt", file=sys.stderr)
print("Building video with output_path: D:\\\\projects\\\\path.mp4", file=sys.stderr)
print("Building video with index_path: D:\\\\projects\\\\path.faiss", file=sys.stderr)

# Simulate progress bars with carriage returns (this might be the issue!)
for i in range(5):
    print(f"\\rGenerating QR frames: {i*20}%", end="", file=sys.stderr)
    time.sleep(0.1)
print("\\rGenerating QR frames: 100%|██████████| 1/1 [00:00<00:00,  4.30it/s]", file=sys.stderr)

print("🐛 FRAMES: 1 files in temp", file=sys.stderr)
print("🐛 FFMPEG: frames=temp → docker_mount=temp", file=sys.stderr)

# This is what should appear on stdout for the MCP server to detect success
print("Created 1 chunks")

# Simulate more stderr output after the main result
print("UserWarning: h265 encoding failed. Falling back to MP4V.", file=sys.stderr)

# Exit successfully
sys.exit(0)
`;

  const scriptPath = path.join('temp', 'memvid_simulation.py');
  await fs.writeFile(scriptPath, testScript);

  console.log('📄 Created simulation script:', scriptPath);

  // Test the exact configuration used in memvid.ts
  console.log('\\n🔧 Testing exact MemVid configuration...');
  
  try {
    const result = await testExactMemvidConfig(scriptPath);
    console.log('✅ Success!');
    console.log(`   stdout: "${result.stdout}"`);
    console.log(`   stderr length: ${result.stderr.length} chars`);
    console.log(`   exit code: ${result.code}`);
    console.log(`   First 200 chars of stderr: "${result.stderr.substring(0, 200)}..."`);
  } catch (error) {
    console.log(`❌ Failed - ${error.message}`);
  }

  // Clean up
  try {
    await fs.unlink(scriptPath);
    console.log('\\n🧹 Cleaned up simulation script');
  } catch (error) {
    console.log('Warning: Could not clean up simulation script');
  }
}

function testExactMemvidConfig(scriptPath) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout after 60 seconds (same as memvid.ts)'));
    }, 60000);

    const python = spawn('python', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true // Exactly as in memvid.ts
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
      const text = data.toString();
      stdout += text;
      console.log('📥 STDOUT chunk:', JSON.stringify(text));
    });

    python.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      console.log('📥 STDERR chunk:', JSON.stringify(text.substring(0, 100)));
    });

    python.on('close', (code) => {
      console.log('🔚 Process closed with code:', code);
      cleanup(code);
    });

    python.on('exit', (code) => {
      console.log('🚪 Process exited with code:', code);
      cleanup(code);
    });

    python.on('error', (error) => {
      console.log('💥 Process error:', error.message);
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(error);
      }
    });
  });
}

testMemvidSimulation().catch(console.error); 