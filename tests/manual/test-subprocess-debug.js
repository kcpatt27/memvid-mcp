import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test the subprocess execution with the same approach as the server
async function testSubprocess() {
  console.log('Starting subprocess test...');
  
  const scriptPath = path.join(__dirname, 'temp', 'memvid_stats_1749385867275.py');
  console.log('Script path:', scriptPath);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const timeout = setTimeout(() => {
      console.log('TIMEOUT: Process taking longer than 10 seconds');
      python.kill('SIGTERM');
      resolve({
        success: false,
        stdout: '',
        stderr: 'Script execution timeout',
        duration: Date.now() - startTime
      });
    }, 10000); // 10 second timeout for testing
    
    console.log('Spawning Python process...');
    const python = spawn('python', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: path.join(__dirname, 'memvid') // Run from memvid directory
    });
    
    let stdout = '';
    let stderr = '';
    let resolved = false;
    
    const cleanup = () => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
      }
    };
    
    python.stdout.on('data', (data) => {
      console.log('STDOUT data received:', data.toString().substring(0, 100));
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      console.log('STDERR data received:', data.toString().substring(0, 100));
      stderr += data.toString();
    });
    
    python.on('spawn', () => {
      console.log('Process spawned successfully');
    });
    
    python.on('close', (code) => {
      console.log('Process closed with code:', code);
      cleanup();
      
      if (!resolved) {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duration: Date.now() - startTime
        });
      }
    });
    
    python.on('exit', (code) => {
      console.log('Process exited with code:', code);
      // Don't resolve here, wait for close event
    });
    
    python.on('error', (error) => {
      console.log('Process error:', error.message);
      cleanup();
      
      if (!resolved) {
        resolve({
          success: false,
          stdout: '',
          stderr: error.message,
          duration: Date.now() - startTime
        });
      }
    });
  });
}

// Run the test
testSubprocess()
  .then(result => {
    console.log('\n=== SUBPROCESS TEST RESULT ===');
    console.log('Success:', result.success);
    console.log('Duration:', result.duration + 'ms');
    console.log('STDOUT:', result.stdout);
    console.log('STDERR:', result.stderr);
    console.log('===============================\n');
  })
  .catch(error => {
    console.error('Test failed:', error);
  }); 