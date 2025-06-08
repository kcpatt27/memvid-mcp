const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testSimpleMemoryBank() {
    console.log('🔍 Testing simple memory bank creation...');
    
    const pythonPath = process.platform === 'win32' 
        ? './memvid-env/Scripts/python.exe'
        : './memvid-env/bin/python';
    
    const testContent = "This is a simple test. Machine learning is fascinating.";
    const bankName = `simple-diagnostic-${Date.now()}`;
    const outputPath = path.join('memory-banks', `${bankName}.mp4`);
    const indexPath = path.join('memory-banks', `${bankName}.faiss`);
    
    console.log(`Content: "${testContent}"`);
    console.log(`Bank name: ${bankName}`);
    console.log(`Output path: ${outputPath}`);
    console.log(`Python path: ${pythonPath}`);
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        const child = spawn(pythonPath, [
            '-c', `
import json
import sys
import os
from memvid import MemvidEncoder, MemvidRetriever
from pathlib import Path
import time

# Set UTF-8 encoding for Windows compatibility
if os.name == 'nt':  # Windows
    os.environ['PYTHONIOENCODING'] = 'utf-8'

try:
    print("Starting memory bank creation...")
    start_time = time.time()
    
    # Create encoder using correct MemVid API
    encoder = MemvidEncoder()
    
    # Add test content using add_text
    content = "${testContent}"
    encoder.add_text(content)
    print("Added text content to encoder")
    
    # Build the video/memory bank with correct parameters
    output_path = r"${outputPath.replace(/\\/g, '\\\\')}"
    index_path = r"${indexPath.replace(/\\/g, '\\\\')}"
    
    print(f"Building video with output_path: {output_path}")
    print(f"Building video with index_path: {index_path}")
    
    # Use correct build_video method
    encoder.build_video(output_file=output_path, index_file=index_path)
    
    end_time = time.time()
    duration = end_time - start_time
    print(f"Memory bank creation completed in {duration:.2f} seconds")
    print("Created 1 chunks")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            cwd: path.join(process.cwd(), 'memvid') // Run from memvid directory
        });

        let output = '';
        
        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('📝', text.trim());
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('❌', text.trim());
        });

        child.on('close', (code) => {
            const duration = Date.now() - startTime;
            console.log(`\n⏱️  Total duration: ${duration}ms`);
            console.log(`Exit code: ${code}`);
            
            // Check if files were created
            const bankFiles = [
                outputPath,
                indexPath,
                outputPath.replace('.mp4', '.json')
            ];
            
            console.log('\n📁 File check:');
            bankFiles.forEach(file => {
                const exists = fs.existsSync(file);
                const size = exists ? fs.statSync(file).size : 0;
                console.log(`  ${exists ? '✅' : '❌'} ${file} (${size} bytes)`);
            });
            
            resolve({
                success: code === 0,
                duration,
                output,
                bankName
            });
        });

        // Set a 60-second timeout (double the current timeout)
        setTimeout(() => {
            console.log('\n⚠️  60-second timeout reached, terminating...');
            child.kill('SIGTERM');
        }, 60000);
    });
}

testSimpleMemoryBank()
    .then(result => {
        console.log('\n📊 Test Result:', result.success ? 'SUCCESS' : 'FAILED');
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test failed:', error);
        process.exit(1);
    }); 