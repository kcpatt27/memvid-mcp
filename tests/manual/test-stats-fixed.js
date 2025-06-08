import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

async function testStatsFixed() {
  console.log('Testing fixed MCP server with stats...');
  
  try {
    const { stdout, stderr } = await execAsync('node dist/test-fixed-mcp.js', {
      timeout: 60000 // 60 second timeout
    });
    
    console.log('STDOUT:', stdout);
    if (stderr) {
      console.log('STDERR:', stderr);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.stdout) {
      console.log('STDOUT before error:', error.stdout);
    }
    if (error.stderr) {
      console.log('STDERR before error:', error.stderr);
    }
  }
}

testStatsFixed(); 