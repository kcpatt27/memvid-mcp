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
    
    console.log(`Content: "${testContent}"`);
    console.log(`Bank name: ${bankName}`);
    console.log(`Python path: ${pythonPath}`);
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        const child = spawn(pythonPath, [
            '-c', `
import sys
sys.path.append('./memvid')
from memvid import create_memory_bank
import time

try:
    print("Starting memory bank creation...")
    start_time = time.time()
    
    result = create_memory_bank(
        "${testContent}",
        "${bankName}",
        memory_banks_dir="memory-banks"
    )
    
    end_time = time.time()
    duration = end_time - start_time
    print(f"Memory bank creation completed in {duration:.2f} seconds")
    print(f"Result: {result}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
`
        ]);

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
            const bankFiles = ['json', 'faiss', 'mp4'].map(ext => 
                path.join('memory-banks', `${bankName}.${ext}`)
            );
            
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